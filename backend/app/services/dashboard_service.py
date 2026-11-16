from datetime import datetime, time, timedelta
from decimal import Decimal
from typing import Dict, List, Optional
import zoneinfo
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.models.customer import Customer
from backend.app.models.payment import Payment
from backend.app.models.sale import Sale
from backend.app.models.user import User
from backend.app.schemas.dashboard import (
    DailyTrend,
    DashboardResponse,
    DashboardSummary,
    PaymentMethodDistribution,
    RecentTransaction,
)


def get_dashboard_data(db: Session) -> DashboardResponse:
    """
    Computes real-time dashboard analytics directly from database records.
    Excludes voided sales and accurately segregates cash from bank collections.
    """
    tz = zoneinfo.ZoneInfo(settings.APP_TIMEZONE)
    now_in_addis = datetime.now(tz)
    today_start = datetime.combine(now_in_addis.date(), time.min, tzinfo=tz)
    today_end = datetime.combine(now_in_addis.date(), time.max, tzinfo=tz)

    # 1. Active non-voided sales base condition
    active_sales_cond = Sale.voided_at.is_(None)

    # Today's Sales: sum of grand_total for sales finalized today
    today_sales_stmt = select(func.coalesce(func.sum(Sale.grand_total), Decimal("0.00"))).where(
        active_sales_cond,
        Sale.sale_date >= today_start,
        Sale.sale_date <= today_end,
    )
    today_sales: Decimal = db.scalar(today_sales_stmt) or Decimal("0.00")

    # Total Transactions Today
    today_tx_stmt = select(func.count(Sale.id)).where(
        active_sales_cond,
        Sale.sale_date >= today_start,
        Sale.sale_date <= today_end,
    )
    total_transactions: int = db.scalar(today_tx_stmt) or 0

    # Total Overall Active Sales Value (for overall outstanding balance calculation)
    total_sales_value_stmt = select(
        func.coalesce(func.sum(Sale.grand_total), Decimal("0.00"))
    ).where(active_sales_cond)
    total_sales_value: Decimal = db.scalar(total_sales_value_stmt) or Decimal("0.00")

    # Payments: Join with active sales so voided sales' payments are excluded
    # Cash Received (all-time / current ledger cycle)
    cash_stmt = (
        select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .select_from(Payment)
        .join(Sale, Payment.sale_id == Sale.id)
        .where(
            Sale.voided_at.is_(None),
            Payment.payment_method == "cash",
        )
    )
    cash_received: Decimal = db.scalar(cash_stmt) or Decimal("0.00")

    # Bank Received (bank_transfer, telebirr, cbe_birr, etc.)
    bank_stmt = (
        select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .select_from(Payment)
        .join(Sale, Payment.sale_id == Sale.id)
        .where(
            Sale.voided_at.is_(None),
            Payment.payment_method.in_(["bank_transfer", "telebirr", "cbe_birr"]),
        )
    )
    bank_received: Decimal = db.scalar(bank_stmt) or Decimal("0.00")

    # Total Payments across all valid active sales
    all_payments_stmt = (
        select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .select_from(Payment)
        .join(Sale, Payment.sale_id == Sale.id)
        .where(Sale.voided_at.is_(None))
    )
    total_payments_received: Decimal = db.scalar(all_payments_stmt) or Decimal("0.00")

    # Credit Sales: sum of grand_total for sales with status 'credit' or 'partial' where balance > 0
    # Or specifically sales tagged with payment_status == 'credit'
    credit_sales_stmt = select(
        func.coalesce(func.sum(Sale.grand_total), Decimal("0.00"))
    ).where(
        active_sales_cond,
        Sale.payment_status == "credit",
    )
    credit_sales: Decimal = db.scalar(credit_sales_stmt) or Decimal("0.00")

    # Outstanding Balance = Total Active Sales Grand Total - Total Valid Payments Recorded
    outstanding_balance = max(Decimal("0.00"), total_sales_value - total_payments_received)

    summary = DashboardSummary(
        today_sales=today_sales,
        cash_received=cash_received,
        bank_received=bank_received,
        credit_sales=credit_sales,
        outstanding_balance=outstanding_balance,
        total_transactions=total_transactions,
    )

    # 2. Seven-Day Sales Trend (Last 7 days ending today)
    trend_7_days: List[DailyTrend] = []
    # Build list of 7 days
    days = [now_in_addis.date() - timedelta(days=i) for i in range(6, -1, -1)]

    for day in days:
        day_start = datetime.combine(day, time.min, tzinfo=tz)
        day_end = datetime.combine(day, time.max, tzinfo=tz)

        day_sales_stmt = select(
            func.coalesce(func.sum(Sale.grand_total), Decimal("0.00")),
            func.count(Sale.id),
        ).where(
            active_sales_cond,
            Sale.sale_date >= day_start,
            Sale.sale_date <= day_end,
        )
        day_total, day_count = db.execute(day_sales_stmt).one()

        trend_7_days.append(
            DailyTrend(
                date=day.isoformat(),
                day_label=day.strftime("%a, %b %d"),
                total_sales=day_total or Decimal("0.00"),
                transaction_count=day_count or 0,
            )
        )

    # 3. Payment Method Distribution
    payment_dist_stmt = (
        select(
            Payment.payment_method,
            func.sum(Payment.amount).label("total_amount"),
            func.count(Payment.id).label("count"),
        )
        .select_from(Payment)
        .join(Sale, Payment.sale_id == Sale.id)
        .where(Sale.voided_at.is_(None))
        .group_by(Payment.payment_method)
    )
    payment_records = db.execute(payment_dist_stmt).all()

    method_labels = {
        "cash": "Cash",
        "bank_transfer": "Bank Transfer",
        "telebirr": "Telebirr",
        "cbe_birr": "CBE Birr",
    }

    total_dist_amount = sum((r.total_amount for r in payment_records), Decimal("0.00"))
    payment_methods: List[PaymentMethodDistribution] = []

    for r in payment_records:
        pct = (
            float((r.total_amount / total_dist_amount) * 100)
            if total_dist_amount > 0
            else 0.0
        )
        payment_methods.append(
            PaymentMethodDistribution(
                method=r.payment_method,
                method_label=method_labels.get(r.payment_method, r.payment_method.capitalize()),
                total_amount=r.total_amount,
                count=r.count,
                percentage=round(pct, 1),
            )
        )

    # 4. Recent Transactions (last 10 active sales with customer and creator attribution)
    recent_stmt = (
        select(
            Sale.id,
            Sale.sale_number,
            Sale.sale_date,
            Customer.name.label("customer_name"),
            Sale.grand_total,
            Sale.payment_status,
            Sale.paper_receipt_number,
            User.full_name.label("created_by_name"),
        )
        .select_from(Sale)
        .outerjoin(Customer, Sale.customer_id == Customer.id)
        .join(User, Sale.created_by == User.id)
        .where(Sale.voided_at.is_(None))
        .order_by(Sale.sale_date.desc())
        .limit(10)
    )
    recent_records = db.execute(recent_stmt).all()

    recent_transactions = [
        RecentTransaction(
            id=r.id,
            sale_number=r.sale_number,
            sale_date=r.sale_date,
            customer_name=r.customer_name,
            grand_total=r.grand_total,
            payment_status=r.payment_status,
            paper_receipt_number=r.paper_receipt_number,
            created_by_name=r.created_by_name,
        )
        for r in recent_records
    ]

    return DashboardResponse(
        summary=summary,
        trend_7_days=trend_7_days,
        payment_methods=payment_methods,
        recent_transactions=recent_transactions,
    )

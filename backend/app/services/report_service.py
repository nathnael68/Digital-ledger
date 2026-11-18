from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
import io
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
import zoneinfo

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from sqlalchemy import and_, case, desc, func, or_, select
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.customer import Customer
from backend.app.models.payment import Payment
from backend.app.models.sale import Sale
from backend.app.models.user import User
from backend.app.schemas.report import (
    CollectionItem,
    CollectionReportResponse,
    ComparisonMetric,
    CreditSaleItem,
    CreditSalesReportResponse,
    CustomerReportItem,
    CustomerReportResponse,
    DailySalesReportResponse,
    DailyTransactionItem,
    EmployeeActivityItem,
    EmployeeActivityReportResponse,
    PaymentBreakdownItem,
    PeriodSalesTrend,
    ReportDateRange,
    ReportOverviewResponse,
    ReportSummaryKPI,
)

TZ_ADDIS = zoneinfo.ZoneInfo(settings.APP_TIMEZONE)


# ==============================================================================
# 1. TIMEZONE & DATE RANGE CALCULATIONS
# ==============================================================================

def get_now_addis() -> datetime:
    """Returns the current datetime in the Addis Ababa business timezone."""
    return datetime.now(TZ_ADDIS)


def normalize_to_naive_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Normalizes any datetime (aware or naive) to naive UTC for safe arithmetic."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def get_period_bounds(
    period: str,
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
) -> Tuple[datetime, datetime, datetime, datetime, str]:
    """
    Computes timezone-aware start and end datetime bounds for the requested period,
    along with the previous equivalent period for comparison.
    Returns: (current_start, current_end, prev_start, prev_end, period_label)
    """
    now = get_now_addis()
    today = now.date()

    if period == "today":
        cur_start = datetime.combine(today, time.min, tzinfo=TZ_ADDIS)
        cur_end = datetime.combine(today, time.max, tzinfo=TZ_ADDIS)
        prev_date = today - timedelta(days=1)
        prev_start = datetime.combine(prev_date, time.min, tzinfo=TZ_ADDIS)
        prev_end = datetime.combine(prev_date, time.max, tzinfo=TZ_ADDIS)
        label = f"Today ({today.strftime('%b %d, %Y')})"

    elif period == "yesterday":
        yest = today - timedelta(days=1)
        cur_start = datetime.combine(yest, time.min, tzinfo=TZ_ADDIS)
        cur_end = datetime.combine(yest, time.max, tzinfo=TZ_ADDIS)
        prev_date = yest - timedelta(days=1)
        prev_start = datetime.combine(prev_date, time.min, tzinfo=TZ_ADDIS)
        prev_end = datetime.combine(prev_date, time.max, tzinfo=TZ_ADDIS)
        label = f"Yesterday ({yest.strftime('%b %d, %Y')})"

    elif period == "this_week":
        # Monday to Sunday in Addis Ababa
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        cur_start = datetime.combine(start_of_week, time.min, tzinfo=TZ_ADDIS)
        cur_end = datetime.combine(end_of_week, time.max, tzinfo=TZ_ADDIS)
        prev_start_of_week = start_of_week - timedelta(days=7)
        prev_end_of_week = start_of_week - timedelta(days=1)
        prev_start = datetime.combine(prev_start_of_week, time.min, tzinfo=TZ_ADDIS)
        prev_end = datetime.combine(prev_end_of_week, time.max, tzinfo=TZ_ADDIS)
        label = f"This Week ({start_of_week.strftime('%b %d')} - {end_of_week.strftime('%b %d, %Y')})"

    elif period == "last_week":
        start_of_last_week = today - timedelta(days=today.weekday() + 7)
        end_of_last_week = start_of_last_week + timedelta(days=6)
        cur_start = datetime.combine(start_of_last_week, time.min, tzinfo=TZ_ADDIS)
        cur_end = datetime.combine(end_of_last_week, time.max, tzinfo=TZ_ADDIS)
        prev_start_week = start_of_last_week - timedelta(days=7)
        prev_end_week = start_of_last_week - timedelta(days=1)
        prev_start = datetime.combine(prev_start_week, time.min, tzinfo=TZ_ADDIS)
        prev_end = datetime.combine(prev_end_week, time.max, tzinfo=TZ_ADDIS)
        label = f"Last Week ({start_of_last_week.strftime('%b %d')} - {end_of_last_week.strftime('%b %d, %Y')})"

    elif period == "this_month":
        start_of_month = date(today.year, today.month, 1)
        if today.month == 12:
            next_month = date(today.year + 1, 1, 1)
        else:
            next_month = date(today.year, today.month + 1, 1)
        end_of_month = next_month - timedelta(days=1)
        cur_start = datetime.combine(start_of_month, time.min, tzinfo=TZ_ADDIS)
        cur_end = datetime.combine(end_of_month, time.max, tzinfo=TZ_ADDIS)

        # Previous month
        prev_month_end = start_of_month - timedelta(days=1)
        prev_month_start = date(prev_month_end.year, prev_month_end.month, 1)
        prev_start = datetime.combine(prev_month_start, time.min, tzinfo=TZ_ADDIS)
        prev_end = datetime.combine(prev_month_end, time.max, tzinfo=TZ_ADDIS)
        label = f"This Month ({start_of_month.strftime('%B %Y')})"

    elif period == "last_month":
        cur_month_start = date(today.year, today.month, 1)
        end_of_last_month = cur_month_start - timedelta(days=1)
        start_of_last_month = date(end_of_last_month.year, end_of_last_month.month, 1)
        cur_start = datetime.combine(start_of_last_month, time.min, tzinfo=TZ_ADDIS)
        cur_end = datetime.combine(end_of_last_month, time.max, tzinfo=TZ_ADDIS)

        prev_2_month_end = start_of_last_month - timedelta(days=1)
        prev_2_month_start = date(prev_2_month_end.year, prev_2_month_end.month, 1)
        prev_start = datetime.combine(prev_2_month_start, time.min, tzinfo=TZ_ADDIS)
        prev_end = datetime.combine(prev_2_month_end, time.max, tzinfo=TZ_ADDIS)
        label = f"Last Month ({start_of_last_month.strftime('%B %Y')})"

    elif period == "custom" and start_date_str and end_date_str:
        try:
            start_d = date.fromisoformat(start_date_str)
            end_d = date.fromisoformat(end_date_str)
        except ValueError as err:
            raise ValueError(f"Invalid date format YYYY-MM-DD: {err}")

        if start_d > end_d:
            raise ValueError("Start date cannot be after end date.")

        cur_start = datetime.combine(start_d, time.min, tzinfo=TZ_ADDIS)
        cur_end = datetime.combine(end_d, time.max, tzinfo=TZ_ADDIS)

        duration = (end_d - start_d).days + 1
        prev_end_d = start_d - timedelta(days=1)
        prev_start_d = prev_end_d - timedelta(days=duration - 1)
        prev_start = datetime.combine(prev_start_d, time.min, tzinfo=TZ_ADDIS)
        prev_end = datetime.combine(prev_end_d, time.max, tzinfo=TZ_ADDIS)
        label = f"Custom Range ({start_d.strftime('%b %d, %Y')} - {end_d.strftime('%b %d, %Y')})"
    else:
        # Default to today
        return get_period_bounds("today")

    return cur_start, cur_end, prev_start, prev_end, label


def compute_comparison_metric(current: Decimal, previous: Decimal) -> ComparisonMetric:
    delta = current - previous
    pct: Optional[float] = None
    if previous > 0:
        pct = round(float((delta / previous) * 100), 1)
    elif current > 0 and previous == 0:
        pct = 100.0
    elif current == 0 and previous == 0:
        pct = 0.0
    return ComparisonMetric(
        current=current,
        previous=previous,
        delta=delta,
        percentage_change=pct,
    )


# ==============================================================================
# 2. CORE FINANCIAL REPORTING LOGIC
# ==============================================================================

def compute_summary_kpi(
    db: Session,
    start_dt: datetime,
    end_dt: datetime,
    prev_start_dt: Optional[datetime] = None,
    prev_end_dt: Optional[datetime] = None,
    employee_id: Optional[UUID] = None,
    customer_id: Optional[UUID] = None,
) -> ReportSummaryKPI:
    """
    Computes all financial KPIs for a given period using consistent database aggregation.
    - Sales revenue = active sales grand total for sales created in period.
    - Cash collections = valid cash payments received in period.
    - Bank collections = valid bank payments received in period.
    - Credit sales = grand total of sales created in period with payment_status in ('credit', 'partial').
    - Current outstanding balance = point-in-time net unpaid amount across all active sales.
    """
    active_sales_cond = Sale.voided_at.is_(None)

    # Base filters
    sales_filter = [
        active_sales_cond,
        Sale.sale_date >= start_dt,
        Sale.sale_date <= end_dt,
    ]
    if employee_id:
        sales_filter.append(Sale.created_by == employee_id)
    if customer_id:
        sales_filter.append(Sale.customer_id == customer_id)

    # 1. Period Sales Revenue & Discounts & Counts
    sales_stmt = select(
        func.coalesce(func.sum(Sale.grand_total), Decimal("0.00")).label("revenue"),
        func.coalesce(func.sum(Sale.discount), Decimal("0.00")).label("discounts"),
        func.count(Sale.id).label("count"),
    ).where(*sales_filter)
    sales_row = db.execute(sales_stmt).one()
    total_sales_revenue: Decimal = sales_row.revenue
    total_discounts: Decimal = sales_row.discounts
    transaction_count: int = sales_row.count

    # 2. Voided Sales in Period
    void_filter = [
        Sale.voided_at.is_not(None),
        Sale.sale_date >= start_dt,
        Sale.sale_date <= end_dt,
    ]
    if employee_id:
        void_filter.append(Sale.created_by == employee_id)
    if customer_id:
        void_filter.append(Sale.customer_id == customer_id)

    void_stmt = select(
        func.coalesce(func.sum(Sale.grand_total), Decimal("0.00")).label("void_amount"),
        func.count(Sale.id).label("void_count"),
    ).where(*void_filter)
    void_row = db.execute(void_stmt).one()
    voided_sales_amount: Decimal = void_row.void_amount
    voided_sales_count: int = void_row.void_count

    # 3. Cash Collections (based on Payment.payment_date)
    cash_filter = [
        Sale.voided_at.is_(None),
        Payment.payment_method == "cash",
        Payment.payment_date >= start_dt,
        Payment.payment_date <= end_dt,
    ]
    if employee_id:
        cash_filter.append(Payment.recorded_by == employee_id)
    if customer_id:
        cash_filter.append(Sale.customer_id == customer_id)

    cash_stmt = (
        select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .select_from(Payment)
        .join(Sale, Payment.sale_id == Sale.id)
        .where(*cash_filter)
    )
    cash_collections: Decimal = db.scalar(cash_stmt) or Decimal("0.00")

    # 4. Bank Collections (based on Payment.payment_date)
    bank_filter = [
        Sale.voided_at.is_(None),
        Payment.payment_method.in_(["bank_transfer", "telebirr", "cbe_birr"]),
        Payment.payment_date >= start_dt,
        Payment.payment_date <= end_dt,
    ]
    if employee_id:
        bank_filter.append(Payment.recorded_by == employee_id)
    if customer_id:
        bank_filter.append(Sale.customer_id == customer_id)

    bank_stmt = (
        select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .select_from(Payment)
        .join(Sale, Payment.sale_id == Sale.id)
        .where(*bank_filter)
    )
    bank_collections: Decimal = db.scalar(bank_stmt) or Decimal("0.00")

    # 5. Credit Sales Created in Period
    # Initial credit amount created = grand_total of sales that were marked credit/partial
    credit_filter = [
        active_sales_cond,
        Sale.payment_status.in_(["credit", "partial"]),
        Sale.sale_date >= start_dt,
        Sale.sale_date <= end_dt,
    ]
    if employee_id:
        credit_filter.append(Sale.created_by == employee_id)
    if customer_id:
        credit_filter.append(Sale.customer_id == customer_id)

    credit_stmt = select(
        func.coalesce(func.sum(Sale.grand_total), Decimal("0.00"))
    ).where(*credit_filter)
    credit_sales: Decimal = db.scalar(credit_stmt) or Decimal("0.00")

    # 6. Current Point-in-Time Outstanding Balance (All active sales in DB)
    all_active_sales_stmt = select(
        func.coalesce(func.sum(Sale.grand_total), Decimal("0.00"))
    ).where(active_sales_cond)
    if customer_id:
        all_active_sales_stmt = all_active_sales_stmt.where(Sale.customer_id == customer_id)
    total_active_grand_total: Decimal = db.scalar(all_active_sales_stmt) or Decimal("0.00")

    all_active_payments_stmt = (
        select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .select_from(Payment)
        .join(Sale, Payment.sale_id == Sale.id)
        .where(Sale.voided_at.is_(None))
    )
    if customer_id:
        all_active_payments_stmt = all_active_payments_stmt.where(Sale.customer_id == customer_id)
    total_active_payments: Decimal = db.scalar(all_active_payments_stmt) or Decimal("0.00")

    current_outstanding_balance = max(Decimal("0.00"), total_active_grand_total - total_active_payments)

    # 7. Comparisons with Previous Period (if previous dates provided)
    revenue_comp: Optional[ComparisonMetric] = None
    cash_comp: Optional[ComparisonMetric] = None
    bank_comp: Optional[ComparisonMetric] = None
    tx_comp: Optional[ComparisonMetric] = None

    if prev_start_dt and prev_end_dt:
        prev_kpi = compute_summary_kpi(
            db=db,
            start_dt=prev_start_dt,
            end_dt=prev_end_dt,
            employee_id=employee_id,
            customer_id=customer_id,
        )
        revenue_comp = compute_comparison_metric(total_sales_revenue, prev_kpi.total_sales_revenue)
        cash_comp = compute_comparison_metric(cash_collections, prev_kpi.cash_collections)
        bank_comp = compute_comparison_metric(bank_collections, prev_kpi.bank_collections)
        tx_comp = compute_comparison_metric(
            Decimal(transaction_count), Decimal(prev_kpi.transaction_count)
        )

    return ReportSummaryKPI(
        total_sales_revenue=total_sales_revenue,
        cash_collections=cash_collections,
        bank_collections=bank_collections,
        credit_sales=credit_sales,
        current_outstanding_balance=current_outstanding_balance,
        transaction_count=transaction_count,
        total_discounts=total_discounts,
        voided_sales_count=voided_sales_count,
        voided_sales_amount=voided_sales_amount,
        revenue_comparison=revenue_comp,
        cash_comparison=cash_comp,
        bank_comparison=bank_comp,
        transaction_comparison=tx_comp,
    )


def get_report_overview(
    db: Session,
    period: str = "today",
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
    employee_id: Optional[UUID] = None,
    customer_id: Optional[UUID] = None,
) -> ReportOverviewResponse:
    """
    Returns high-level management reporting overview with summary cards,
    trends over the period, and payment method distributions.
    """
    cur_start, cur_end, prev_start, prev_end, label = get_period_bounds(
        period=period,
        start_date_str=start_date_str,
        end_date_str=end_date_str,
    )

    summary = compute_summary_kpi(
        db=db,
        start_dt=cur_start,
        end_dt=cur_end,
        prev_start_dt=prev_start,
        prev_end_dt=prev_end,
        employee_id=employee_id,
        customer_id=customer_id,
    )

    # Generate daily trend slice for the period
    start_date = cur_start.date()
    end_date = cur_end.date()
    num_days = min(60, (end_date - start_date).days + 1)
    trends: List[PeriodSalesTrend] = []

    for i in range(num_days):
        day = start_date + timedelta(days=i)
        day_start = datetime.combine(day, time.min, tzinfo=TZ_ADDIS)
        day_end = datetime.combine(day, time.max, tzinfo=TZ_ADDIS)

        # Sales on this day
        sales_day_stmt = select(
            func.coalesce(func.sum(Sale.grand_total), Decimal("0.00")),
            func.count(Sale.id),
        ).where(
            Sale.voided_at.is_(None),
            Sale.sale_date >= day_start,
            Sale.sale_date <= day_end,
        )
        if employee_id:
            sales_day_stmt = sales_day_stmt.where(Sale.created_by == employee_id)
        if customer_id:
            sales_day_stmt = sales_day_stmt.where(Sale.customer_id == customer_id)
        day_rev, day_tx = db.execute(sales_day_stmt).one()

        # Cash collected on this day
        cash_day_stmt = (
            select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
            .select_from(Payment)
            .join(Sale, Payment.sale_id == Sale.id)
            .where(
                Sale.voided_at.is_(None),
                Payment.payment_method == "cash",
                Payment.payment_date >= day_start,
                Payment.payment_date <= day_end,
            )
        )
        if employee_id:
            cash_day_stmt = cash_day_stmt.where(Payment.recorded_by == employee_id)
        if customer_id:
            cash_day_stmt = cash_day_stmt.where(Sale.customer_id == customer_id)
        day_cash = db.scalar(cash_day_stmt) or Decimal("0.00")

        # Bank collected on this day
        bank_day_stmt = (
            select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
            .select_from(Payment)
            .join(Sale, Payment.sale_id == Sale.id)
            .where(
                Sale.voided_at.is_(None),
                Payment.payment_method.in_(["bank_transfer", "telebirr", "cbe_birr"]),
                Payment.payment_date >= day_start,
                Payment.payment_date <= day_end,
            )
        )
        if employee_id:
            bank_day_stmt = bank_day_stmt.where(Payment.recorded_by == employee_id)
        if customer_id:
            bank_day_stmt = bank_day_stmt.where(Sale.customer_id == customer_id)
        day_bank = db.scalar(bank_day_stmt) or Decimal("0.00")

        trends.append(
            PeriodSalesTrend(
                date=day.isoformat(),
                day_label=day.strftime("%a, %b %d"),
                sales_revenue=day_rev,
                cash_collected=day_cash,
                bank_collected=day_bank,
                transaction_count=day_tx,
            )
        )

    # Payment breakdown for the period
    pay_dist_stmt = (
        select(
            Payment.payment_method,
            func.sum(Payment.amount).label("total_amount"),
            func.count(Payment.id).label("count"),
        )
        .select_from(Payment)
        .join(Sale, Payment.sale_id == Sale.id)
        .where(
            Sale.voided_at.is_(None),
            Payment.payment_date >= cur_start,
            Payment.payment_date <= cur_end,
        )
    )
    if employee_id:
        pay_dist_stmt = pay_dist_stmt.where(Payment.recorded_by == employee_id)
    if customer_id:
        pay_dist_stmt = pay_dist_stmt.where(Sale.customer_id == customer_id)
    pay_dist_stmt = pay_dist_stmt.group_by(Payment.payment_method)
    dist_rows = db.execute(pay_dist_stmt).all()

    labels = {
        "cash": "Cash",
        "bank_transfer": "Bank Transfer",
        "telebirr": "Telebirr",
        "cbe_birr": "CBE Birr",
    }
    total_dist = sum((r.total_amount for r in dist_rows), Decimal("0.00"))
    payment_breakdown: List[PaymentBreakdownItem] = []
    for r in dist_rows:
        pct = float((r.total_amount / total_dist) * 100) if total_dist > 0 else 0.0
        payment_breakdown.append(
            PaymentBreakdownItem(
                method=r.payment_method,
                method_label=labels.get(r.payment_method, r.payment_method.capitalize()),
                total_amount=r.total_amount,
                count=r.count,
                percentage=round(pct, 1),
            )
        )

    return ReportOverviewResponse(
        date_range=ReportDateRange(
            start_date=cur_start,
            end_date=cur_end,
            period_label=label,
            timezone=settings.APP_TIMEZONE,
        ),
        summary=summary,
        trends=trends,
        payment_breakdown=payment_breakdown,
    )


def get_daily_sales_report(
    db: Session,
    report_date_str: Optional[str] = None,
) -> DailySalesReportResponse:
    """
    Returns full daily sales closeout report: summary metrics, list of valid transactions,
    and list of voided transactions for audit verification.
    """
    now = get_now_addis()
    target_date = date.fromisoformat(report_date_str) if report_date_str else now.date()

    day_start = datetime.combine(target_date, time.min, tzinfo=TZ_ADDIS)
    day_end = datetime.combine(target_date, time.max, tzinfo=TZ_ADDIS)

    summary = compute_summary_kpi(db, day_start, day_end)

    # 1. Fetch valid transactions created on that day
    sales_stmt = (
        select(
            Sale,
            Customer.name.label("customer_name"),
            User.full_name.label("created_by_name"),
        )
        .outerjoin(Customer, Sale.customer_id == Customer.id)
        .join(User, Sale.created_by == User.id)
        .where(
            Sale.voided_at.is_(None),
            Sale.sale_date >= day_start,
            Sale.sale_date <= day_end,
        )
        .order_by(Sale.sale_date.asc())
    )
    sales_rows = db.execute(sales_stmt).all()

    # Pre-fetch payments for these sales to calculate amount_paid & balance
    sale_ids = [s.Sale.id for s in sales_rows]
    payments_map: Dict[UUID, Decimal] = {}
    if sale_ids:
        pay_sums = (
            select(Payment.sale_id, func.sum(Payment.amount))
            .where(Payment.sale_id.in_(sale_ids))
            .group_by(Payment.sale_id)
        )
        for s_id, amt in db.execute(pay_sums).all():
            payments_map[s_id] = amt or Decimal("0.00")

    transactions: List[DailyTransactionItem] = []
    for row in sales_rows:
        s: Sale = row.Sale
        paid = payments_map.get(s.id, Decimal("0.00"))
        bal = max(Decimal("0.00"), s.grand_total - paid)
        transactions.append(
            DailyTransactionItem(
                id=s.id,
                sale_number=s.sale_number,
                fs_number=s.fs_number,
                paper_receipt_number=s.paper_receipt_number,
                sale_date=s.sale_date,
                customer_id=s.customer_id,
                customer_name=row.customer_name,
                created_by_name=row.created_by_name,
                subtotal=s.subtotal,
                discount=s.discount,
                grand_total=s.grand_total,
                amount_paid=paid,
                outstanding_balance=bal,
                payment_status=s.payment_status,
                is_void=False,
            )
        )

    # 2. Fetch voided transactions on that day
    void_stmt = (
        select(
            Sale,
            Customer.name.label("customer_name"),
            User.full_name.label("created_by_name"),
        )
        .outerjoin(Customer, Sale.customer_id == Customer.id)
        .join(User, Sale.created_by == User.id)
        .where(
            Sale.voided_at.is_not(None),
            Sale.sale_date >= day_start,
            Sale.sale_date <= day_end,
        )
        .order_by(Sale.sale_date.asc())
    )
    void_rows = db.execute(void_stmt).all()

    voided_transactions: List[DailyTransactionItem] = []
    for row in void_rows:
        s: Sale = row.Sale
        voided_transactions.append(
            DailyTransactionItem(
                id=s.id,
                sale_number=s.sale_number,
                fs_number=s.fs_number,
                paper_receipt_number=s.paper_receipt_number,
                sale_date=s.sale_date,
                customer_id=s.customer_id,
                customer_name=row.customer_name,
                created_by_name=row.created_by_name,
                subtotal=s.subtotal,
                discount=s.discount,
                grand_total=s.grand_total,
                amount_paid=Decimal("0.00"),
                outstanding_balance=Decimal("0.00"),
                payment_status="voided",
                is_void=True,
                void_reason=s.void_reason,
            )
        )

    return DailySalesReportResponse(
        report_date=target_date.isoformat(),
        summary=summary,
        transactions=transactions,
        voided_transactions=voided_transactions,
    )


def get_collections_report(
    db: Session,
    collection_type: str = "cash",  # 'cash' or 'bank'
    period: str = "today",
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
    employee_id: Optional[UUID] = None,
    customer_id: Optional[UUID] = None,
    reference: Optional[str] = None,
) -> CollectionReportResponse:
    """
    Returns itemized payment collections received within the specified date range.
    Strictly segregated by cash vs bank/telebirr/cbe_birr.
    """
    cur_start, cur_end, _, _, label = get_period_bounds(
        period=period,
        start_date_str=start_date_str,
        end_date_str=end_date_str,
    )

    query = (
        select(
            Payment,
            Sale.sale_number,
            Sale.fs_number,
            Sale.paper_receipt_number,
            Customer.name.label("customer_name"),
            User.full_name.label("recorded_by_name"),
        )
        .select_from(Payment)
        .join(Sale, Payment.sale_id == Sale.id)
        .outerjoin(Customer, Sale.customer_id == Customer.id)
        .join(User, Payment.recorded_by == User.id)
        .where(
            Sale.voided_at.is_(None),
            Payment.payment_date >= cur_start,
            Payment.payment_date <= cur_end,
        )
    )

    if collection_type == "cash":
        query = query.where(Payment.payment_method == "cash")
    else:
        query = query.where(Payment.payment_method.in_(["bank_transfer", "telebirr", "cbe_birr"]))

    if employee_id:
        query = query.where(Payment.recorded_by == employee_id)
    if customer_id:
        query = query.where(Sale.customer_id == customer_id)
    if reference:
        query = query.where(Payment.reference.ilike(f"%{reference.strip()}%"))

    query = query.order_by(Payment.payment_date.desc())
    records = db.execute(query).all()

    items: List[CollectionItem] = []
    total_amt = Decimal("0.00")

    for r in records:
        p: Payment = r.Payment
        total_amt += p.amount
        items.append(
            CollectionItem(
                id=p.id,
                payment_date=p.payment_date,
                sale_id=p.sale_id,
                sale_number=r.sale_number,
                fs_number=r.fs_number,
                paper_receipt_number=r.paper_receipt_number,
                customer_name=r.customer_name,
                amount=p.amount,
                payment_method=p.payment_method,
                reference=p.reference,
                recorded_by_name=r.recorded_by_name,
            )
        )

    return CollectionReportResponse(
        period_label=label,
        total_amount=total_amt,
        payment_count=len(items),
        items=items,
    )


def get_credit_sales_report(
    db: Session,
    period: str = "this_month",
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
    customer_id: Optional[UUID] = None,
) -> CreditSalesReportResponse:
    """
    Returns credit sales created within the period, identifying the initial credit portion
    and current remaining balance.
    """
    cur_start, cur_end, _, _, label = get_period_bounds(
        period=period,
        start_date_str=start_date_str,
        end_date_str=end_date_str,
    )

    query = (
        select(
            Sale,
            Customer.name.label("customer_name"),
            User.full_name.label("created_by_name"),
        )
        .outerjoin(Customer, Sale.customer_id == Customer.id)
        .join(User, Sale.created_by == User.id)
        .where(
            Sale.voided_at.is_(None),
            Sale.payment_status.in_(["credit", "partial"]),
            Sale.sale_date >= cur_start,
            Sale.sale_date <= cur_end,
        )
    )
    if customer_id:
        query = query.where(Sale.customer_id == customer_id)

    query = query.order_by(Sale.sale_date.desc())
    records = db.execute(query).all()

    # Pre-fetch all payments for these sales to calculate initial vs current payments
    sale_ids = [r.Sale.id for r in records]
    payments_by_sale: Dict[UUID, List[Payment]] = {s_id: [] for s_id in sale_ids}
    if sale_ids:
        all_pays = (
            db.scalars(
                select(Payment)
                .where(Payment.sale_id.in_(sale_ids))
                .order_by(Payment.payment_date.asc())
            )
            .all()
        )
        for p in all_pays:
            payments_by_sale[p.sale_id].append(p)

    items: List[CreditSaleItem] = []
    total_credit_created = Decimal("0.00")
    total_current_balance = Decimal("0.00")

    for r in records:
        s: Sale = r.Sale
        pays = payments_by_sale.get(s.id, [])

        # Initial payment occurred at creation time
        initial_paid = Decimal("0.00")
        if pays:
            # First payment if recorded at checkout
            first_pay = pays[0]
            p_dt = normalize_to_naive_utc(first_pay.payment_date)
            s_dt = normalize_to_naive_utc(s.sale_date)
            c_dt = normalize_to_naive_utc(s.created_at)
            p_c_dt = normalize_to_naive_utc(first_pay.created_at)

            time_diff_sale = (
                abs((p_dt - s_dt).total_seconds())
                if (p_dt and s_dt)
                else 999999
            )
            time_diff_create = (
                abs((p_c_dt - c_dt).total_seconds())
                if (p_c_dt and c_dt)
                else 999999
            )
            if time_diff_sale <= 300 or time_diff_create <= 300 or (p_dt and s_dt and p_dt <= s_dt):
                initial_paid = first_pay.amount

        initial_credit = max(Decimal("0.00"), s.grand_total - initial_paid)
        current_paid = sum((p.amount for p in pays), Decimal("0.00"))
        current_balance = max(Decimal("0.00"), s.grand_total - current_paid)
        last_pay_date = pays[-1].payment_date if pays else None

        total_credit_created += initial_credit
        total_current_balance += current_balance

        items.append(
            CreditSaleItem(
                id=s.id,
                sale_number=s.sale_number,
                fs_number=s.fs_number,
                sale_date=s.sale_date,
                customer_id=s.customer_id,
                customer_name=r.customer_name,
                grand_total=s.grand_total,
                initial_amount_paid=initial_paid,
                initial_credit_amount=initial_credit,
                current_amount_paid=current_paid,
                current_outstanding_balance=current_balance,
                payment_status=s.payment_status,
                last_payment_date=last_pay_date,
                created_by_name=r.created_by_name,
            )
        )

    return CreditSalesReportResponse(
        period_label=label,
        total_credit_created=total_credit_created,
        total_current_balance=total_current_balance,
        credit_sales_count=len(items),
        items=items,
    )


def get_employee_activity_report(
    db: Session,
    period: str = "this_month",
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
    employee_id: Optional[UUID] = None,
) -> EmployeeActivityReportResponse:
    """
    Returns employee activity statistics distinguishing sales created vs payments collected.
    """
    cur_start, cur_end, _, _, label = get_period_bounds(
        period=period,
        start_date_str=start_date_str,
        end_date_str=end_date_str,
    )

    user_query = select(User).order_by(User.full_name.asc())
    if employee_id:
        user_query = user_query.where(User.id == employee_id)
    employees = db.scalars(user_query).all()

    items: List[EmployeeActivityItem] = []

    for emp in employees:
        # 1. Sales created by this employee in the period
        sales_stmt = select(
            func.count(Sale.id).label("count"),
            func.coalesce(func.sum(Sale.grand_total), Decimal("0.00")).label("rev"),
        ).where(
            Sale.created_by == emp.id,
            Sale.voided_at.is_(None),
            Sale.sale_date >= cur_start,
            Sale.sale_date <= cur_end,
        )
        s_count, s_rev = db.execute(sales_stmt).one()

        # Initial payments collected on sales created by this employee
        # Join payments on sales created by this employee where payment was within checkout window
        init_cash_stmt = (
            select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
            .select_from(Payment)
            .join(Sale, Payment.sale_id == Sale.id)
            .where(
                Sale.created_by == emp.id,
                Sale.voided_at.is_(None),
                Payment.payment_method == "cash",
                Payment.recorded_by == emp.id,
                Payment.payment_date >= cur_start,
                Payment.payment_date <= cur_end,
            )
        )
        init_cash = db.scalar(init_cash_stmt) or Decimal("0.00")

        init_bank_stmt = (
            select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
            .select_from(Payment)
            .join(Sale, Payment.sale_id == Sale.id)
            .where(
                Sale.created_by == emp.id,
                Sale.voided_at.is_(None),
                Payment.payment_method.in_(["bank_transfer", "telebirr", "cbe_birr"]),
                Payment.recorded_by == emp.id,
                Payment.payment_date >= cur_start,
                Payment.payment_date <= cur_end,
            )
        )
        init_bank = db.scalar(init_bank_stmt) or Decimal("0.00")

        credit_created_stmt = select(
            func.coalesce(func.sum(Sale.grand_total), Decimal("0.00"))
        ).where(
            Sale.created_by == emp.id,
            Sale.voided_at.is_(None),
            Sale.payment_status.in_(["credit", "partial"]),
            Sale.sale_date >= cur_start,
            Sale.sale_date <= cur_end,
        )
        credit_created = db.scalar(credit_created_stmt) or Decimal("0.00")

        # 2. Subsequent payments recorded by this employee (including payments against OTHER employees' sales)
        # Any payment recorded where payment_date is within period
        all_pays_stmt = select(
            func.count(Payment.id).label("count"),
            func.coalesce(func.sum(Payment.amount), Decimal("0.00")).label("total"),
        ).where(
            Payment.recorded_by == emp.id,
            Payment.payment_date >= cur_start,
            Payment.payment_date <= cur_end,
        )
        p_count, p_total = db.execute(all_pays_stmt).one()

        items.append(
            EmployeeActivityItem(
                employee_id=emp.id,
                employee_name=emp.full_name,
                username=emp.username,
                role=emp.role,
                sales_created_count=s_count or 0,
                sales_revenue=s_rev or Decimal("0.00"),
                initial_cash_received=init_cash,
                initial_bank_received=init_bank,
                initial_credit_created=credit_created,
                subsequent_payments_count=p_count or 0,
                subsequent_payments_amount=p_total or Decimal("0.00"),
                total_collections_recorded=p_total or Decimal("0.00"),
            )
        )

    return EmployeeActivityReportResponse(
        period_label=label,
        items=items,
    )


def get_customer_sales_report(
    db: Session,
    period: str = "this_month",
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
    customer_id: Optional[UUID] = None,
    has_balance: Optional[bool] = None,
) -> CustomerReportResponse:
    """
    Returns customer-level financial metrics for the selected period.
    """
    cur_start, cur_end, _, _, label = get_period_bounds(
        period=period,
        start_date_str=start_date_str,
        end_date_str=end_date_str,
    )

    cust_query = select(Customer).order_by(Customer.name.asc())
    if customer_id:
        cust_query = cust_query.where(Customer.id == customer_id)
    customers = db.scalars(cust_query).all()

    items: List[CustomerReportItem] = []
    tot_sales = Decimal("0.00")
    tot_pays = Decimal("0.00")
    tot_out = Decimal("0.00")

    for c in customers:
        # Sales in period
        s_stmt = select(
            func.coalesce(func.sum(Sale.grand_total), Decimal("0.00")).label("sales"),
            func.count(Sale.id).label("count"),
            func.max(Sale.sale_date).label("last_sale"),
        ).where(
            Sale.customer_id == c.id,
            Sale.voided_at.is_(None),
            Sale.sale_date >= cur_start,
            Sale.sale_date <= cur_end,
        )
        s_row = db.execute(s_stmt).one()
        c_sales = s_row.sales or Decimal("0.00")
        c_count = s_row.count or 0
        c_last_sale = s_row.last_sale

        # Payments in period
        p_stmt = (
            select(
                func.coalesce(func.sum(Payment.amount), Decimal("0.00")).label("pays"),
                func.max(Payment.payment_date).label("last_pay"),
            )
            .select_from(Payment)
            .join(Sale, Payment.sale_id == Sale.id)
            .where(
                Sale.customer_id == c.id,
                Sale.voided_at.is_(None),
                Payment.payment_date >= cur_start,
                Payment.payment_date <= cur_end,
            )
        )
        p_row = db.execute(p_stmt).one()
        c_pays = p_row.pays or Decimal("0.00")
        c_last_pay = p_row.last_pay

        # Total lifetime balance across all active sales
        all_s = db.scalar(
            select(func.coalesce(func.sum(Sale.grand_total), Decimal("0.00"))).where(
                Sale.customer_id == c.id, Sale.voided_at.is_(None)
            )
        ) or Decimal("0.00")
        all_p = db.scalar(
            select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
            .select_from(Payment)
            .join(Sale, Payment.sale_id == Sale.id)
            .where(Sale.customer_id == c.id, Sale.voided_at.is_(None))
        ) or Decimal("0.00")
        c_out = max(Decimal("0.00"), all_s - all_p)

        if has_balance is True and c_out <= 0:
            continue
        if has_balance is False and c_out > 0:
            continue

        tot_sales += c_sales
        tot_pays += c_pays
        tot_out += c_out

        items.append(
            CustomerReportItem(
                customer_id=c.id,
                customer_name=c.name,
                company_name=c.company_name,
                phone=c.phone,
                total_sales=c_sales,
                total_payments=c_pays,
                outstanding_balance=c_out,
                transaction_count=c_count,
                last_sale_date=c_last_sale,
                last_payment_date=c_last_pay,
            )
        )

    return CustomerReportResponse(
        period_label=label,
        total_customers=len(items),
        total_sales=tot_sales,
        total_payments=tot_pays,
        total_outstanding=tot_out,
        items=items,
    )


# ==============================================================================
# 3. EXCEL EXPORT ENGINE (openpyxl)
# ==============================================================================

def export_report_to_excel(
    report_type: str,
    data: Any,
    filters_desc: str = "",
) -> bytes:
    """
    Generates a professionally styled Excel spreadsheet (.xlsx).
    Ensures FS Number, Sale Number, and Paper Receipt Number are strictly formatted as text
    so leading zeros (e.g. '00451') are preserved and never converted to scientific notation.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = report_type.replace("_", " ").title()[:31]
    ws.views.sheetView[0].showGridLines = True

    # Styling Palettes
    navy_header_fill = PatternFill(start_color="1B365D", end_color="1B365D", fill_type="solid")
    white_header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    bold_font = Font(name="Calibri", size=11, bold=True)
    title_font = Font(name="Calibri", size=14, bold=True, color="1B365D")
    meta_font = Font(name="Calibri", size=10, italic=True, color="555555")
    thin_border = Border(
        left=Side(style="thin", color="CCCCCC"),
        right=Side(style="thin", color="CCCCCC"),
        top=Side(style="thin", color="CCCCCC"),
        bottom=Side(style="thin", color="CCCCCC"),
    )
    double_bottom_border = Border(
        top=Side(style="thin", color="000000"),
        bottom=Side(style="double", color="000000"),
    )

    # 1. Company Header
    ws.append(["DELGONE TRADING PLC — DIGITAL SALES LEDGER"])
    ws.cell(row=1, column=1).font = title_font

    now_str = get_now_addis().strftime("%b %d, %Y %I:%M %p")
    ws.append([f"Report: {report_type.replace('_', ' ').upper()} | Generated: {now_str} (Addis Ababa Time)"])
    ws.cell(row=2, column=1).font = meta_font

    if filters_desc:
        ws.append([f"Filters: {filters_desc}"])
        ws.cell(row=3, column=1).font = meta_font
    else:
        ws.append([])

    ws.append([])  # Blank separator

    start_data_row = 6

    # 2. Populate Headers & Rows depending on report type
    if report_type == "daily_sales":
        headers = [
            "Sale Number", "FS Number", "Paper Receipt", "Time (Addis)",
            "Customer", "Cashier", "Grand Total (ETB)", "Paid to Date (ETB)",
            "Outstanding Due (ETB)", "Payment Status"
        ]
        ws.append(headers)

        daily_data: DailySalesReportResponse = data
        for row_idx, item in enumerate(daily_data.transactions, start=start_data_row):
            t_str = item.sale_date.astimezone(TZ_ADDIS).strftime("%I:%M %p") if item.sale_date else ""
            row_vals = [
                str(item.sale_number),
                str(item.fs_number or ""),
                str(item.paper_receipt_number or ""),
                t_str,
                item.customer_name or "Walk-in",
                item.created_by_name,
                float(item.grand_total),
                float(item.amount_paid),
                float(item.outstanding_balance),
                item.payment_status.upper(),
            ]
            ws.append(row_vals)
            # Ensure identifiers are formatted explicitly as text
            ws.cell(row=row_idx, column=1).number_format = "@"
            ws.cell(row=row_idx, column=2).number_format = "@"
            ws.cell(row=row_idx, column=3).number_format = "@"
            # Format currency columns
            ws.cell(row=row_idx, column=7).number_format = '#,##0.00 "ETB"'
            ws.cell(row=row_idx, column=8).number_format = '#,##0.00 "ETB"'
            ws.cell(row=row_idx, column=9).number_format = '#,##0.00 "ETB"'

    elif report_type in ("cash_collections", "bank_collections"):
        headers = [
            "Payment Date (Addis)", "Sale Number", "FS Number", "Paper Receipt",
            "Customer", "Method", "Reference / Slip #", "Amount Received (ETB)", "Recorded By"
        ]
        ws.append(headers)

        coll_data: CollectionReportResponse = data
        for row_idx, item in enumerate(coll_data.items, start=start_data_row):
            d_str = item.payment_date.astimezone(TZ_ADDIS).strftime("%b %d, %Y %I:%M %p") if item.payment_date else ""
            row_vals = [
                d_str,
                str(item.sale_number),
                str(item.fs_number or ""),
                str(item.paper_receipt_number or ""),
                item.customer_name or "Walk-in",
                item.payment_method.replace("_", " ").upper(),
                str(item.reference or ""),
                float(item.amount),
                item.recorded_by_name,
            ]
            ws.append(row_vals)
            ws.cell(row=row_idx, column=2).number_format = "@"
            ws.cell(row=row_idx, column=3).number_format = "@"
            ws.cell(row=row_idx, column=4).number_format = "@"
            ws.cell(row=row_idx, column=7).number_format = "@"
            ws.cell(row=row_idx, column=8).number_format = '#,##0.00 "ETB"'

    elif report_type == "credit_sales":
        headers = [
            "Sale Date (Addis)", "Sale Number", "FS Number", "Customer",
            "Grand Total (ETB)", "Initial Paid (ETB)", "Initial Credit (ETB)",
            "Paid to Date (ETB)", "Remaining Balance (ETB)", "Status", "Cashier"
        ]
        ws.append(headers)

        credit_data: CreditSalesReportResponse = data
        for row_idx, item in enumerate(credit_data.items, start=start_data_row):
            d_str = item.sale_date.astimezone(TZ_ADDIS).strftime("%b %d, %Y") if item.sale_date else ""
            row_vals = [
                d_str,
                str(item.sale_number),
                str(item.fs_number or ""),
                item.customer_name or "Walk-in",
                float(item.grand_total),
                float(item.initial_amount_paid),
                float(item.initial_credit_amount),
                float(item.current_amount_paid),
                float(item.current_outstanding_balance),
                item.payment_status.upper(),
                item.created_by_name,
            ]
            ws.append(row_vals)
            ws.cell(row=row_idx, column=2).number_format = "@"
            ws.cell(row=row_idx, column=3).number_format = "@"
            ws.cell(row=row_idx, column=5).number_format = '#,##0.00 "ETB"'
            ws.cell(row=row_idx, column=6).number_format = '#,##0.00 "ETB"'
            ws.cell(row=row_idx, column=7).number_format = '#,##0.00 "ETB"'
            ws.cell(row=row_idx, column=8).number_format = '#,##0.00 "ETB"'
            ws.cell(row=row_idx, column=9).number_format = '#,##0.00 "ETB"'

    elif report_type == "employee_activity":
        headers = [
            "Employee Name", "Username", "Role", "Sales Created", "Sales Revenue (ETB)",
            "Initial Cash (ETB)", "Initial Bank (ETB)", "Credit Extended (ETB)",
            "Subsequent Payments Count", "Subsequent Payments Amount (ETB)"
        ]
        ws.append(headers)

        emp_data: EmployeeActivityReportResponse = data
        for row_idx, item in enumerate(emp_data.items, start=start_data_row):
            row_vals = [
                item.employee_name,
                item.username,
                item.role.replace("_", " ").title(),
                item.sales_created_count,
                float(item.sales_revenue),
                float(item.initial_cash_received),
                float(item.initial_bank_received),
                float(item.initial_credit_created),
                item.subsequent_payments_count,
                float(item.subsequent_payments_amount),
            ]
            ws.append(row_vals)
            ws.cell(row=row_idx, column=5).number_format = '#,##0.00 "ETB"'
            ws.cell(row=row_idx, column=6).number_format = '#,##0.00 "ETB"'
            ws.cell(row=row_idx, column=7).number_format = '#,##0.00 "ETB"'
            ws.cell(row=row_idx, column=8).number_format = '#,##0.00 "ETB"'
            ws.cell(row=row_idx, column=10).number_format = '#,##0.00 "ETB"'

    elif report_type == "customer_sales":
        headers = [
            "Customer Name", "Company Name", "Phone", "Total Purchases (ETB)",
            "Total Payments (ETB)", "Current Outstanding Due (ETB)", "Transactions",
            "Last Sale Date", "Last Payment Date"
        ]
        ws.append(headers)

        cust_data: CustomerReportResponse = data
        for row_idx, item in enumerate(cust_data.items, start=start_data_row):
            ls_str = item.last_sale_date.astimezone(TZ_ADDIS).strftime("%b %d, %Y") if item.last_sale_date else "-"
            lp_str = item.last_payment_date.astimezone(TZ_ADDIS).strftime("%b %d, %Y") if item.last_payment_date else "-"
            row_vals = [
                item.customer_name,
                item.company_name or "",
                str(item.phone or ""),
                float(item.total_sales),
                float(item.total_payments),
                float(item.outstanding_balance),
                item.transaction_count,
                ls_str,
                lp_str,
            ]
            ws.append(row_vals)
            ws.cell(row=row_idx, column=3).number_format = "@"
            ws.cell(row=row_idx, column=4).number_format = '#,##0.00 "ETB"'
            ws.cell(row=row_idx, column=5).number_format = '#,##0.00 "ETB"'
            ws.cell(row=row_idx, column=6).number_format = '#,##0.00 "ETB"'

    else:
        # Generic key/value fallback
        headers = ["Field", "Value"]
        ws.append(headers)
        ws.append(["Notice", f"Report export for {report_type}"])

    # Format header row (Row 5)
    header_row = 5
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=header_row, column=col_idx)
        cell.fill = navy_header_fill
        cell.font = white_header_font
        cell.alignment = Alignment(horizontal="center" if "Date" in headers[col_idx-1] or "Status" in headers[col_idx-1] else "left", vertical="center")

    # Freeze panes below header
    ws.freeze_panes = "A6"

    # Auto-adjust column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.getvalue()


# ==============================================================================
# 4. PDF EXPORT ENGINE (reportlab)
# ==============================================================================

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to calculate and render 'Page X of Y' on every page footer.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#666666"))

        # Footer divider line
        self.setStrokeColor(colors.HexColor("#CCCCCC"))
        self.setLineWidth(0.5)
        self.line(36, 30, self._pagesize[0] - 36, 30)

        # Footer text
        footer_text = "Delgone Trading PLC • Digital Sales Ledger • Confidential Financial Report"
        self.drawString(36, 20, footer_text)

        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(self._pagesize[0] - 36, 20, page_str)
        self.restoreState()


def export_report_to_pdf(
    report_type: str,
    data: Any,
    filters_desc: str = "",
) -> bytes:
    """
    Generates a high-quality PDF report with Delgone Trading PLC header,
    structured tables, exact Decimal totals, and page numbering.
    """
    buffer = io.BytesIO()

    # Use landscape for wide multi-column reports
    page_size = landscape(letter) if report_type in ("daily_sales", "credit_sales", "employee_activity", "customer_sales") else letter
    doc = SimpleDocTemplate(
        buffer,
        pagesize=page_size,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=42,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#1B365D"),
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4A5568"),
    )
    th_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=0,
    )
    td_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#2D3748"),
    )
    td_right = ParagraphStyle(
        "TableCellRight",
        parent=td_style,
        alignment=2,
        fontName="Helvetica-Bold",
    )

    elements: List[Any] = []

    # 1. Header Banner
    elements.append(Paragraph("DELGONE TRADING PLC", title_style))
    report_name = report_type.replace("_", " ").title() + " Report"
    gen_time = get_now_addis().strftime("%b %d, %Y %I:%M %p")
    meta_p = f"<b>{report_name}</b> | Generated: {gen_time} (Addis Ababa Time) | Currency: ETB"
    if filters_desc:
        meta_p += f"<br/><i>Filters: {filters_desc}</i>"
    elements.append(Paragraph(meta_p, subtitle_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1B365D"), spaceAfter=12))

    # 2. Build Tables per report type
    table_data: List[List[Any]] = []

    if report_type == "daily_sales":
        daily: DailySalesReportResponse = data
        headers = ["Sale #", "FS No.", "Receipt #", "Time", "Customer", "Cashier", "Total (ETB)", "Paid (ETB)", "Balance (ETB)", "Status"]
        table_data.append([Paragraph(h, th_style) for h in headers])

        for t in daily.transactions:
            t_str = t.sale_date.astimezone(TZ_ADDIS).strftime("%I:%M %p") if t.sale_date else ""
            table_data.append([
                Paragraph(t.sale_number, td_style),
                Paragraph(t.fs_number or "-", td_style),
                Paragraph(t.paper_receipt_number or "-", td_style),
                Paragraph(t_str, td_style),
                Paragraph(t.customer_name or "Walk-in", td_style),
                Paragraph(t.created_by_name, td_style),
                Paragraph(f"{t.grand_total:,.2f}", td_right),
                Paragraph(f"{t.amount_paid:,.2f}", td_right),
                Paragraph(f"{t.outstanding_balance:,.2f}", td_right),
                Paragraph(t.payment_status.upper(), td_style),
            ])

        # Summary footer row
        s = daily.summary
        table_data.append([
            Paragraph("<b>TOTALS</b>", td_style),
            Paragraph("", td_style),
            Paragraph("", td_style),
            Paragraph("", td_style),
            Paragraph(f"<b>{len(daily.transactions)} txs</b>", td_style),
            Paragraph("", td_style),
            Paragraph(f"<b>{s.total_sales_revenue:,.2f}</b>", td_right),
            Paragraph(f"<b>{s.cash_collections + s.bank_collections:,.2f}</b>", td_right),
            Paragraph(f"<b>{s.current_outstanding_balance:,.2f}</b>", td_right),
            Paragraph("", td_style),
        ])

    elif report_type in ("cash_collections", "bank_collections"):
        coll: CollectionReportResponse = data
        headers = ["Date / Time", "Sale #", "FS No.", "Customer", "Method", "Reference", "Amount (ETB)", "Cashier"]
        table_data.append([Paragraph(h, th_style) for h in headers])

        for item in coll.items:
            d_str = item.payment_date.astimezone(TZ_ADDIS).strftime("%b %d, %I:%M %p") if item.payment_date else ""
            table_data.append([
                Paragraph(d_str, td_style),
                Paragraph(item.sale_number, td_style),
                Paragraph(item.fs_number or "-", td_style),
                Paragraph(item.customer_name or "Walk-in", td_style),
                Paragraph(item.payment_method.replace("_", " ").upper(), td_style),
                Paragraph(item.reference or "-", td_style),
                Paragraph(f"{item.amount:,.2f}", td_right),
                Paragraph(item.recorded_by_name, td_style),
            ])

        # Totals row
        table_data.append([
            Paragraph("<b>TOTAL</b>", td_style),
            Paragraph("", td_style),
            Paragraph("", td_style),
            Paragraph("", td_style),
            Paragraph("", td_style),
            Paragraph(f"<b>{coll.payment_count} payments</b>", td_style),
            Paragraph(f"<b>{coll.total_amount:,.2f} ETB</b>", td_right),
            Paragraph("", td_style),
        ])

    elif report_type == "credit_sales":
        cred: CreditSalesReportResponse = data
        headers = ["Date", "Sale #", "FS No.", "Customer", "Total (ETB)", "Initial Paid", "Initial Credit", "Paid to Date", "Balance Due", "Status"]
        table_data.append([Paragraph(h, th_style) for h in headers])

        for item in cred.items:
            d_str = item.sale_date.astimezone(TZ_ADDIS).strftime("%b %d") if item.sale_date else ""
            table_data.append([
                Paragraph(d_str, td_style),
                Paragraph(item.sale_number, td_style),
                Paragraph(item.fs_number or "-", td_style),
                Paragraph(item.customer_name or "Walk-in", td_style),
                Paragraph(f"{item.grand_total:,.2f}", td_right),
                Paragraph(f"{item.initial_amount_paid:,.2f}", td_right),
                Paragraph(f"{item.initial_credit_amount:,.2f}", td_right),
                Paragraph(f"{item.current_amount_paid:,.2f}", td_right),
                Paragraph(f"{item.current_outstanding_balance:,.2f}", td_right),
                Paragraph(item.payment_status.upper(), td_style),
            ])

        table_data.append([
            Paragraph("<b>TOTALS</b>", td_style),
            Paragraph("", td_style),
            Paragraph("", td_style),
            Paragraph(f"<b>{cred.credit_sales_count} sales</b>", td_style),
            Paragraph("", td_right),
            Paragraph("", td_right),
            Paragraph(f"<b>{cred.total_credit_created:,.2f}</b>", td_right),
            Paragraph("", td_right),
            Paragraph(f"<b>{cred.total_current_balance:,.2f}</b>", td_right),
            Paragraph("", td_style),
        ])

    elif report_type == "employee_activity":
        emp: EmployeeActivityReportResponse = data
        headers = ["Employee", "Role", "Sales", "Revenue (ETB)", "Initial Cash", "Initial Bank", "Credit Created", "Subsequent Pays", "Collections (ETB)"]
        table_data.append([Paragraph(h, th_style) for h in headers])

        for item in emp.items:
            table_data.append([
                Paragraph(item.employee_name, td_style),
                Paragraph(item.role.replace("_", " ").title(), td_style),
                Paragraph(str(item.sales_created_count), td_style),
                Paragraph(f"{item.sales_revenue:,.2f}", td_right),
                Paragraph(f"{item.initial_cash_received:,.2f}", td_right),
                Paragraph(f"{item.initial_bank_received:,.2f}", td_right),
                Paragraph(f"{item.initial_credit_created:,.2f}", td_right),
                Paragraph(str(item.subsequent_payments_count), td_style),
                Paragraph(f"{item.total_collections_recorded:,.2f}", td_right),
            ])

    elif report_type == "customer_sales":
        cust: CustomerReportResponse = data
        headers = ["Customer", "Company", "Phone", "Total Purchases (ETB)", "Total Paid (ETB)", "Outstanding Balance (ETB)", "Sales Count"]
        table_data.append([Paragraph(h, th_style) for h in headers])

        for item in cust.items:
            table_data.append([
                Paragraph(item.customer_name, td_style),
                Paragraph(item.company_name or "-", td_style),
                Paragraph(item.phone or "-", td_style),
                Paragraph(f"{item.total_sales:,.2f}", td_right),
                Paragraph(f"{item.total_payments:,.2f}", td_right),
                Paragraph(f"{item.outstanding_balance:,.2f}", td_right),
                Paragraph(str(item.transaction_count), td_style),
            ])

        table_data.append([
            Paragraph("<b>TOTALS</b>", td_style),
            Paragraph("", td_style),
            Paragraph("", td_style),
            Paragraph(f"<b>{cust.total_sales:,.2f}</b>", td_right),
            Paragraph(f"<b>{cust.total_payments:,.2f}</b>", td_right),
            Paragraph(f"<b>{cust.total_outstanding:,.2f}</b>", td_right),
            Paragraph(f"<b>{cust.total_customers} clients</b>", td_style),
        ])

    else:
        headers = ["Item", "Detail"]
        table_data.append([Paragraph(h, th_style) for h in headers])
        table_data.append([Paragraph("Report", td_style), Paragraph(str(report_type), td_style)])

    # Construct ReportLab Table
    if table_data:
        t = Table(table_data, repeatRows=1)
        t_style = TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1B365D")),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#F8FAFC")]),
            ("LINEBELOW", (0, -1), (-1, -1), 1, colors.HexColor("#1B365D")),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#EDF2F7")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ])
        t.setStyle(t_style)
        elements.append(t)

    doc.build(elements, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()

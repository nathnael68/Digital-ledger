import math
import uuid
import zoneinfo
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from backend.app.core.config import settings
from backend.app.models.audit_log import AuditLog
from backend.app.models.customer import Customer
from backend.app.models.payment import Payment
from backend.app.models.sale import Sale
from backend.app.models.user import User
from backend.app.schemas.customer import (
    CustomerCreate,
    CustomerFinancialSummary,
    CustomerListItem,
    CustomerListResponse,
    CustomerOutstandingItem,
    CustomerOutstandingResponse,
    CustomerResponse,
    CustomerStatusUpdate,
    CustomerUpdate,
    DuplicateCheckResponse,
)
from backend.app.services.sales_service import build_sale_detail_response


def round_currency(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"))


def check_duplicate_customers(
    db: Session,
    name: str,
    company_name: Optional[str] = None,
    tin_number: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    exclude_id: Optional[uuid.UUID] = None,
) -> Tuple[bool, Optional[str], List[Customer]]:
    """
    Checks if an existing customer may be a duplicate based on TIN, phone, email, or exact name+company combination.
    Does NOT automatically merge records.
    """
    conditions = []

    # 1. Match TIN number if provided
    if tin_number and tin_number.strip():
        cleaned_tin = tin_number.strip()
        conditions.append(Customer.tin_number == cleaned_tin)

    # 2. Match phone if provided
    if phone and phone.strip():
        cleaned_phone = phone.strip()
        conditions.append(Customer.phone == cleaned_phone)
        conditions.append(Customer.alt_phone == cleaned_phone)

    # 2. Match email if provided
    if email and email.strip():
        conditions.append(Customer.email == email.strip().lower())

    # 3. Match both name AND company if both provided, or exact company match
    if name and name.strip() and company_name and company_name.strip():
        conditions.append(
            and_(
                func.lower(Customer.name) == name.strip().lower(),
                func.lower(Customer.company_name) == company_name.strip().lower(),
            )
        )
    elif company_name and company_name.strip():
        conditions.append(func.lower(Customer.company_name) == company_name.strip().lower())

    if not conditions:
        return False, None, []

    query = select(Customer).where(or_(*conditions))
    if exclude_id:
        query = query.where(Customer.id != exclude_id)

    matches = list(db.scalars(query).all())
    if not matches:
        return False, None, []

    # Determine matched reason
    first_match = matches[0]
    matched_by = "details"
    if tin_number and first_match.tin_number == tin_number.strip():
        matched_by = f"TIN number '{tin_number.strip()}'"
    elif phone and (first_match.phone == phone.strip() or first_match.alt_phone == phone.strip()):
        matched_by = f"phone number '{phone.strip()}'"
    elif email and first_match.email == email.strip().lower():
        matched_by = f"email address '{email.strip().lower()}'"
    elif company_name and first_match.company_name and first_match.company_name.lower() == company_name.strip().lower():
        matched_by = f"company name '{first_match.company_name}'"
    else:
        matched_by = f"name '{first_match.name}'"

    warning_msg = (
        f"Possible duplicate customer record detected: an existing account '{first_match.name}' "
        f"{f'({first_match.company_name})' if first_match.company_name else ''} shares the same {matched_by}."
    )
    return True, warning_msg, matches


def create_customer(
    db: Session,
    customer_in: CustomerCreate,
    current_user: User,
) -> CustomerResponse:
    """
    Creates a new customer profile. Validates duplicates and records audit log.
    """
    is_dup, warning_msg, matches = check_duplicate_customers(
        db=db,
        name=customer_in.name,
        company_name=customer_in.company_name,
        tin_number=customer_in.tin_number,
        phone=customer_in.phone,
        email=customer_in.email,
    )

    if is_dup and not customer_in.confirm_duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": warning_msg,
                "is_duplicate": True,
                "matches": [
                    {
                        "id": str(m.id),
                        "name": m.name,
                        "company_name": m.company_name,
                        "tin_number": m.tin_number,
                        "phone": m.phone,
                        "email": m.email,
                    }
                    for m in matches
                ],
            },
        )

    customer = Customer(
        id=uuid.uuid4(),
        name=customer_in.name.strip(),
        company_name=customer_in.company_name.strip() if customer_in.company_name else None,
        tin_number=customer_in.tin_number.strip() if customer_in.tin_number else None,
        phone=customer_in.phone.strip() if customer_in.phone else None,
        alt_phone=customer_in.alt_phone.strip() if customer_in.alt_phone else None,
        email=customer_in.email.strip().lower() if customer_in.email else None,
        address=customer_in.address.strip() if customer_in.address else None,
        notes=customer_in.notes.strip() if customer_in.notes else None,
        is_active=True,
    )
    db.add(customer)
    db.flush()

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE",
        entity_type="customer",
        entity_id=str(customer.id),
        old_value=None,
        new_value={
            "name": customer.name,
            "company_name": customer.company_name,
            "tin_number": customer.tin_number,
            "phone": customer.phone,
            "email": customer.email,
            "is_active": customer.is_active,
        },
        reason="Initial customer registration",
    )
    db.add(audit)
    db.commit()
    db.refresh(customer)
    return CustomerResponse.model_validate(customer)


def update_customer(
    db: Session,
    customer_id: uuid.UUID,
    customer_in: CustomerUpdate,
    current_user: User,
) -> CustomerResponse:
    """
    Updates customer profile details and preserves complete audit trail.
    """
    customer = db.scalar(select(Customer).where(Customer.id == customer_id))
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found",
        )

    old_values: Dict[str, Any] = {
        "name": customer.name,
        "company_name": customer.company_name,
        "tin_number": customer.tin_number,
        "phone": customer.phone,
        "alt_phone": customer.alt_phone,
        "email": customer.email,
        "address": customer.address,
        "notes": customer.notes,
    }

    new_values: Dict[str, Any] = {}

    if customer_in.name is not None and customer_in.name.strip() != customer.name:
        customer.name = customer_in.name.strip()
        new_values["name"] = customer.name

    if customer_in.company_name is not None:
        val = customer_in.company_name.strip() if customer_in.company_name.strip() else None
        if val != customer.company_name:
            customer.company_name = val
            new_values["company_name"] = customer.company_name

    if customer_in.tin_number is not None:
        val = customer_in.tin_number.strip() if customer_in.tin_number.strip() else None
        if val != customer.tin_number:
            customer.tin_number = val
            new_values["tin_number"] = customer.tin_number

    if customer_in.phone is not None:
        val = customer_in.phone.strip() if customer_in.phone.strip() else None
        if val != customer.phone:
            customer.phone = val
            new_values["phone"] = customer.phone

    if customer_in.alt_phone is not None:
        val = customer_in.alt_phone.strip() if customer_in.alt_phone.strip() else None
        if val != customer.alt_phone:
            customer.alt_phone = val
            new_values["alt_phone"] = customer.alt_phone

    if customer_in.email is not None:
        val = customer_in.email.strip().lower() if customer_in.email.strip() else None
        if val != customer.email:
            customer.email = val
            new_values["email"] = customer.email

    if customer_in.address is not None:
        val = customer_in.address.strip() if customer_in.address.strip() else None
        if val != customer.address:
            customer.address = val
            new_values["address"] = customer.address

    if customer_in.notes is not None:
        val = customer_in.notes.strip() if customer_in.notes.strip() else None
        if val != customer.notes:
            customer.notes = val
            new_values["notes"] = customer.notes

    if new_values:
        audit = AuditLog(
            user_id=current_user.id,
            action="UPDATE",
            entity_type="customer",
            entity_id=str(customer.id),
            old_value={k: old_values[k] for k in new_values.keys()},
            new_value=new_values,
            reason=customer_in.reason or "Customer contact details updated",
        )
        db.add(audit)
        db.commit()
        db.refresh(customer)

    return CustomerResponse.model_validate(customer)


def update_customer_status(
    db: Session,
    customer_id: uuid.UUID,
    status_in: CustomerStatusUpdate,
    current_user: User,
) -> CustomerResponse:
    """
    Activates or deactivates a customer account with audit logging.
    """
    customer = db.scalar(select(Customer).where(Customer.id == customer_id))
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found",
        )

    if customer.is_active == status_in.is_active:
        return CustomerResponse.model_validate(customer)

    old_status = customer.is_active
    customer.is_active = status_in.is_active

    reason = status_in.reason or (
        "Customer account activated" if status_in.is_active else "Customer account deactivated"
    )

    audit = AuditLog(
        user_id=current_user.id,
        action="STATUS_CHANGE",
        entity_type="customer",
        entity_id=str(customer.id),
        old_value={"is_active": old_status},
        new_value={"is_active": customer.is_active},
        reason=reason,
    )
    db.add(audit)
    db.commit()
    db.refresh(customer)
    return CustomerResponse.model_validate(customer)


def compute_customer_financials(db: Session, customer_id: uuid.UUID) -> CustomerFinancialSummary:
    """
    Computes exact real-time financial metrics for a customer based exclusively on database transaction records.
    Voided transactions are excluded from active totals.
    """
    customer = db.scalar(select(Customer).where(Customer.id == customer_id))
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found",
        )

    active_sales_cond = (Sale.customer_id == customer_id) & (Sale.voided_at.is_(None))

    # Total Sales Revenue (active only)
    sales_stmt = select(
        func.coalesce(func.sum(Sale.grand_total), Decimal("0.00")),
        func.count(Sale.id),
    ).where(active_sales_cond)
    total_sales_rev, total_sales_cnt = db.execute(sales_stmt).one()

    # Total Payments Received (for active sales only)
    payments_stmt = (
        select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .select_from(Payment)
        .join(Sale, Payment.sale_id == Sale.id)
        .where(active_sales_cond)
    )
    total_paid: Decimal = db.scalar(payments_stmt) or Decimal("0.00")

    # Counts by status
    unpaid_stmt = select(func.count(Sale.id)).where(
        active_sales_cond,
        Sale.payment_status == "credit",
    )
    unpaid_cnt: int = db.scalar(unpaid_stmt) or 0

    partial_stmt = select(func.count(Sale.id)).where(
        active_sales_cond,
        Sale.payment_status == "partial",
    )
    partial_cnt: int = db.scalar(partial_stmt) or 0

    paid_stmt = select(func.count(Sale.id)).where(
        active_sales_cond,
        Sale.payment_status == "paid",
    )
    paid_cnt: int = db.scalar(paid_stmt) or 0

    voided_stmt = select(func.count(Sale.id)).where(
        Sale.customer_id == customer_id,
        Sale.voided_at.is_not(None),
    )
    voided_cnt: int = db.scalar(voided_stmt) or 0

    outstanding = max(Decimal("0.00"), (total_sales_rev or Decimal("0.00")) - total_paid)

    return CustomerFinancialSummary(
        customer_id=customer.id,
        customer_name=customer.name,
        company_name=customer.company_name,
        tin_number=customer.tin_number,
        total_sales_revenue=round_currency(total_sales_rev or Decimal("0.00")),
        total_payments_received=round_currency(total_paid),
        outstanding_balance=round_currency(outstanding),
        total_sales_count=total_sales_cnt or 0,
        unpaid_sales_count=unpaid_cnt,
        partial_sales_count=partial_cnt,
        paid_sales_count=paid_cnt,
        voided_sales_count=voided_cnt,
    )


def list_customers(
    db: Session,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    page: int = 1,
    page_size: int = 15,
) -> CustomerListResponse:
    """
    Retrieves paginated customer directory with search, status filtering, and calculated financial totals.
    """
    query = select(Customer)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Customer.name).like(term),
                func.lower(Customer.company_name).like(term),
                func.lower(Customer.tin_number).like(term),
                func.lower(Customer.phone).like(term),
                func.lower(Customer.alt_phone).like(term),
                func.lower(Customer.email).like(term),
            )
        )

    if status_filter:
        if status_filter.lower() == "active":
            query = query.where(Customer.is_active.is_(True))
        elif status_filter.lower() == "inactive":
            query = query.where(Customer.is_active.is_(False))

    # Total matching count
    count_stmt = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.scalar(count_stmt) or 0

    # Sorting
    if sort_by == "company_name":
        order_col = func.coalesce(Customer.company_name, Customer.name)
    elif sort_by == "created_at":
        order_col = Customer.created_at
    else:
        order_col = Customer.name

    if sort_order.lower() == "desc":
        query = query.order_by(order_col.desc())
    else:
        query = query.order_by(order_col.asc())

    # Pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    customers = list(db.scalars(query).all())

    # For each customer in current page, compute their active financial metrics
    items: List[CustomerListItem] = []
    for c in customers:
        summary = compute_customer_financials(db, c.id)
        items.append(
            CustomerListItem(
                id=c.id,
                name=c.name,
                company_name=c.company_name,
                tin_number=c.tin_number,
                phone=c.phone,
                alt_phone=c.alt_phone,
                email=c.email,
                address=c.address,
                is_active=c.is_active,
                total_purchases=summary.total_sales_revenue,
                total_paid=summary.total_payments_received,
                outstanding_balance=summary.outstanding_balance,
                active_sales_count=summary.total_sales_count,
                unpaid_sales_count=summary.unpaid_sales_count + summary.partial_sales_count,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )

    # If requested sorting by outstanding_balance or total_purchases
    if sort_by == "outstanding_balance":
        items.sort(key=lambda x: x.outstanding_balance, reverse=(sort_order.lower() == "desc"))
    elif sort_by == "total_purchases":
        items.sort(key=lambda x: x.total_purchases, reverse=(sort_order.lower() == "desc"))

    total_pages = max(1, math.ceil(total / page_size))
    return CustomerListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def get_customer_sales(
    db: Session,
    customer_id: uuid.UUID,
    search: Optional[str] = None,
    payment_status: Optional[str] = None,
    page: int = 1,
    page_size: int = 15,
) -> Any:
    """
    Returns paginated transaction history for a specific customer.
    """
    # Verify customer exists
    customer = db.scalar(select(Customer).where(Customer.id == customer_id))
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found",
        )

    query = (
        select(Sale)
        .where(Sale.customer_id == customer_id)
        .options(
            joinedload(Sale.customer),
            joinedload(Sale.creator),
            joinedload(Sale.voider),
            selectinload(Sale.items),
            selectinload(Sale.payments).joinedload(Payment.recorder),
        )
    )

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Sale.sale_number).like(term),
                func.lower(Sale.fs_number).like(term),
                func.lower(Sale.paper_receipt_number).like(term),
            )
        )

    if payment_status:
        query = query.where(Sale.payment_status == payment_status)

    count_stmt = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.scalar(count_stmt) or 0

    query = query.order_by(Sale.sale_date.desc()).offset((page - 1) * page_size).limit(page_size)
    sales = db.scalars(query).all()

    total_pages = max(1, math.ceil(total / page_size))
    return {
        "items": [build_sale_detail_response(s) for s in sales],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


def get_customer_payments(
    db: Session,
    customer_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
) -> Any:
    """
    Returns chronological payment history for a customer's transactions.
    """
    customer = db.scalar(select(Customer).where(Customer.id == customer_id))
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found",
        )

    query = (
        select(Payment, Sale)
        .join(Sale, Payment.sale_id == Sale.id)
        .where(Sale.customer_id == customer_id)
        .options(joinedload(Payment.recorder))
    )

    count_stmt = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.scalar(count_stmt) or 0

    query = query.order_by(Payment.payment_date.desc()).offset((page - 1) * page_size).limit(page_size)
    results = db.execute(query).all()

    items = []
    for p, s in results:
        items.append(
            {
                "id": p.id,
                "payment_date": p.payment_date,
                "sale_id": s.id,
                "sale_number": s.sale_number,
                "fs_number": s.fs_number,
                "paper_receipt_number": s.paper_receipt_number,
                "payment_method": p.payment_method,
                "reference": p.reference,
                "amount": p.amount,
                "recorded_by": p.recorded_by,
                "recorded_by_name": p.recorder.full_name if p.recorder else "System",
                "created_at": p.created_at,
            }
        )

    total_pages = max(1, math.ceil(total / page_size))
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


def get_customers_outstanding(
    db: Session,
    search: Optional[str] = None,
    aging_category: Optional[str] = None,
    min_balance: Decimal = Decimal("0.01"),
    max_balance: Optional[Decimal] = None,
    page: int = 1,
    page_size: int = 15,
) -> CustomerOutstandingResponse:
    """
    Calculates outstanding customer receivables and classifies unpaid balances into aging categories
    (0-30 days, 31-60 days, 61-90 days, >90 days) based on the Addis Ababa business timezone.
    """
    tz = zoneinfo.ZoneInfo(settings.APP_TIMEZONE)
    today_addis = datetime.now(tz).date()

    # Get all customers who have at least one active non-voided sale with unpaid status
    # or customers with search filter
    cust_query = select(Customer)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        cust_query = cust_query.where(
            or_(
                func.lower(Customer.name).like(term),
                func.lower(Customer.company_name).like(term),
                func.lower(Customer.phone).like(term),
            )
        )

    all_customers = list(db.scalars(cust_query).all())

    outstanding_list: List[CustomerOutstandingItem] = []
    total_receivables_sum = Decimal("0.00")

    for cust in all_customers:
        # Load active sales for this customer with their payments
        sales_stmt = (
            select(Sale)
            .where(
                Sale.customer_id == cust.id,
                Sale.voided_at.is_(None),
            )
            .options(selectinload(Sale.payments))
            .order_by(Sale.sale_date.asc())
        )
        cust_sales = list(db.scalars(sales_stmt).all())
        if not cust_sales:
            continue

        total_sales_amount = Decimal("0.00")
        total_paid_amount = Decimal("0.00")
        unpaid_count = 0
        oldest_unpaid_date: Optional[datetime] = None
        newest_payment_date: Optional[datetime] = None

        age_0_30 = Decimal("0.00")
        age_31_60 = Decimal("0.00")
        age_61_90 = Decimal("0.00")
        age_over_90 = Decimal("0.00")

        for s in cust_sales:
            total_sales_amount += s.grand_total
            sale_paid = sum((p.amount for p in s.payments), Decimal("0.00"))
            total_paid_amount += sale_paid

            # Check latest payment date
            for p in s.payments:
                if newest_payment_date is None or p.payment_date > newest_payment_date:
                    newest_payment_date = p.payment_date

            # Calculate remaining balance on this sale
            sale_balance = max(Decimal("0.00"), s.grand_total - sale_paid)
            if sale_balance > Decimal("0.00"):
                unpaid_count += 1
                if oldest_unpaid_date is None or s.sale_date < oldest_unpaid_date:
                    oldest_unpaid_date = s.sale_date

                # Calculate age in Addis Ababa timezone
                sale_local_date = s.sale_date.astimezone(tz).date()
                days_old = (today_addis - sale_local_date).days

                if days_old <= 30:
                    age_0_30 += sale_balance
                elif days_old <= 60:
                    age_31_60 += sale_balance
                elif days_old <= 90:
                    age_61_90 += sale_balance
                else:
                    age_over_90 += sale_balance

        cust_balance = max(Decimal("0.00"), total_sales_amount - total_paid_amount)
        if cust_balance < min_balance:
            continue
        if max_balance is not None and cust_balance > max_balance:
            continue

        # Determine primary aging category
        if age_over_90 > 0:
            primary_cat = "> 90 days"
        elif age_61_90 > 0:
            primary_cat = "61-90 days"
        elif age_31_60 > 0:
            primary_cat = "31-60 days"
        else:
            primary_cat = "0-30 days"

        # Apply category filter if requested
        if aging_category and aging_category != "all":
            if aging_category == "0-30" and age_0_30 <= 0:
                continue
            elif aging_category == "31-60" and age_31_60 <= 0:
                continue
            elif aging_category == "61-90" and age_61_90 <= 0:
                continue
            elif aging_category in (">90", "90+", "over_90") and age_over_90 <= 0:
                continue

        total_receivables_sum += cust_balance
        outstanding_list.append(
            CustomerOutstandingItem(
                customer_id=cust.id,
                name=cust.name,
                company_name=cust.company_name,
                tin_number=cust.tin_number,
                phone=cust.phone,
                alt_phone=cust.alt_phone,
                total_sales=round_currency(total_sales_amount),
                total_paid=round_currency(total_paid_amount),
                outstanding_balance=round_currency(cust_balance),
                oldest_sale_date=oldest_unpaid_date,
                newest_payment_date=newest_payment_date,
                unpaid_sales_count=unpaid_count,
                age_0_30_days=round_currency(age_0_30),
                age_31_60_days=round_currency(age_31_60),
                age_61_90_days=round_currency(age_61_90),
                age_over_90_days=round_currency(age_over_90),
                primary_aging_category=primary_cat,
            )
        )

    # Sort by outstanding balance descending
    outstanding_list.sort(key=lambda x: x.outstanding_balance, reverse=True)

    total_count = len(outstanding_list)
    total_pages = max(1, math.ceil(total_count / page_size))
    paginated_items = outstanding_list[(page - 1) * page_size : page * page_size]

    return CustomerOutstandingResponse(
        items=paginated_items,
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        total_outstanding_sum=round_currency(total_receivables_sum),
    )

import math
import uuid
import zoneinfo
from datetime import datetime, time, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload
from backend.app.core.config import settings
from backend.app.models.customer import Customer
from backend.app.models.payment import Payment
from backend.app.models.product import Product
from backend.app.models.sale import Sale
from backend.app.models.sale_item import SaleItem
from backend.app.models.sale_sequence import SaleSequence
from backend.app.models.user import User
from backend.app.schemas.sale import (
    PaymentCreate,
    SaleCorrectionInput,
    SaleCreate,
    SaleDetailResponse,
    SaleItemCreate,
    SaleItemResponse,
    SaleListResponse,
    SaleVoidInput,
    PaymentResponse,
)
from backend.app.services.audit_service import log_audit


def get_addis_now() -> datetime:
    tz = zoneinfo.ZoneInfo(settings.APP_TIMEZONE)
    return datetime.now(tz)


def round_currency(val: Decimal) -> Decimal:
    """Rounds monetary value to 2 decimal places using standard half-up rounding."""
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def round_quantity(val: Decimal) -> Decimal:
    """Rounds quantity to 3 decimal places."""
    return val.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)


def generate_next_sale_number(db: Session) -> str:
    """
    Generates an atomic, collision-safe sequential sale number in the format DL-YYYY-0001.
    Uses Addis Ababa business timezone and row-level locking.
    """
    now = get_addis_now()
    current_year = now.year

    # Lock row in sale_sequences to prevent concurrent duplicates
    seq = db.scalar(
        select(SaleSequence)
        .where(SaleSequence.year == current_year)
        .with_for_update()
    )

    if not seq:
        # Check existing max number for that year in sales table to handle any legacy entries
        prefix = f"DL-{current_year}-%"
        max_sale_num = db.scalar(
            select(func.max(Sale.sale_number)).where(Sale.sale_number.like(prefix))
        )
        starting_num = 0
        if max_sale_num:
            try:
                starting_num = int(max_sale_num.split("-")[-1])
            except Exception:
                starting_num = 0

        seq = SaleSequence(year=current_year, current_number=starting_num + 1)
        db.add(seq)
        db.flush()
    else:
        seq.current_number += 1
        db.flush()

    return f"DL-{current_year}-{seq.current_number:04d}"


def calculate_totals(
    items_in: List[SaleItemCreate], discount: Decimal
) -> Tuple[Decimal, Decimal, List[Dict[str, Any]]]:
    """
    Validates items and computes line subtotals, overall subtotal, and grand total.
    """
    if not items_in:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A sale must contain at least one product line",
        )

    if discount < Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Discount cannot be negative",
        )

    processed_lines = []
    subtotal = Decimal("0.00")

    for idx, item in enumerate(items_in, start=1):
        if item.quantity <= Decimal("0"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Line {idx} ({item.description}): Quantity must be greater than zero",
            )
        if item.unit_price < Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Line {idx} ({item.description}): Unit price cannot be negative",
            )

        qty = round_quantity(item.quantity)
        price = round_currency(item.unit_price)
        line_subtotal = round_currency(qty * price)
        subtotal += line_subtotal

        processed_lines.append(
            {
                "product_id": item.product_id,
                "description_snapshot": item.description.strip(),
                "unit": item.unit.strip().lower(),
                "quantity": qty,
                "unit_price": price,
                "line_subtotal": line_subtotal,
            }
        )

    subtotal = round_currency(subtotal)
    discount = round_currency(discount)

    if discount > subtotal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Discount ({discount} ETB) cannot exceed the sale subtotal ({subtotal} ETB)",
        )

    grand_total = round_currency(subtotal - discount)
    return subtotal, grand_total, processed_lines


def build_sale_detail_response(sale: Sale) -> SaleDetailResponse:
    """Helper to convert a Sale ORM model to a typed SaleDetailResponse."""
    total_paid = sum((p.amount for p in sale.payments), Decimal("0.00"))
    outstanding = max(Decimal("0.00"), sale.grand_total - total_paid)

    items_res = [
        SaleItemResponse(
            id=item.id,
            sale_id=item.sale_id,
            product_id=item.product_id,
            description_snapshot=item.description_snapshot,
            unit=item.unit,
            quantity=item.quantity,
            unit_price=item.unit_price,
            line_subtotal=item.line_subtotal,
        )
        for item in sale.items
    ]

    payments_res = [
        PaymentResponse(
            id=p.id,
            sale_id=p.sale_id,
            amount=p.amount,
            payment_method=p.payment_method,
            payment_date=p.payment_date,
            reference=p.reference,
            recorded_by=p.recorded_by,
            recorded_by_name=p.recorder.full_name if p.recorder else "System",
            created_at=p.created_at,
        )
        for p in sale.payments
    ]

    return SaleDetailResponse(
        id=sale.id,
        sale_number=sale.sale_number,
        fs_number=sale.fs_number,
        paper_receipt_number=sale.paper_receipt_number,
        buyer_tin=sale.buyer_tin,
        customer_id=sale.customer_id,
        customer_name=sale.customer.name if sale.customer else None,
        customer_company_name=sale.customer.company_name if sale.customer else None,
        customer_tin=sale.customer.tin_number if sale.customer else None,
        customer_phone=sale.customer.phone if sale.customer else None,
        sale_date=sale.sale_date,
        subtotal=sale.subtotal,
        discount=sale.discount,
        grand_total=sale.grand_total,
        total_paid=total_paid,
        outstanding_balance=outstanding,
        amount_paid=total_paid,
        balance_due=outstanding,
        payment_status=sale.payment_status,
        notes=sale.notes,
        created_by=sale.created_by,
        created_by_name=sale.creator.full_name if sale.creator else "Unknown",
        created_at=sale.created_at,
        updated_at=sale.updated_at,
        voided_at=sale.voided_at,
        voided_by=sale.voided_by,
        voided_by_name=sale.voider.full_name if sale.voider else None,
        void_reason=sale.void_reason,
        items=items_res,
        payments=payments_res,
    )


def create_sale(db: Session, sale_in: SaleCreate, current_user: User) -> SaleDetailResponse:
    """
    Creates a new sale transaction with snapshot lines and initial settlement atomically.
    """
    # 1. Idempotency Check
    if sale_in.idempotency_key:
        existing = db.scalar(
            select(Sale)
            .where(Sale.idempotency_key == sale_in.idempotency_key)
            .options(
                joinedload(Sale.customer),
                joinedload(Sale.creator),
                joinedload(Sale.voider),
                selectinload(Sale.items),
                selectinload(Sale.payments).joinedload(Payment.recorder),
            )
        )
        if existing:
            return build_sale_detail_response(existing)

    # 2. Customer Validation
    if sale_in.customer_id:
        cust = db.scalar(select(Customer).where(Customer.id == sale_in.customer_id))
        if not cust:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected customer does not exist",
            )
        if not cust.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Customer '{cust.name}' is inactive and cannot be selected for new transactions. Please reactivate the account first.",
            )

    # 3. Financial calculations
    subtotal, grand_total, line_data = calculate_totals(sale_in.items, sale_in.discount)

    # 4. Sequential collision-safe sale number
    sale_number = generate_next_sale_number(db)
    now_tz = datetime.now(timezone.utc)

    # 5. Determine initial payment status
    initial_amount = Decimal("0.00")
    if sale_in.payment:
        initial_amount = round_currency(sale_in.payment.amount)
        if initial_amount > grand_total:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Initial payment ({initial_amount} ETB) cannot exceed grand total ({grand_total} ETB)",
            )

    if initial_amount == Decimal("0.00"):
        payment_status = "credit"
    elif initial_amount >= grand_total:
        payment_status = "paid"
    else:
        payment_status = "partial"

    # 6. Create Sale record
    buyer_tin = sale_in.buyer_tin.strip() if sale_in.buyer_tin else None
    if not buyer_tin and sale_in.customer_id and cust and cust.tin_number:
        buyer_tin = cust.tin_number

    new_sale = Sale(
        sale_number=sale_number,
        fs_number=sale_in.fs_number.strip(),
        paper_receipt_number=sale_in.paper_receipt_number.strip() if sale_in.paper_receipt_number else None,
        buyer_tin=buyer_tin,
        customer_id=sale_in.customer_id,
        sale_date=now_tz,
        subtotal=subtotal,
        discount=round_currency(sale_in.discount),
        grand_total=grand_total,
        payment_status=payment_status,
        notes=sale_in.notes.strip() if sale_in.notes else None,
        created_by=current_user.id,
        idempotency_key=sale_in.idempotency_key,
    )
    db.add(new_sale)
    db.flush()

    # 7. Create SaleItem snapshots
    for line in line_data:
        item = SaleItem(
            sale_id=new_sale.id,
            product_id=line["product_id"],
            description_snapshot=line["description_snapshot"],
            unit=line["unit"],
            quantity=line["quantity"],
            unit_price=line["unit_price"],
            line_subtotal=line["line_subtotal"],
        )
        db.add(item)

    # 8. Create initial payment if any
    if sale_in.payment and initial_amount > Decimal("0.00"):
        payment = Payment(
            sale_id=new_sale.id,
            amount=initial_amount,
            payment_method=sale_in.payment.payment_method,
            payment_date=now_tz,
            reference=sale_in.payment.reference.strip() if sale_in.payment.reference else None,
            idempotency_key=sale_in.payment.idempotency_key,
            recorded_by=current_user.id,
        )
        db.add(payment)

    # 9. Audit log entry
    log_audit(
        db=db,
        action="SALE_CREATE",
        entity_type="Sale",
        entity_id=str(new_sale.id),
        user_id=current_user.id,
        new_value={
            "sale_number": new_sale.sale_number,
            "fs_number": new_sale.fs_number,
            "buyer_tin": new_sale.buyer_tin,
            "grand_total": str(new_sale.grand_total),
            "payment_status": new_sale.payment_status,
            "initial_payment": str(initial_amount),
        },
        reason="Counter sales recording",
    )

    db.commit()

    # Preload relationships for complete detail response
    refreshed_sale = db.scalar(
        select(Sale)
        .where(Sale.id == new_sale.id)
        .options(
            joinedload(Sale.customer),
            joinedload(Sale.creator),
            joinedload(Sale.voider),
            selectinload(Sale.items),
            selectinload(Sale.payments).joinedload(Payment.recorder),
        )
    )
    return build_sale_detail_response(refreshed_sale)


def get_sale_by_id(db: Session, sale_id: uuid.UUID) -> SaleDetailResponse:
    """Retrieves full sale details including items, payments, and customer."""
    sale = db.scalar(
        select(Sale)
        .where(Sale.id == sale_id)
        .options(
            joinedload(Sale.customer),
            joinedload(Sale.creator),
            joinedload(Sale.voider),
            selectinload(Sale.items),
            selectinload(Sale.payments).joinedload(Payment.recorder),
        )
    )
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale transaction not found",
        )
    return build_sale_detail_response(sale)


def list_sales(
    db: Session,
    search: Optional[str] = None,
    payment_status: Optional[str] = None,
    payment_method: Optional[str] = None,
    transaction_status: Optional[str] = None,
    has_balance: Optional[bool] = None,
    customer_id: Optional[uuid.UUID] = None,
    created_by: Optional[uuid.UUID] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    sort_by: str = "sale_date",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 15,
) -> SaleListResponse:
    """
    Searchable, filtered, and paginated sales ledger query.
    Avoids N+1 queries using selectinload and joinedload.
    Supports multi-field search and advanced sorting/filtering.
    """
    query = select(Sale).options(
        joinedload(Sale.customer),
        joinedload(Sale.creator),
        joinedload(Sale.voider),
        selectinload(Sale.items),
        selectinload(Sale.payments).joinedload(Payment.recorder),
    )

    if search:
        search_pattern = f"%{search.strip().lower()}%"
        query = query.outerjoin(Customer, Sale.customer_id == Customer.id)
        # Check sale number, FS number, paper receipt, customer name, company name, phone, alt phone, and item descriptions
        query = query.where(
            or_(
                func.lower(Sale.sale_number).like(search_pattern),
                func.lower(Sale.fs_number).like(search_pattern),
                func.lower(Sale.paper_receipt_number).like(search_pattern),
                func.lower(Sale.buyer_tin).like(search_pattern),
                func.lower(Customer.name).like(search_pattern),
                func.lower(Customer.company_name).like(search_pattern),
                func.lower(Customer.tin_number).like(search_pattern),
                func.lower(Customer.phone).like(search_pattern),
                func.lower(Customer.alt_phone).like(search_pattern),
                Sale.id.in_(
                    select(SaleItem.sale_id).where(
                        func.lower(SaleItem.description_snapshot).like(search_pattern)
                    )
                ),
            )
        )

    if payment_status:
        query = query.where(Sale.payment_status == payment_status)

    if payment_method:
        query = query.where(
            Sale.id.in_(
                select(Payment.sale_id).where(Payment.payment_method == payment_method)
            )
        )

    if transaction_status:
        if transaction_status.lower() == "active":
            query = query.where(Sale.voided_at.is_(None))
        elif transaction_status.lower() == "voided":
            query = query.where(Sale.voided_at.is_not(None))

    paid_subquery = (
        select(func.coalesce(func.sum(Payment.amount), Decimal("0.00")))
        .where(Payment.sale_id == Sale.id)
        .scalar_subquery()
    )

    if has_balance is True:
        # Only sales where remaining balance > 0 (and not voided)
        query = query.where(
            Sale.voided_at.is_(None),
            (Sale.grand_total - paid_subquery) > Decimal("0.00"),
        )
    elif has_balance is False:
        # Fully paid sales
        query = query.where(
            (Sale.grand_total - paid_subquery) <= Decimal("0.00")
        )

    if customer_id:
        query = query.where(Sale.customer_id == customer_id)

    if created_by:
        query = query.where(Sale.created_by == created_by)

    if date_from:
        query = query.where(Sale.sale_date >= date_from)

    if date_to:
        query = query.where(Sale.sale_date <= date_to)

    # Count total matching
    count_stmt = select(func.count()).select_from(query.order_by(None).subquery())
    total = db.scalar(count_stmt) or 0

    # Determine order expression
    if sort_by == "sales_id" or sort_by == "sale_number":
        order_col = Sale.sale_number
    elif sort_by == "fs_number":
        order_col = func.coalesce(Sale.fs_number, "")
    elif sort_by == "grand_total":
        order_col = Sale.grand_total
    elif sort_by == "customer_name" or sort_by == "customer":
        # Ensure Customer table joined if not already
        if not search:
            query = query.outerjoin(Customer, Sale.customer_id == Customer.id)
        order_col = func.coalesce(Customer.name, "Walk-in")
    elif sort_by == "outstanding_balance":
        order_col = Sale.grand_total - paid_subquery
    else:
        order_col = Sale.sale_date

    if sort_order.lower() == "asc":
        query = query.order_by(order_col.asc(), Sale.id.asc())
    else:
        query = query.order_by(order_col.desc(), Sale.id.desc())

    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    sales = db.scalars(query).all()

    total_pages = max(1, math.ceil(total / page_size))

    return SaleListResponse(
        items=[build_sale_detail_response(s) for s in sales],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def record_payment_for_sale(
    db: Session,
    sale_id: uuid.UUID,
    payment_in: PaymentCreate,
    current_user: User,
) -> PaymentResponse:
    """
    Records an additional payment against an existing sale.
    Uses row-level locking to prevent concurrent overpayment and validates outstanding balance.
    """
    # 1. Row-level lock on Sale
    sale = db.scalar(
        select(Sale)
        .where(Sale.id == sale_id)
        .options(selectinload(Sale.payments))
        .with_for_update()
    )
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale transaction not found",
        )

    # 2. Check if voided
    if sale.voided_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot record payment against a voided sale",
        )

    # 3. Idempotency Check
    if payment_in.idempotency_key:
        existing_pmt = db.scalar(
            select(Payment)
            .where(Payment.idempotency_key == payment_in.idempotency_key)
            .options(joinedload(Payment.recorder))
        )
        if existing_pmt:
            return PaymentResponse(
                id=existing_pmt.id,
                sale_id=existing_pmt.sale_id,
                amount=existing_pmt.amount,
                payment_method=existing_pmt.payment_method,
                payment_date=existing_pmt.payment_date,
                reference=existing_pmt.reference,
                recorded_by=existing_pmt.recorded_by,
                recorded_by_name=existing_pmt.recorder.full_name if existing_pmt.recorder else "System",
                created_at=existing_pmt.created_at,
            )

    # 4. Validate amount against remaining outstanding balance
    current_paid = sum((p.amount for p in sale.payments), Decimal("0.00"))
    remaining_balance = sale.grand_total - current_paid
    payment_amount = round_currency(payment_in.amount)

    if payment_amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than zero",
        )

    if payment_amount > remaining_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount ({payment_amount} ETB) exceeds the remaining outstanding balance of {remaining_balance} ETB",
        )

    # 5. Create Payment record
    pmt_date = payment_in.payment_date or datetime.now(timezone.utc)
    new_payment = Payment(
        sale_id=sale.id,
        amount=payment_amount,
        payment_method=payment_in.payment_method,
        payment_date=pmt_date,
        reference=payment_in.reference.strip() if payment_in.reference else None,
        idempotency_key=payment_in.idempotency_key,
        recorded_by=current_user.id,
    )
    db.add(new_payment)
    db.flush()

    # 6. Recalculate and update payment status on Sale
    new_total_paid = current_paid + payment_amount
    if new_total_paid >= sale.grand_total:
        sale.payment_status = "paid"
    else:
        sale.payment_status = "partial"

    # 7. Audit Log
    log_audit(
        db=db,
        action="PAYMENT_RECORD",
        entity_type="Payment",
        entity_id=str(new_payment.id),
        user_id=current_user.id,
        new_value={
            "sale_number": sale.sale_number,
            "amount": str(new_payment.amount),
            "payment_method": new_payment.payment_method,
            "reference": new_payment.reference,
            "new_payment_status": sale.payment_status,
        },
        reason=f"Payment recorded by {current_user.full_name}",
    )

    db.commit()

    return PaymentResponse(
        id=new_payment.id,
        sale_id=new_payment.sale_id,
        amount=new_payment.amount,
        payment_method=new_payment.payment_method,
        payment_date=new_payment.payment_date,
        reference=new_payment.reference,
        recorded_by=new_payment.recorded_by,
        recorded_by_name=current_user.full_name,
        created_at=new_payment.created_at,
    )


def correct_sale(
    db: Session,
    sale_id: uuid.UUID,
    correction_in: SaleCorrectionInput,
    current_user: User,
) -> SaleDetailResponse:
    """
    Applies corrections to FS No., paper receipt reference, or notes with mandatory audit trail.
    """
    sale = db.scalar(
        select(Sale)
        .where(Sale.id == sale_id)
        .options(
            joinedload(Sale.customer),
            joinedload(Sale.creator),
            joinedload(Sale.voider),
            selectinload(Sale.items),
            selectinload(Sale.payments).joinedload(Payment.recorder),
        )
    )
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale transaction not found",
        )

    if sale.voided_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit or correct a voided sale",
        )

    old_values = {
        "fs_number": sale.fs_number,
        "paper_receipt_number": sale.paper_receipt_number,
        "buyer_tin": sale.buyer_tin,
        "notes": sale.notes,
    }

    if correction_in.fs_number is not None:
        sale.fs_number = correction_in.fs_number.strip()
    if correction_in.paper_receipt_number is not None:
        sale.paper_receipt_number = correction_in.paper_receipt_number.strip() or None
    if correction_in.buyer_tin is not None:
        sale.buyer_tin = correction_in.buyer_tin.strip() or None
    if correction_in.notes is not None:
        sale.notes = correction_in.notes.strip() or None

    log_audit(
        db=db,
        action="SALE_CORRECTION",
        entity_type="Sale",
        entity_id=str(sale.id),
        user_id=current_user.id,
        old_value=old_values,
        new_value={
            "fs_number": sale.fs_number,
            "paper_receipt_number": sale.paper_receipt_number,
            "buyer_tin": sale.buyer_tin,
            "notes": sale.notes,
        },
        reason=correction_in.reason,
    )

    db.commit()
    db.refresh(sale)
    return build_sale_detail_response(sale)


def void_sale(
    db: Session,
    sale_id: uuid.UUID,
    void_in: SaleVoidInput,
    current_user: User,
) -> SaleDetailResponse:
    """
    Voids a sale transaction.
    Preserves all historical payment and item records for audit history.
    Voided transactions are excluded from active revenue calculations.
    """
    sale = db.scalar(
        select(Sale)
        .where(Sale.id == sale_id)
        .options(
            joinedload(Sale.customer),
            joinedload(Sale.creator),
            joinedload(Sale.voider),
            selectinload(Sale.items),
            selectinload(Sale.payments).joinedload(Payment.recorder),
        )
    )
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale transaction not found",
        )

    if sale.voided_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This sale is already voided",
        )

    now_tz = datetime.now(timezone.utc)
    sale.voided_at = now_tz
    sale.voided_by = current_user.id
    sale.void_reason = void_in.reason
    sale.payment_status = "voided"

    total_payments_preserved = sum((p.amount for p in sale.payments), Decimal("0.00"))

    log_audit(
        db=db,
        action="SALE_VOID",
        entity_type="Sale",
        entity_id=str(sale.id),
        user_id=current_user.id,
        old_value={
            "sale_number": sale.sale_number,
            "grand_total": str(sale.grand_total),
            "payment_status": "active",
            "payments_recorded": str(total_payments_preserved),
        },
        new_value={
            "voided_at": now_tz.isoformat(),
            "voided_by": str(current_user.id),
            "void_reason": void_in.reason,
            "payment_status": "voided",
        },
        reason=void_in.reason,
    )

    db.commit()
    db.refresh(sale)
    return build_sale_detail_response(sale)

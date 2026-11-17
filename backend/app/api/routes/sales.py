import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.sale import (
    PaymentCreate,
    PaymentResponse,
    SaleCorrectionInput,
    SaleCreate,
    SaleDetailResponse,
    SaleListResponse,
    SaleVoidInput,
)
from backend.app.services.sales_service import (
    correct_sale,
    create_sale,
    get_sale_by_id,
    list_sales,
    record_payment_for_sale,
    void_sale,
)

router = APIRouter(prefix="/sales", tags=["Sales Management"])


@router.post("", response_model=SaleDetailResponse, status_code=status.HTTP_201_CREATED)
def record_new_sale(
    sale_in: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SaleDetailResponse:
    """
    Creates a new digital sale transaction with multi-product lines,
    FS Number, optional paper receipt reference, and optional initial payment.
    Atomic transaction with collision-safe sequential sale number generation.
    """
    return create_sale(db=db, sale_in=sale_in, current_user=current_user)


@router.get("", response_model=SaleListResponse)
def get_sales_ledger(
    search: Optional[str] = Query(None, description="Search by sale number, FS No, customer name, company, phone, receipt #, or item description"),
    payment_status: Optional[str] = Query(None, description="Filter by status ('paid', 'partial', 'credit', 'voided')"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method ('cash', 'bank_transfer', etc.)"),
    transaction_status: Optional[str] = Query(None, description="Filter by transaction status ('all', 'active', 'voided')"),
    has_balance: Optional[bool] = Query(None, description="Filter transactions with outstanding balance > 0 (True) or fully settled (False)"),
    customer_id: Optional[uuid.UUID] = Query(None, description="Filter by customer ID"),
    created_by: Optional[uuid.UUID] = Query(None, description="Filter by employee ID"),
    date_from: Optional[datetime] = Query(None, description="Filter sales after date"),
    date_to: Optional[datetime] = Query(None, description="Filter sales before date"),
    sort_by: str = Query("sale_date", description="Field to sort by ('sale_date', 'sale_number', 'fs_number', 'customer_name', 'grand_total', 'outstanding_balance')"),
    sort_order: str = Query("desc", description="Sort direction ('asc', 'desc')"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(15, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SaleListResponse:
    """
    Retrieves a paginated list of sales from the digital sales ledger.
    Supports multi-field search, multi-criteria financial filters, and deterministic sorting.
    """
    return list_sales(
        db=db,
        search=search,
        payment_status=payment_status,
        payment_method=payment_method,
        transaction_status=transaction_status,
        has_balance=has_balance,
        customer_id=customer_id,
        created_by=created_by,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.get("/{sale_id}", response_model=SaleDetailResponse)
def get_sale_details(
    sale_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SaleDetailResponse:
    """
    Retrieves full details for a sale transaction, including line items,
    payments history, customer, and creator attribution.
    """
    return get_sale_by_id(db=db, sale_id=sale_id)


@router.put("/{sale_id}", response_model=SaleDetailResponse)
def correct_sale_details(
    sale_id: uuid.UUID,
    correction_in: SaleCorrectionInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SaleDetailResponse:
    """
    Corrects transaction metadata (FS No., paper receipt number, notes).
    Mandates a logged correction reason and preserves prior values in the audit trail.
    """
    return correct_sale(
        db=db,
        sale_id=sale_id,
        correction_in=correction_in,
        current_user=current_user,
    )


@router.post("/{sale_id}/void", response_model=SaleDetailResponse)
def void_sale_transaction(
    sale_id: uuid.UUID,
    void_in: SaleVoidInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SaleDetailResponse:
    """
    Voids a sales transaction with mandatory justification.
    The transaction remains visible in the ledger marked VOIDED, and is excluded from active revenue.
    """
    return void_sale(
        db=db,
        sale_id=sale_id,
        void_in=void_in,
        current_user=current_user,
    )


@router.post("/{sale_id}/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def add_sale_payment(
    sale_id: uuid.UUID,
    payment_in: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaymentResponse:
    """
    Records an additional payment (Cash, Bank Transfer) against an outstanding sale.
    Validates against outstanding balance and prevents overpayment.
    """
    return record_payment_for_sale(
        db=db,
        sale_id=sale_id,
        payment_in=payment_in,
        current_user=current_user,
    )


@router.get("/{sale_id}/payments", response_model=List[PaymentResponse])
def get_sale_payments(
    sale_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[PaymentResponse]:
    """
    Returns the complete payment history for a given sale.
    """
    sale_detail = get_sale_by_id(db=db, sale_id=sale_id)
    return sale_detail.payments

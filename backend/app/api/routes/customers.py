import uuid
from decimal import Decimal
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.customer import Customer
from backend.app.models.user import User
from backend.app.schemas.customer import (
    CustomerCreate,
    CustomerFinancialSummary,
    CustomerListResponse,
    CustomerOutstandingResponse,
    CustomerResponse,
    CustomerStatusUpdate,
    CustomerUpdate,
    DuplicateCheckResponse,
)
from backend.app.services.customer_service import (
    check_duplicate_customers,
    compute_customer_financials,
    create_customer as service_create_customer,
    get_customer_payments,
    get_customer_sales,
    get_customers_outstanding,
    list_customers,
    update_customer as service_update_customer,
    update_customer_status as service_update_customer_status,
)

router = APIRouter(prefix="/customers", tags=["Customer Management"])

INITIAL_CUSTOMERS = [
    {
        "name": "Abebe Bekele",
        "company_name": "Abyssinia Graphic Design & Print",
        "phone": "+251 91 122 3344",
        "alt_phone": "+251 92 122 3345",
        "email": "info@abyssiniaprint.et",
        "address": "Bole Sub-City, Next to Edna Mall, Addis Ababa",
        "notes": "Large commercial printing client with monthly credit orders",
    },
    {
        "name": "Sara Haile",
        "company_name": "Bole Stationery & Supplies",
        "phone": "+251 91 233 4455",
        "alt_phone": None,
        "email": "orders@bolestationery.com",
        "address": "Bole Road, Around Edna Mall, Addis Ababa",
        "notes": "Retail stationery distributor",
    },
    {
        "name": "Dawit Tesfaye",
        "company_name": "Zemen Advertising Agency",
        "phone": "+251 91 344 5566",
        "alt_phone": "+251 11 551 2233",
        "email": "production@zemenadvertising.com",
        "address": "Kirkos Sub-City, Mexico Square, Addis Ababa",
        "notes": "Outdoor signage and vinyl banner printing partner",
    },
    {
        "name": "Hiwot Tadesse",
        "company_name": "Finfinne Publishing House",
        "phone": "+251 91 455 6677",
        "alt_phone": None,
        "email": "finance@finfinnepublishing.et",
        "address": "Arada Sub-City, Piazza, Addis Ababa",
        "notes": "Book and magazine publishing offset paper orders",
    },
]


def ensure_seed_customers(db: Session) -> None:
    count = db.scalar(select(Customer.id).limit(1))
    if count is None:
        for c in INITIAL_CUSTOMERS:
            cust = Customer(
                id=uuid.uuid4(),
                name=c["name"],
                company_name=c["company_name"],
                phone=c["phone"],
                alt_phone=c["alt_phone"],
                email=c["email"],
                address=c["address"],
                notes=c["notes"],
                is_active=True,
            )
            db.add(cust)
        db.commit()


@router.get("", response_model=CustomerListResponse)
def get_customer_directory(
    search: Optional[str] = Query(None, description="Search by customer name, company name, phone, or email"),
    status: Optional[str] = Query(None, description="Filter by status ('active', 'inactive', 'all')"),
    sort_by: str = Query("name", description="Sort by 'name', 'company_name', 'created_at', 'outstanding_balance', 'total_purchases'"),
    sort_order: str = Query("asc", description="Sort direction ('asc', 'desc')"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(15, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CustomerListResponse:
    """
    Retrieves the paginated customer directory with search, status filtering, and calculated financial totals.
    """
    ensure_seed_customers(db)
    return list_customers(
        db=db,
        search=search,
        status_filter=status,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.get("/search", response_model=List[CustomerResponse])
def search_customers(
    q: str = Query("", description="Search term for customer name, company, or phone"),
    active_only: bool = Query(True, description="Filter only active customers for counter sales"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[CustomerResponse]:
    """
    Fast typeahead customer search endpoint for New Sale counter terminal.
    Guards against inactive customers being selected for transactions.
    """
    ensure_seed_customers(db)

    query = select(Customer)
    if active_only:
        query = query.where(Customer.is_active.is_(True))

    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(Customer.name).like(term),
                func.lower(Customer.company_name).like(term),
                func.lower(Customer.phone).like(term),
            )
        )
    query = query.order_by(Customer.name.asc()).limit(limit)
    return list(db.scalars(query).all())


@router.get("/check-duplicate", response_model=DuplicateCheckResponse)
def check_duplicate_endpoint(
    name: str = Query(..., description="Customer full name"),
    company_name: Optional[str] = Query(None, description="Company name"),
    phone: Optional[str] = Query(None, description="Phone number"),
    email: Optional[str] = Query(None, description="Email address"),
    exclude_id: Optional[uuid.UUID] = Query(None, description="Current customer ID if editing"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DuplicateCheckResponse:
    """
    Live pre-submission duplicate check endpoint used by the frontend to provide immediate duplicate warnings.
    """
    is_dup, warning_msg, matches = check_duplicate_customers(
        db=db,
        name=name,
        company_name=company_name,
        phone=phone,
        email=email,
        exclude_id=exclude_id,
    )
    return DuplicateCheckResponse(
        is_duplicate=is_dup,
        warning_message=warning_msg,
        matches=[CustomerResponse.model_validate(m) for m in matches],
    )


@router.get("/outstanding", response_model=CustomerOutstandingResponse)
def get_outstanding_receivables(
    search: Optional[str] = Query(None, description="Search by customer name, company, or phone"),
    aging_category: Optional[str] = Query(None, description="Filter by age ('0-30', '31-60', '61-90', '90+', 'all')"),
    min_balance: Decimal = Query(Decimal("0.01"), ge=0, description="Minimum outstanding balance"),
    max_balance: Optional[Decimal] = Query(None, ge=0, description="Maximum outstanding balance"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(15, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CustomerOutstandingResponse:
    """
    Retrieves customers with outstanding balances, categorized by aging periods
    (0-30 days, 31-60 days, 61-90 days, >90 days) in Addis Ababa timezone.
    """
    ensure_seed_customers(db)
    return get_customers_outstanding(
        db=db,
        search=search,
        aging_category=aging_category,
        min_balance=min_balance,
        max_balance=max_balance,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer_endpoint(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CustomerResponse:
    """
    Creates a new customer profile. Validates duplicates and records audit log.
    If possible duplicate is detected and confirm_duplicate is false, returns 409 Conflict with warning.
    """
    return service_create_customer(
        db=db,
        customer_in=customer_in,
        current_user=current_user,
    )


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer_profile(
    customer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CustomerResponse:
    """
    Retrieves complete customer profile information.
    """
    customer = db.scalar(select(Customer).where(Customer.id == customer_id))
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found",
        )
    return CustomerResponse.model_validate(customer)


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer_endpoint(
    customer_id: uuid.UUID,
    customer_in: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CustomerResponse:
    """
    Updates customer profile details and records full audit trail.
    """
    return service_update_customer(
        db=db,
        customer_id=customer_id,
        customer_in=customer_in,
        current_user=current_user,
    )


@router.patch("/{customer_id}/status", response_model=CustomerResponse)
def toggle_customer_status(
    customer_id: uuid.UUID,
    status_in: CustomerStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CustomerResponse:
    """
    Activates or deactivates a customer account with audit logging.
    """
    return service_update_customer_status(
        db=db,
        customer_id=customer_id,
        status_in=status_in,
        current_user=current_user,
    )


@router.get("/{customer_id}/financial-summary", response_model=CustomerFinancialSummary)
def get_customer_financial_summary_endpoint(
    customer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CustomerFinancialSummary:
    """
    Returns exact real-time financial metrics for a customer calculated from active transactions.
    """
    return compute_customer_financials(db=db, customer_id=customer_id)


@router.get("/{customer_id}/sales")
def get_customer_sales_history_endpoint(
    customer_id: uuid.UUID,
    search: Optional[str] = Query(None, description="Search sale #, FS #, or paper receipt #"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(15, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Returns paginated transaction history for a customer with FS No, paper receipt #, and void status.
    """
    return get_customer_sales(
        db=db,
        customer_id=customer_id,
        search=search,
        payment_status=payment_status,
        page=page,
        page_size=page_size,
    )


@router.get("/{customer_id}/payments")
def get_customer_payment_history_endpoint(
    customer_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Returns chronological payment history for a customer's transactions with separate payment dates and bank refs.
    """
    return get_customer_payments(
        db=db,
        customer_id=customer_id,
        page=page,
        page_size=page_size,
    )

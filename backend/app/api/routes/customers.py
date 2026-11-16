import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.customer import Customer
from backend.app.models.user import User
from backend.app.schemas.customer import CustomerCreate, CustomerResponse

router = APIRouter(prefix="/customers", tags=["Customer Management"])

INITIAL_CUSTOMERS = [
    {
        "name": "Abyssinia Graphic Design & Print",
        "phone": "+251 91 122 3344",
        "address": "Bole Sub-City, Addis Ababa",
    },
    {
        "name": "Bole Stationery & Supplies",
        "phone": "+251 91 233 4455",
        "address": "Bole Road, Around Edna Mall, Addis Ababa",
    },
    {
        "name": "Zemen Advertising Agency",
        "phone": "+251 91 344 5566",
        "address": "Kirkos Sub-City, Mexico Square, Addis Ababa",
    },
    {
        "name": "Finfinne Publishing House",
        "phone": "+251 91 455 6677",
        "address": "Arada Sub-City, Piazza, Addis Ababa",
    },
]


def ensure_seed_customers(db: Session) -> None:
    count = db.scalar(select(Customer.id).limit(1))
    if count is None:
        for c in INITIAL_CUSTOMERS:
            cust = Customer(
                id=uuid.uuid4(),
                name=c["name"],
                phone=c["phone"],
                address=c["address"],
            )
            db.add(cust)
        db.commit()


@router.get("", response_model=List[CustomerResponse])
def get_customers(
    search: Optional[str] = Query(None, description="Search term for name or phone"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[CustomerResponse]:
    """
    List customers with optional search term, auto-seeding if empty.
    """
    ensure_seed_customers(db)

    query = select(Customer)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Customer.name.ilike(term),
                Customer.phone.ilike(term),
                Customer.address.ilike(term),
            )
        )
    query = query.order_by(Customer.name.asc()).limit(limit)
    return list(db.scalars(query).all())


@router.get("/search", response_model=List[CustomerResponse])
def search_customers(
    q: str = Query("", description="Search term for customer name or phone"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[CustomerResponse]:
    """
    Typeahead customer search endpoint for New Sale screen.
    """
    ensure_seed_customers(db)

    query = select(Customer)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.where(
            or_(
                Customer.name.ilike(term),
                Customer.phone.ilike(term),
            )
        )
    query = query.order_by(Customer.name.asc()).limit(limit)
    return list(db.scalars(query).all())


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CustomerResponse:
    """
    Create a new customer profile.
    """
    customer = Customer(
        id=uuid.uuid4(),
        name=customer_in.name.strip(),
        phone=customer_in.phone.strip() if customer_in.phone else None,
        address=customer_in.address.strip() if customer_in.address else None,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

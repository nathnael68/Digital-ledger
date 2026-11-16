import uuid
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.product import Product
from backend.app.models.user import User
from backend.app.schemas.product import ProductCreate, ProductResponse

router = APIRouter(prefix="/products", tags=["Product Catalog"])

INITIAL_PRINTING_PRODUCTS = [
    {
        "name": "A4 Photocopy Paper 80gsm (Box of 5 Reams)",
        "description": "High-speed multi-purpose printing paper, 80gsm, 500 sheets/ream",
        "default_price": Decimal("2450.00"),
        "unit": "box",
    },
    {
        "name": "Thermal Receipt Paper Roll 80mm x 80mm",
        "description": "BPA-free thermal paper rolls for POS and cash registers (Pack of 10)",
        "default_price": Decimal("850.00"),
        "unit": "pack",
    },
    {
        "name": "Glossy Photo Paper A4 220gsm (100 Sheets)",
        "description": "Waterproof cast-coated high gloss photo paper",
        "default_price": Decimal("980.00"),
        "unit": "pack",
    },
    {
        "name": "Vinyl Sticker Paper White Glossy (1 Roll 50m)",
        "description": "Self-adhesive glossy white PVC vinyl roll for indoor/outdoor digital printing",
        "default_price": Decimal("5200.00"),
        "unit": "roll",
    },
    {
        "name": "Offset Process Ink Cyan (1 kg Can)",
        "description": "High-pigment fast-drying offset printing ink",
        "default_price": Decimal("1800.00"),
        "unit": "can",
    },
    {
        "name": "Heavy Duty Double A3 Paper 80gsm (Ream)",
        "description": "Architectural and graphic drafting paper ream (500 sheets)",
        "default_price": Decimal("1250.00"),
        "unit": "ream",
    },
]


def ensure_seed_products(db: Session) -> None:
    count = db.scalar(select(Product.id).limit(1))
    if count is None:
        for p in INITIAL_PRINTING_PRODUCTS:
            prod = Product(
                id=uuid.uuid4(),
                name=p["name"],
                description=p["description"],
                default_price=p["default_price"],
                unit=p["unit"],
                is_active=True,
            )
            db.add(prod)
        db.commit()


@router.get("", response_model=List[ProductResponse])
def get_products(
    search: Optional[str] = Query(None, description="Search term for name or description"),
    active_only: bool = Query(True, description="Filter only active products"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[ProductResponse]:
    """
    List products from the catalog, auto-seeding sample items if catalog is currently empty.
    """
    ensure_seed_products(db)

    query = select(Product)
    if active_only:
        query = query.where(Product.is_active.is_(True))

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Product.name.ilike(term),
                Product.description.ilike(term),
            )
        )

    query = query.order_by(Product.name.asc()).limit(limit)
    return list(db.scalars(query).all())


@router.get("/search", response_model=List[ProductResponse])
def search_products(
    q: str = Query("", description="Search term for product lookup"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[ProductResponse]:
    """
    Fast typeahead search endpoint for selecting products during sales creation.
    """
    ensure_seed_products(db)

    query = select(Product).where(Product.is_active.is_(True))
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.where(
            or_(
                Product.name.ilike(term),
                Product.description.ilike(term),
            )
        )
    query = query.order_by(Product.name.asc()).limit(limit)
    return list(db.scalars(query).all())


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductResponse:
    """
    Create a new product in the catalog.
    """
    product = Product(
        id=uuid.uuid4(),
        name=product_in.name.strip(),
        description=product_in.description.strip() if product_in.description else None,
        default_price=product_in.default_price,
        unit=product_in.unit.strip().lower(),
        is_active=product_in.is_active,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

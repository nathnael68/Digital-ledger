import uuid
from decimal import Decimal
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, Boolean, DateTime, Numeric, Uuid, func, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    default_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    unit: Mapped[str] = mapped_column(String(30), default="pcs", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("default_price >= 0", name="check_product_price_non_negative"),
    )

    # Relationships
    sale_items: Mapped[List["SaleItem"]] = relationship(
        "SaleItem", back_populates="product"
    )

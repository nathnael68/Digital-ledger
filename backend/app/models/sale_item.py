import uuid
from decimal import Decimal
from typing import Optional
from sqlalchemy import (
    String,
    Numeric,
    Uuid,
    ForeignKey,
    CheckConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base


class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sale_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    description_snapshot: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(12, 3), nullable=False
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    line_subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )

    __table_args__ = (
        CheckConstraint("quantity > 0", name="check_sale_item_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="check_sale_item_unit_price_non_negative"),
        CheckConstraint("line_subtotal >= 0", name="check_sale_item_subtotal_non_negative"),
    )

    # Relationships
    sale: Mapped["Sale"] = relationship("Sale", back_populates="items")
    product: Mapped[Optional["Product"]] = relationship(
        "Product", back_populates="sale_items"
    )

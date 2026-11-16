import uuid
from decimal import Decimal
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Numeric,
    Uuid,
    ForeignKey,
    CheckConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sale_number: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    customer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    sale_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    discount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    grand_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=Decimal("0.00"), nullable=False
    )
    paper_receipt_number: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True
    )
    fs_number: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True
    )
    idempotency_key: Mapped[Optional[str]] = mapped_column(
        String(100), unique=True, index=True, nullable=True
    )
    payment_status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False, index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Attribution
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Soft-voiding support
    voided_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    voided_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    void_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="check_sale_subtotal_non_negative"),
        CheckConstraint("discount >= 0", name="check_sale_discount_non_negative"),
        CheckConstraint("grand_total >= 0", name="check_sale_grand_total_non_negative"),
    )

    # Relationships
    customer: Mapped[Optional["Customer"]] = relationship(
        "Customer", back_populates="sales"
    )
    creator: Mapped["User"] = relationship(
        "User", foreign_keys=[created_by], back_populates="created_sales"
    )
    voider: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[voided_by], back_populates="voided_sales"
    )
    items: Mapped[List["SaleItem"]] = relationship(
        "SaleItem", back_populates="sale", cascade="all, delete-orphan"
    )
    payments: Mapped[List["Payment"]] = relationship(
        "Payment", back_populates="sale", cascade="all, delete-orphan"
    )

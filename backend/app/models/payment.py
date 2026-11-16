import uuid
from decimal import Decimal
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String,
    DateTime,
    Numeric,
    Uuid,
    ForeignKey,
    CheckConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sale_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("sales.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False
    )
    payment_method: Mapped[str] = mapped_column(
        String(30), nullable=False, index=True
    )
    payment_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    reference: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True
    )
    idempotency_key: Mapped[Optional[str]] = mapped_column(
        String(100), unique=True, index=True, nullable=True
    )
    recorded_by: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        CheckConstraint("amount > 0", name="check_payment_amount_positive"),
    )

    # Relationships
    sale: Mapped["Sale"] = relationship("Sale", back_populates="payments")
    recorder: Mapped["User"] = relationship(
        "User", foreign_keys=[recorded_by], back_populates="recorded_payments"
    )

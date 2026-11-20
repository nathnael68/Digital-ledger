import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

PaymentMethodType = Literal["cash", "bank_transfer", "telebirr", "cbe_birr", "credit"]


class SaleItemCreate(BaseModel):
    product_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Decimal = Field(..., gt=0)
    unit: str = Field("pcs", min_length=1, max_length=30)
    unit_price: Decimal = Field(..., ge=0)

    @model_validator(mode="after")
    def validate_item_description(self):
        desc = (self.description or "").strip()
        name = (self.product_name or "").strip()
        final_desc = desc or name
        if not final_desc:
            raise ValueError("Item description or product_name is required")
        self.description = final_desc
        return self


class SaleItemResponse(BaseModel):
    id: uuid.UUID
    sale_id: uuid.UUID
    product_id: Optional[uuid.UUID] = None
    description_snapshot: str
    unit: str
    quantity: Decimal
    unit_price: Decimal
    line_subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class SalePaymentInput(BaseModel):
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethodType = "cash"
    reference: Optional[str] = Field(None, max_length=100)
    idempotency_key: Optional[str] = Field(None, max_length=100)


class SaleCreate(BaseModel):
    customer_id: Optional[uuid.UUID] = None
    fs_number: str = Field(..., min_length=1, max_length=100, description="Fiscal Customs Reference")
    paper_receipt_number: Optional[str] = Field(None, max_length=100)
    buyer_tin: Optional[str] = Field(None, max_length=50, description="Buyer Taxpayer Identification Number")
    discount: Decimal = Field(Decimal("0.00"), ge=0)
    vat_rate: Optional[Decimal] = Field(None, ge=0, le=1, description="VAT rate applied, e.g. 0.15 for 15% Ethiopian VAT")
    notes: Optional[str] = None
    items: List[SaleItemCreate] = Field(..., min_length=1)
    payment: Optional[SalePaymentInput] = None
    initial_payment: Optional[SalePaymentInput] = None
    idempotency_key: Optional[str] = Field(None, max_length=100)

    @field_validator("fs_number")
    @classmethod
    def validate_fs_number(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("FS Number (Fiscal Reference) is mandatory")
        return v

    @model_validator(mode="after")
    def resolve_payment(self):
        if self.payment is None and self.initial_payment is not None:
            self.payment = self.initial_payment
        return self


class SaleCorrectionInput(BaseModel):
    fs_number: Optional[str] = Field(None, min_length=1, max_length=100)
    paper_receipt_number: Optional[str] = Field(None, max_length=100)
    buyer_tin: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None
    reason: str = Field(..., min_length=3, max_length=500, description="Mandatory reason for audit trail")

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("A clear reason (at least 3 characters) is required for audit history")
        return v


class SaleVoidInput(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500, description="Mandatory reason for voiding")

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("A clear void justification is required")
        return v


class PaymentCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethodType = "cash"
    reference: Optional[str] = Field(None, max_length=100)
    payment_date: Optional[datetime] = None
    idempotency_key: Optional[str] = Field(None, max_length=100)


class PaymentResponse(BaseModel):
    id: uuid.UUID
    sale_id: uuid.UUID
    amount: Decimal
    payment_method: str
    payment_date: datetime
    reference: Optional[str] = None
    recorded_by: uuid.UUID
    recorded_by_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SaleDetailResponse(BaseModel):
    id: uuid.UUID
    sale_number: str
    fs_number: Optional[str] = None
    paper_receipt_number: Optional[str] = None
    buyer_tin: Optional[str] = None
    customer_id: Optional[uuid.UUID] = None
    customer_name: Optional[str] = None
    customer_company_name: Optional[str] = None
    customer_tin: Optional[str] = None
    customer_phone: Optional[str] = None
    sale_date: datetime
    subtotal: Decimal
    discount: Decimal
    vat_rate: Decimal = Decimal("0.00")
    vat_amount: Decimal = Decimal("0.00")
    grand_total: Decimal
    total_paid: Decimal
    outstanding_balance: Decimal
    amount_paid: Optional[Decimal] = None
    balance_due: Optional[Decimal] = None
    paper_receipt_number: Optional[str] = None
    payment_status: str
    notes: Optional[str] = None
    created_by: uuid.UUID
    created_by_name: str
    created_at: datetime
    updated_at: datetime
    voided_at: Optional[datetime] = None
    voided_by: Optional[uuid.UUID] = None
    voided_by_name: Optional[str] = None
    void_reason: Optional[str] = None
    items: List[SaleItemResponse] = []
    payments: List[PaymentResponse] = []

    model_config = ConfigDict(from_attributes=True)


class SaleListResponse(BaseModel):
    items: List[SaleDetailResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

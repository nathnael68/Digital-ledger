import re
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


def validate_phone_number(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    cleaned = v.strip()
    if not cleaned:
        return None
    # Basic phone format validation: must contain at least 7 digits, allowed characters: +, -, (), spaces, digits
    if not re.match(r"^[+]?[\d\s\-\(\)]{7,30}$", cleaned):
        raise ValueError(
            "Phone number must contain between 7 and 30 characters and use valid phone format (e.g. +251 91 123 4567 or 0911234567)"
        )
    return cleaned


def validate_email_address(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    cleaned = v.strip()
    if not cleaned:
        return None
    # Standard email regex pattern
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", cleaned):
        raise ValueError("Invalid email address format (e.g. info@clientcompany.com)")
    return cleaned.lower()


class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, description="Customer or primary contact person name")
    company_name: Optional[str] = Field(None, max_length=150, description="Business or organization name")
    tin_number: Optional[str] = Field(None, max_length=50, description="Taxpayer Identification Number (TIN)")
    phone: Optional[str] = Field(None, max_length=50)
    alt_phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=150)
    address: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Customer name must be at least 2 characters long")
        return cleaned

    @field_validator("company_name", "tin_number", "alt_phone", "notes")
    @classmethod
    def clean_optional_strings(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned if cleaned else None

    @field_validator("phone", "alt_phone")
    @classmethod
    def validate_phones(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        return validate_email_address(v)


class CustomerCreate(CustomerBase):
    confirm_duplicate: bool = Field(
        False,
        description="Set to true if user acknowledges duplicate warning and explicitly confirms creating a separate customer account",
    )


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=150)
    company_name: Optional[str] = Field(None, max_length=150)
    tin_number: Optional[str] = Field(None, max_length=50)
    phone: Optional[str] = Field(None, max_length=50)
    alt_phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = Field(None, max_length=150)
    address: Optional[str] = None
    notes: Optional[str] = None
    reason: Optional[str] = Field(
        None,
        description="Reason for updating customer profile details (logged in audit trail)",
    )

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Customer name must be at least 2 characters long")
        return cleaned

    @field_validator("phone", "alt_phone")
    @classmethod
    def validate_phones(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        return validate_email_address(v)


class CustomerStatusUpdate(BaseModel):
    is_active: bool
    reason: Optional[str] = Field(
        None,
        description="Reason for activating or deactivating the customer account",
    )


class CustomerResponse(BaseModel):
    id: uuid.UUID
    name: str
    company_name: Optional[str] = None
    tin_number: Optional[str] = None
    phone: Optional[str] = None
    alt_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerListItem(BaseModel):
    id: uuid.UUID
    name: str
    company_name: Optional[str] = None
    tin_number: Optional[str] = None
    phone: Optional[str] = None
    alt_phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_active: bool
    total_purchases: Decimal
    total_paid: Decimal
    outstanding_balance: Decimal
    active_sales_count: int
    unpaid_sales_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CustomerListResponse(BaseModel):
    items: List[CustomerListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class CustomerFinancialSummary(BaseModel):
    customer_id: uuid.UUID
    customer_name: str
    company_name: Optional[str] = None
    tin_number: Optional[str] = None
    total_sales_revenue: Decimal
    total_payments_received: Decimal
    outstanding_balance: Decimal
    total_sales_count: int
    unpaid_sales_count: int
    partial_sales_count: int
    paid_sales_count: int
    voided_sales_count: int


class CustomerOutstandingItem(BaseModel):
    customer_id: uuid.UUID
    name: str
    company_name: Optional[str] = None
    tin_number: Optional[str] = None
    phone: Optional[str] = None
    alt_phone: Optional[str] = None
    total_sales: Decimal
    total_paid: Decimal
    outstanding_balance: Decimal
    oldest_sale_date: Optional[datetime] = None
    newest_payment_date: Optional[datetime] = None
    unpaid_sales_count: int
    age_0_30_days: Decimal
    age_31_60_days: Decimal
    age_61_90_days: Decimal
    age_over_90_days: Decimal
    primary_aging_category: str


class CustomerOutstandingResponse(BaseModel):
    items: List[CustomerOutstandingItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    total_outstanding_sum: Decimal


class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    warning_message: Optional[str] = None
    matches: List[CustomerResponse] = []

import uuid
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    default_price: Decimal = Field(..., ge=0)
    unit: str = Field("pcs", max_length=30)
    is_active: bool = True


class ProductResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    default_price: Decimal
    unit: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

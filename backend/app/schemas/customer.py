import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None


class CustomerResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

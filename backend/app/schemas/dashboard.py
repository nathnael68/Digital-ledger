import uuid
from decimal import Decimal
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class DashboardSummary(BaseModel):
    today_sales: Decimal
    cash_received: Decimal
    bank_received: Decimal
    credit_sales: Decimal
    outstanding_balance: Decimal
    total_transactions: int

    model_config = ConfigDict(from_attributes=True)


class DailyTrend(BaseModel):
    date: str
    day_label: str
    total_sales: Decimal
    transaction_count: int


class PaymentMethodDistribution(BaseModel):
    method: str
    method_label: str
    total_amount: Decimal
    count: int
    percentage: float


class RecentTransaction(BaseModel):
    id: uuid.UUID
    sale_number: str
    sale_date: datetime
    customer_name: Optional[str] = None
    grand_total: Decimal
    payment_status: str
    paper_receipt_number: Optional[str] = None
    created_by_name: str

    model_config = ConfigDict(from_attributes=True)


class DashboardResponse(BaseModel):
    summary: DashboardSummary
    trend_7_days: List[DailyTrend]
    payment_methods: List[PaymentMethodDistribution]
    recent_transactions: List[RecentTransaction]

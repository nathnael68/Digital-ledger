from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class ReportDateRange(BaseModel):
    start_date: datetime
    end_date: datetime
    period_label: str
    timezone: str = "Africa/Addis_Ababa"


class ComparisonMetric(BaseModel):
    current: Decimal
    previous: Decimal
    delta: Decimal
    percentage_change: Optional[float] = None


class ReportSummaryKPI(BaseModel):
    total_sales_revenue: Decimal = Decimal("0.00")
    cash_collections: Decimal = Decimal("0.00")
    bank_collections: Decimal = Decimal("0.00")
    credit_sales: Decimal = Decimal("0.00")
    current_outstanding_balance: Decimal = Decimal("0.00")
    transaction_count: int = 0
    total_discounts: Decimal = Decimal("0.00")
    voided_sales_count: int = 0
    voided_sales_amount: Decimal = Decimal("0.00")

    # Comparisons against previous period (if applicable)
    revenue_comparison: Optional[ComparisonMetric] = None
    cash_comparison: Optional[ComparisonMetric] = None
    bank_comparison: Optional[ComparisonMetric] = None
    transaction_comparison: Optional[ComparisonMetric] = None


class PeriodSalesTrend(BaseModel):
    date: str
    day_label: str
    sales_revenue: Decimal
    cash_collected: Decimal
    bank_collected: Decimal
    transaction_count: int


class PaymentBreakdownItem(BaseModel):
    method: str
    method_label: str
    total_amount: Decimal
    count: int
    percentage: float


class ReportOverviewResponse(BaseModel):
    date_range: ReportDateRange
    summary: ReportSummaryKPI
    trends: List[PeriodSalesTrend]
    payment_breakdown: List[PaymentBreakdownItem]


class DailyTransactionItem(BaseModel):
    id: UUID
    sale_number: str
    fs_number: Optional[str] = None
    paper_receipt_number: Optional[str] = None
    sale_date: datetime
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    created_by_name: str
    subtotal: Decimal
    discount: Decimal
    grand_total: Decimal
    amount_paid: Decimal
    outstanding_balance: Decimal
    payment_status: str
    is_void: bool = False
    void_reason: Optional[str] = None


class DailySalesReportResponse(BaseModel):
    report_date: str
    summary: ReportSummaryKPI
    transactions: List[DailyTransactionItem]
    voided_transactions: List[DailyTransactionItem]


class CollectionItem(BaseModel):
    id: UUID
    payment_date: datetime
    sale_id: UUID
    sale_number: str
    fs_number: Optional[str] = None
    paper_receipt_number: Optional[str] = None
    customer_name: Optional[str] = None
    amount: Decimal
    payment_method: str
    reference: Optional[str] = None
    recorded_by_name: str


class CollectionReportResponse(BaseModel):
    period_label: str
    total_amount: Decimal
    payment_count: int
    items: List[CollectionItem]


class CreditSaleItem(BaseModel):
    id: UUID
    sale_number: str
    fs_number: Optional[str] = None
    sale_date: datetime
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    grand_total: Decimal
    initial_amount_paid: Decimal
    initial_credit_amount: Decimal
    current_amount_paid: Decimal
    current_outstanding_balance: Decimal
    payment_status: str
    last_payment_date: Optional[datetime] = None
    created_by_name: str


class CreditSalesReportResponse(BaseModel):
    period_label: str
    total_credit_created: Decimal
    total_current_balance: Decimal
    credit_sales_count: int
    items: List[CreditSaleItem]


class EmployeeActivityItem(BaseModel):
    employee_id: UUID
    employee_name: str
    username: str
    role: str
    sales_created_count: int
    sales_revenue: Decimal
    initial_cash_received: Decimal
    initial_bank_received: Decimal
    initial_credit_created: Decimal
    subsequent_payments_count: int
    subsequent_payments_amount: Decimal
    total_collections_recorded: Decimal


class EmployeeActivityReportResponse(BaseModel):
    period_label: str
    items: List[EmployeeActivityItem]


class CustomerReportItem(BaseModel):
    customer_id: UUID
    customer_name: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    total_sales: Decimal
    total_payments: Decimal
    outstanding_balance: Decimal
    transaction_count: int
    last_sale_date: Optional[datetime] = None
    last_payment_date: Optional[datetime] = None


class CustomerReportResponse(BaseModel):
    period_label: str
    total_customers: int
    total_sales: Decimal
    total_payments: Decimal
    total_outstanding: Decimal
    items: List[CustomerReportItem]

export interface ReportDateRange {
  start_date: string;
  end_date: string;
  period_label: string;
  timezone: string;
}

export interface ComparisonMetric {
  current: number | string;
  previous: number | string;
  delta: number | string;
  percentage_change: number | null;
}

export interface ReportSummaryKPI {
  total_sales_revenue: number | string;
  cash_collections: number | string;
  bank_collections: number | string;
  credit_sales: number | string;
  current_outstanding_balance: number | string;
  transaction_count: number;
  total_discounts: number | string;
  voided_sales_count: number;
  voided_sales_amount: number | string;
  revenue_comparison?: ComparisonMetric | null;
  cash_comparison?: ComparisonMetric | null;
  bank_comparison?: ComparisonMetric | null;
  transaction_comparison?: ComparisonMetric | null;
}

export interface PeriodSalesTrend {
  date: string;
  day_label: string;
  sales_revenue: number | string;
  cash_collected: number | string;
  bank_collected: number | string;
  transaction_count: number;
}

export interface PaymentBreakdownItem {
  method: string;
  method_label: string;
  total_amount: number | string;
  count: number;
  percentage: number;
}

export interface ReportOverviewResponse {
  date_range: ReportDateRange;
  summary: ReportSummaryKPI;
  trends: PeriodSalesTrend[];
  payment_breakdown: PaymentBreakdownItem[];
}

export interface DailyTransactionItem {
  id: string;
  sale_number: string;
  fs_number?: string | null;
  paper_receipt_number?: string | null;
  sale_date: string;
  customer_id?: string | null;
  customer_name?: string | null;
  created_by_name: string;
  subtotal: number | string;
  discount: number | string;
  grand_total: number | string;
  amount_paid: number | string;
  outstanding_balance: number | string;
  payment_status: 'paid' | 'partial' | 'credit' | 'voided';
  is_void: boolean;
  void_reason?: string | null;
}

export interface DailySalesReportResponse {
  report_date: string;
  summary: ReportSummaryKPI;
  transactions: DailyTransactionItem[];
  voided_transactions: DailyTransactionItem[];
}

export interface CollectionItem {
  id: string;
  payment_date: string;
  sale_id: string;
  sale_number: string;
  fs_number?: string | null;
  paper_receipt_number?: string | null;
  customer_name?: string | null;
  amount: number | string;
  payment_method: string;
  reference?: string | null;
  recorded_by_name: string;
}

export interface CollectionReportResponse {
  period_label: string;
  total_amount: number | string;
  payment_count: number;
  items: CollectionItem[];
}

export interface CreditSaleItem {
  id: string;
  sale_number: string;
  fs_number?: string | null;
  sale_date: string;
  customer_id?: string | null;
  customer_name?: string | null;
  grand_total: number | string;
  initial_amount_paid: number | string;
  initial_credit_amount: number | string;
  current_amount_paid: number | string;
  current_outstanding_balance: number | string;
  payment_status: string;
  last_payment_date?: string | null;
  created_by_name: string;
}

export interface CreditSalesReportResponse {
  period_label: string;
  total_credit_created: number | string;
  total_current_balance: number | string;
  credit_sales_count: number;
  items: CreditSaleItem[];
}

export interface EmployeeActivityItem {
  employee_id: string;
  employee_name: string;
  username: string;
  role: string;
  sales_created_count: number;
  sales_revenue: number | string;
  initial_cash_received: number | string;
  initial_bank_received: number | string;
  initial_credit_created: number | string;
  subsequent_payments_count: number;
  subsequent_payments_amount: number | string;
  total_collections_recorded: number | string;
}

export interface EmployeeActivityReportResponse {
  period_label: string;
  items: EmployeeActivityItem[];
}

export interface CustomerReportItem {
  customer_id: string;
  customer_name: string;
  company_name?: string | null;
  phone?: string | null;
  total_sales: number | string;
  total_payments: number | string;
  outstanding_balance: number | string;
  transaction_count: number;
  last_sale_date?: string | null;
  last_payment_date?: string | null;
}

export interface CustomerReportResponse {
  period_label: string;
  total_customers: number;
  total_sales: number | string;
  total_payments: number | string;
  total_outstanding: number | string;
  items: CustomerReportItem[];
}

export type ReportPeriodOption =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'custom';

export type ReportType =
  | 'daily_sales'
  | 'weekly_sales'
  | 'monthly_sales'
  | 'custom_range'
  | 'cash_collections'
  | 'bank_collections'
  | 'credit_sales'
  | 'outstanding_balances'
  | 'employee_activity'
  | 'customer_sales';

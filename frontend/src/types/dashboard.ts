export interface DashboardSummary {
  today_sales: string | number;
  cash_received: string | number;
  bank_received: string | number;
  credit_sales: string | number;
  outstanding_balance: string | number;
  total_transactions: number;
}

export interface DailyTrend {
  date: string;
  day_label: string;
  total_sales: string | number;
  transaction_count: number;
}

export interface PaymentMethodDistribution {
  method: string;
  method_label: string;
  total_amount: string | number;
  count: number;
  percentage: number;
}

export interface RecentTransaction {
  id: string;
  sale_number: string;
  sale_date: string;
  customer_name?: string | null;
  grand_total: string | number;
  payment_status: string;
  paper_receipt_number?: string | null;
  created_by_name: string;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  trend_7_days: DailyTrend[];
  payment_methods: PaymentMethodDistribution[];
  recent_transactions: RecentTransaction[];
}

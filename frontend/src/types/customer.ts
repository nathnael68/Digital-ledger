export interface Customer {
  id: string;
  name: string;
  company_name?: string | null;
  tin_number?: string | null;
  phone?: string | null;
  alt_phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerCreateInput {
  name: string;
  company_name?: string;
  tin_number?: string;
  phone?: string;
  alt_phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  confirm_duplicate?: boolean;
}

export interface CustomerUpdateInput {
  name?: string;
  company_name?: string;
  tin_number?: string;
  phone?: string;
  alt_phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  reason?: string;
}

export interface CustomerStatusUpdateInput {
  is_active: boolean;
  reason?: string;
}

export interface CustomerListItem extends Customer {
  total_purchases: number | string;
  total_paid: number | string;
  outstanding_balance: number | string;
  active_sales_count: number;
}

export interface CustomerListResponse {
  items: CustomerListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CustomerFinancialSummary {
  customer_id: string;
  customer_name: string;
  company_name?: string | null;
  tin_number?: string | null;
  phone?: string | null;
  total_sales_amount: number | string;
  total_amount_paid: number | string;
  current_outstanding_balance: number | string;
  total_sales_count: number;
  unpaid_sales_count: number;
  partial_sales_count: number;
}

export interface CustomerOutstandingItem {
  id: string;
  name: string;
  company_name?: string | null;
  tin_number?: string | null;
  phone?: string | null;
  alt_phone?: string | null;
  total_purchases: number | string;
  total_paid: number | string;
  outstanding_balance: number | string;
  aging_0_30: number | string;
  aging_31_60: number | string;
  aging_61_90: number | string;
  aging_over_90: number | string;
  oldest_unpaid_sale_date?: string | null;
  last_payment_date?: string | null;
  unpaid_sales_count: number;
}

export interface CustomerOutstandingResponse {
  items: CustomerOutstandingItem[];
  total: number;
  total_receivables: number | string;
}

export interface DuplicateCheckResult {
  possible_duplicates: Customer[];
  has_matches: boolean;
  message: string;
}

export interface CustomerQueryParams {
  search?: string;
  is_active?: boolean;
  sort_by?: 'name' | 'company_name' | 'created_at' | 'outstanding_balance' | 'total_purchases';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface OutstandingQueryParams {
  aging_bucket?: 'all' | '0_30' | '31_60' | '61_90' | 'over_90';
  min_balance?: number;
  max_balance?: number;
  search?: string;
  sort_by?: 'outstanding_balance' | 'name' | 'company_name' | 'oldest_unpaid';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

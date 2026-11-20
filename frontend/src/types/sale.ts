export interface Product {
  id: string;
  name: string;
  description?: string | null;
  default_price: number | string;
  unit: string;
  is_active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  company_name?: string | null;
  tin_number?: string | null;
  phone?: string | null;
  address?: string | null;
  is_active?: boolean;
}

export interface SaleItemInput {
  product_id?: string | null;
  product_name: string;
  unit: string;
  quantity: number | string;
  unit_price: number | string;
  line_subtotal?: number | string;
}

export interface PaymentInput {
  amount: number | string;
  payment_method: 'cash' | 'bank_transfer' | 'telebirr' | 'cbe_birr' | 'credit';
  reference?: string;
  idempotency_key?: string;
}

export interface SaleCreatePayload {
  customer_id?: string | null;
  fs_number: string;
  paper_receipt_number?: string;
  buyer_tin?: string;
  discount?: number | string;
  vat_rate?: number | string;
  notes?: string;
  items: {
    product_id?: string | null;
    product_name?: string;
    description?: string;
    unit: string;
    quantity: number | string;
    unit_price: number | string;
  }[];
  payment?: PaymentInput;
  initial_payment?: PaymentInput;
  idempotency_key?: string;
}

export interface SaleItemResponse {
  id: string;
  sale_id: string;
  product_id?: string | null;
  description_snapshot: string;
  unit: string;
  quantity: number | string;
  unit_price: number | string;
  line_subtotal: number | string;
}

export interface PaymentRecord {
  id: string;
  sale_id: string;
  amount: number | string;
  payment_method: string;
  payment_date: string;
  reference?: string | null;
  recorded_by: string;
  recorded_by_name: string;
  created_at: string;
}

export interface SaleDetail {
  id: string;
  sale_number: string;
  fs_number?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_company_name?: string | null;
  customer_phone?: string | null;
  sale_date: string;
  subtotal: number | string;
  discount: number | string;
  vat_rate?: number | string;
  vat_amount?: number | string;
  grand_total: number | string;
  total_paid: number | string;
  outstanding_balance: number | string;
  amount_paid?: number | string;
  balance_due?: number | string;
  paper_receipt_number?: string | null;
  buyer_tin?: string | null;
  payment_status: 'paid' | 'partial' | 'credit' | 'voided';
  notes?: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  voided_at?: string | null;
  voided_by?: string | null;
  voided_by_name?: string | null;
  void_reason?: string | null;
  customer_tin?: string | null;
  items: SaleItemResponse[];
  payments: PaymentRecord[];
}

export interface SaleListResponse {
  items: SaleDetail[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SaleCorrectionPayload {
  fs_number?: string;
  paper_receipt_number?: string;
  buyer_tin?: string;
  notes?: string;
  reason: string;
}

export interface SaleVoidPayload {
  reason: string;
}

export interface SaleQueryParams {
  search?: string;
  payment_status?: string;
  payment_method?: string;
  customer_id?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  transaction_status?: 'active' | 'voided' | 'all';
  has_balance?: boolean;
  sort_by?: 'sale_date' | 'sale_number' | 'fs_number' | 'customer_name' | 'grand_total' | 'outstanding_balance';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

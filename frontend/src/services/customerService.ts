import { apiClient } from './api';
import {
  Customer,
  CustomerCreateInput,
  CustomerUpdateInput,
  CustomerStatusUpdateInput,
  CustomerListResponse,
  CustomerQueryParams,
  CustomerFinancialSummary,
  CustomerOutstandingResponse,
  OutstandingQueryParams,
  DuplicateCheckResult,
} from '../types/customer';
import { SaleListResponse } from '../types/sale';

export const customerService = {
  /**
   * Fetch paginated list of customers with search, status filter, and sorting.
   */
  async getCustomers(params?: CustomerQueryParams): Promise<CustomerListResponse> {
    const res = await apiClient.get<CustomerListResponse>('/customers', {
      params,
    });
    return res.data;
  },

  /**
   * Search active customers by name, company, or phone for typeaheads.
   */
  async searchCustomers(query: string = ''): Promise<Customer[]> {
    const res = await apiClient.get<Customer[]>('/customers/search', {
      params: { q: query },
    });
    return res.data;
  },

  /**
   * Check for possible duplicate customers before creation.
   */
  async checkDuplicate(params: {
    name?: string;
    company_name?: string;
    phone?: string;
    email?: string;
    tin_number?: string;
  }): Promise<DuplicateCheckResult> {
    const res = await apiClient.get<DuplicateCheckResult>('/customers/check-duplicate', {
      params,
    });
    return res.data;
  },

  /**
   * Create a new customer record.
   */
  async createCustomer(data: CustomerCreateInput): Promise<Customer> {
    const res = await apiClient.post<Customer>('/customers', data);
    return res.data;
  },

  /**
   * Get single customer by ID.
   */
  async getCustomerById(id: string): Promise<Customer> {
    const res = await apiClient.get<Customer>(`/customers/${id}`);
    return res.data;
  },

  /**
   * Update an existing customer profile with audit reason.
   */
  async updateCustomer(id: string, data: CustomerUpdateInput): Promise<Customer> {
    const res = await apiClient.put<Customer>(`/customers/${id}`, data);
    return res.data;
  },

  /**
   * Toggle customer active/inactive status.
   */
  async updateStatus(id: string, data: CustomerStatusUpdateInput): Promise<Customer> {
    const res = await apiClient.patch<Customer>(`/customers/${id}/status`, data);
    return res.data;
  },

  /**
   * Get real-time financial KPI metrics for a customer (excluding voided sales).
   */
  async getFinancialSummary(id: string): Promise<CustomerFinancialSummary> {
    const res = await apiClient.get<CustomerFinancialSummary>(`/customers/${id}/financial-summary`);
    return res.data;
  },

  /**
   * Get customer transaction history (including voided transactions clearly marked).
   */
  async getCustomerSales(
    id: string,
    params?: { page?: number; page_size?: number }
  ): Promise<SaleListResponse> {
    const res = await apiClient.get<SaleListResponse>(`/customers/${id}/sales`, {
      params,
    });
    return res.data;
  },

  /**
   * Get customer payment receipts history.
   */
  async getCustomerPayments(
    id: string,
    params?: { page?: number; page_size?: number }
  ): Promise<{ items: any[]; total: number; page: number; page_size: number; total_pages: number }> {
    const res = await apiClient.get(`/customers/${id}/payments`, {
      params,
    });
    return res.data;
  },

  /**
   * Get list of customers with outstanding credit balances and aging breakdown.
   */
  async getOutstandingCustomers(
    params?: OutstandingQueryParams
  ): Promise<CustomerOutstandingResponse> {
    const res = await apiClient.get<CustomerOutstandingResponse>('/customers/outstanding', {
      params,
    });
    return res.data;
  },
};

export default customerService;

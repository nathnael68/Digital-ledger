import { apiClient } from './api';
import {
  Customer,
  Product,
  SaleCorrectionPayload,
  SaleCreatePayload,
  SaleDetail,
  SaleListResponse,
  SaleQueryParams,
  SaleVoidPayload,
} from '../types/sale';

export const saleService = {
  /**
   * Search active products in catalog for typeahead product selection.
   */
  async searchProducts(query: string = ''): Promise<Product[]> {
    const res = await apiClient.get<Product[]>('/products/search', {
      params: { q: query },
    });
    return res.data;
  },

  /**
   * Search customers by name or phone for typeahead customer selection.
   */
  async searchCustomers(query: string = ''): Promise<Customer[]> {
    const res = await apiClient.get<Customer[]>('/customers/search', {
      params: { q: query },
    });
    return res.data;
  },

  /**
   * Quick-create a new customer profile.
   */
  async createCustomer(data: { name: string; phone?: string; address?: string }): Promise<Customer> {
    const res = await apiClient.post<Customer>('/customers', data);
    return res.data;
  },

  /**
   * Creates a new sale with collision-safe sequential numbering.
   */
  async createSale(payload: SaleCreatePayload): Promise<SaleDetail> {
    const res = await apiClient.post<SaleDetail>('/sales', payload);
    return res.data;
  },

  /**
   * Fetch paginated list of sales with filters and search.
   */
  async getSales(params?: SaleQueryParams): Promise<SaleListResponse> {
    const res = await apiClient.get<SaleListResponse>('/sales', {
      params,
    });
    return res.data;
  },

  /**
   * Fetch full details for a single sale.
   */
  async getSaleById(id: string): Promise<SaleDetail> {
    const res = await apiClient.get<SaleDetail>(`/sales/${id}`);
    return res.data;
  },

  /**
   * Record a subsequent payment against an outstanding sale.
   */
  async recordPayment(
    saleId: string,
    data: {
      amount: number | string;
      payment_method: string;
      reference?: string;
      idempotency_key?: string;
    }
  ): Promise<any> {
    const res = await apiClient.post(`/sales/${saleId}/payments`, data);
    return res.data;
  },

  /**
   * Correct transaction metadata (FS No., paper receipt number, notes) with mandatory reason.
   */
  async correctSale(saleId: string, payload: SaleCorrectionPayload): Promise<SaleDetail> {
    const res = await apiClient.put<SaleDetail>(`/sales/${saleId}`, payload);
    return res.data;
  },

  /**
   * Void a sales transaction with mandatory justification reason.
   */
  async voidSale(saleId: string, payload: SaleVoidPayload): Promise<SaleDetail> {
    const res = await apiClient.post<SaleDetail>(`/sales/${saleId}/void`, payload);
    return res.data;
  },
};

export default saleService;

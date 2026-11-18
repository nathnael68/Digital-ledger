import { apiClient } from './api';
import {
  CollectionReportResponse,
  CreditSalesReportResponse,
  CustomerReportResponse,
  DailySalesReportResponse,
  EmployeeActivityReportResponse,
  ReportOverviewResponse,
  ReportType,
} from '../types/report';

export interface ReportQueryParams {
  period?: string;
  start_date?: string;
  end_date?: string;
  report_date?: string;
  employee_id?: string;
  customer_id?: string;
  reference?: string;
  has_balance?: boolean;
}

export const reportService = {
  async getOverview(params?: ReportQueryParams): Promise<ReportOverviewResponse> {
    const res = await apiClient.get<ReportOverviewResponse>('/reports/overview', { params });
    return res.data;
  },

  async getDailySalesReport(reportDate?: string): Promise<DailySalesReportResponse> {
    const res = await apiClient.get<DailySalesReportResponse>('/reports/daily', {
      params: reportDate ? { report_date: reportDate } : undefined,
    });
    return res.data;
  },

  async getWeeklySalesReport(referenceDate?: string): Promise<DailySalesReportResponse> {
    const res = await apiClient.get<DailySalesReportResponse>('/reports/weekly', {
      params: referenceDate ? { reference_date: referenceDate } : undefined,
    });
    return res.data;
  },

  async getMonthlySalesReport(year?: number, month?: number): Promise<DailySalesReportResponse> {
    const res = await apiClient.get<DailySalesReportResponse>('/reports/monthly', {
      params: year && month ? { year, month } : undefined,
    });
    return res.data;
  },

  async getCustomRangeReport(startDate: string, endDate: string): Promise<DailySalesReportResponse> {
    const res = await apiClient.get<DailySalesReportResponse>('/reports/custom-range', {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  async getCashCollections(params?: ReportQueryParams): Promise<CollectionReportResponse> {
    const res = await apiClient.get<CollectionReportResponse>('/reports/cash-collections', { params });
    return res.data;
  },

  async getBankCollections(params?: ReportQueryParams): Promise<CollectionReportResponse> {
    const res = await apiClient.get<CollectionReportResponse>('/reports/bank-collections', { params });
    return res.data;
  },

  async getCreditSalesReport(params?: ReportQueryParams): Promise<CreditSalesReportResponse> {
    const res = await apiClient.get<CreditSalesReportResponse>('/reports/credit-sales', { params });
    return res.data;
  },

  async getEmployeeActivityReport(params?: ReportQueryParams): Promise<EmployeeActivityReportResponse> {
    const res = await apiClient.get<EmployeeActivityReportResponse>('/reports/employees', { params });
    return res.data;
  },

  async getCustomerSalesReport(params?: ReportQueryParams): Promise<CustomerReportResponse> {
    const res = await apiClient.get<CustomerReportResponse>('/reports/customers', { params });
    return res.data;
  },

  /**
   * Downloads an Excel (.xlsx) file and triggers browser download.
   */
  async exportExcel(params: {
    report_type: ReportType;
    period?: string;
    start_date?: string;
    end_date?: string;
    employee_id?: string;
    customer_id?: string;
  }): Promise<void> {
    const response = await apiClient.get('/reports/export/excel', {
      params,
      responseType: 'blob',
    });

    const contentDisposition = response.headers['content-disposition'] || '';
    let fileName = `delgone_${params.report_type}.xlsx`;
    const matches = /filename="?([^";]+)"?/i.exec(contentDisposition);
    if (matches && matches[1]) {
      fileName = matches[1];
    }

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Downloads a PDF (.pdf) file and triggers browser download.
   */
  async exportPdf(params: {
    report_type: ReportType;
    period?: string;
    start_date?: string;
    end_date?: string;
    employee_id?: string;
    customer_id?: string;
  }): Promise<void> {
    const response = await apiClient.get('/reports/export/pdf', {
      params,
      responseType: 'blob',
    });

    const contentDisposition = response.headers['content-disposition'] || '';
    let fileName = `delgone_${params.report_type}.pdf`;
    const matches = /filename="?([^";]+)"?/i.exec(contentDisposition);
    if (matches && matches[1]) {
      fileName = matches[1];
    }

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};

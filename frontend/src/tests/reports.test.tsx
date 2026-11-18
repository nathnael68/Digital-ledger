import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsPage } from '../pages/ReportsPage';
import { reportService } from '../services/reportService';
import {
  CollectionReportResponse,
  CreditSalesReportResponse,
  CustomerReportResponse,
  DailySalesReportResponse,
  EmployeeActivityReportResponse,
  ReportOverviewResponse,
} from '../types/report';

const mockOverview: ReportOverviewResponse = {
  date_range: {
    start_date: '2026-11-01T00:00:00Z',
    end_date: '2026-11-18T23:59:59Z',
    period_label: 'This Month',
    timezone: 'Africa/Addis_Ababa',
  },
  summary: {
    total_sales_revenue: '45000.00',
    cash_collections: '20000.00',
    bank_collections: '15000.00',
    credit_sales: '10000.00',
    current_outstanding_balance: '12000.00',
    transaction_count: 14,
    total_discounts: '500.00',
    voided_sales_count: 1,
    voided_sales_amount: '2500.00',
    revenue_comparison: {
      current: '45000.00',
      previous: '40000.00',
      delta: '5000.00',
      percentage_change: 12.5,
    },
    cash_comparison: {
      current: '20000.00',
      previous: '18000.00',
      delta: '2000.00',
      percentage_change: 11.1,
    },
    bank_comparison: {
      current: '15000.00',
      previous: '12000.00',
      delta: '3000.00',
      percentage_change: 25.0,
    },
  },
  trends: [
    {
      date: '2026-11-17',
      day_label: 'Tue, Nov 17',
      sales_revenue: '25000.00',
      cash_collected: '10000.00',
      bank_collected: '8000.00',
      transaction_count: 8,
    },
  ],
  payment_breakdown: [
    {
      method: 'cash',
      method_label: 'Cash Drawer',
      total_amount: '20000.00',
      count: 7,
      percentage: 57.14,
    },
    {
      method: 'bank_transfer',
      method_label: 'Bank Transfer (CBE)',
      total_amount: '15000.00',
      count: 4,
      percentage: 42.86,
    },
  ],
};

const mockDaily: DailySalesReportResponse = {
  report_date: '2026-11-18',
  summary: {
    total_sales_revenue: '14800.00',
    cash_collections: '4800.00',
    bank_collections: '7000.00',
    credit_sales: '6000.00',
    current_outstanding_balance: '12000.00',
    transaction_count: 2,
    total_discounts: '200.00',
    voided_sales_count: 1,
    voided_sales_amount: '2500.00',
  },
  transactions: [
    {
      id: 'sale-101',
      sale_number: 'DL-2026-0101',
      fs_number: '000451',
      paper_receipt_number: '00101',
      sale_date: '2026-11-18T10:30:00Z',
      customer_name: 'Abyssinia Graphic Design',
      created_by_name: 'Abebe Admin',
      subtotal: '5000.00',
      discount: '200.00',
      grand_total: '4800.00',
      amount_paid: '4800.00',
      outstanding_balance: '0.00',
      payment_status: 'paid',
      is_void: false,
    },
  ],
  voided_transactions: [
    {
      id: 'sale-void-1',
      sale_number: 'DL-2026-0103',
      fs_number: '000453',
      sale_date: '2026-11-18T13:30:00Z',
      customer_name: 'Abyssinia Graphic Design',
      created_by_name: 'Abebe Admin',
      subtotal: '2500.00',
      discount: '0.00',
      grand_total: '2500.00',
      amount_paid: '0.00',
      outstanding_balance: '0.00',
      payment_status: 'voided',
      is_void: true,
      void_reason: 'Cashier printer paper jam duplicate',
    },
  ],
};

const mockCash: CollectionReportResponse = {
  period_label: 'This Month',
  total_amount: '20000.00',
  payment_count: 7,
  items: [
    {
      id: 'pay-1',
      payment_date: '2026-11-18T10:30:00Z',
      sale_id: 'sale-101',
      sale_number: 'DL-2026-0101',
      fs_number: '000451',
      paper_receipt_number: '00101',
      customer_name: 'Abyssinia Graphic Design',
      amount: '4800.00',
      payment_method: 'cash',
      recorded_by_name: 'Abebe Admin',
    },
  ],
};

const mockBank: CollectionReportResponse = {
  period_label: 'This Month',
  total_amount: '15000.00',
  payment_count: 4,
  items: [
    {
      id: 'pay-2',
      payment_date: '2026-11-18T11:30:00Z',
      sale_id: 'sale-102',
      sale_number: 'DL-2026-0102',
      fs_number: '000452',
      customer_name: 'Tigist Book Printing',
      amount: '4000.00',
      payment_method: 'bank_transfer',
      reference: 'CBE-TRX-9988',
      recorded_by_name: 'Almaz Cashier',
    },
  ],
};

const mockCredit: CreditSalesReportResponse = {
  period_label: 'This Month',
  total_credit_created: '9000.00',
  total_current_balance: '7000.00',
  credit_sales_count: 2,
  items: [
    {
      id: 'sale-102',
      sale_number: 'DL-2026-0102',
      fs_number: '000452',
      sale_date: '2026-11-18T11:30:00Z',
      customer_id: 'cust-2',
      customer_name: 'Tigist Book Printing',
      grand_total: '10000.00',
      initial_amount_paid: '4000.00',
      initial_credit_amount: '6000.00',
      current_amount_paid: '4000.00',
      current_outstanding_balance: '6000.00',
      payment_status: 'partial',
      created_by_name: 'Almaz Cashier',
    },
  ],
};

const mockEmployee: EmployeeActivityReportResponse = {
  period_label: 'This Month',
  items: [
    {
      employee_id: 'emp-1',
      employee_name: 'Abebe Admin',
      username: 'admin',
      role: 'admin',
      sales_created_count: 1,
      sales_revenue: '4800.00',
      initial_cash_received: '4800.00',
      initial_bank_received: '0.00',
      initial_credit_created: '0.00',
      subsequent_payments_count: 1,
      subsequent_payments_amount: '3000.00',
      total_collections_recorded: '7800.00',
    },
  ],
};

const mockCustomer: CustomerReportResponse = {
  period_label: 'This Month',
  total_customers: 2,
  total_sales: '14800.00',
  total_payments: '8800.00',
  total_outstanding: '6000.00',
  items: [
    {
      customer_id: 'cust-1',
      customer_name: 'Abyssinia Graphic Design',
      company_name: 'Abyssinia PLC',
      phone: '0911223344',
      total_sales: '4800.00',
      total_payments: '4800.00',
      outstanding_balance: '0.00',
      transaction_count: 1,
      last_sale_date: '2026-11-18T10:30:00Z',
    },
  ],
};

describe('ReportsPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(reportService, 'getOverview').mockResolvedValue(mockOverview);
    vi.spyOn(reportService, 'getDailySalesReport').mockResolvedValue(mockDaily);
    vi.spyOn(reportService, 'getCashCollections').mockResolvedValue(mockCash);
    vi.spyOn(reportService, 'getBankCollections').mockResolvedValue(mockBank);
    vi.spyOn(reportService, 'getCreditSalesReport').mockResolvedValue(mockCredit);
    vi.spyOn(reportService, 'getEmployeeActivityReport').mockResolvedValue(mockEmployee);
    vi.spyOn(reportService, 'getCustomerSalesReport').mockResolvedValue(mockCustomer);
    vi.spyOn(reportService, 'exportExcel').mockResolvedValue(undefined);
    vi.spyOn(reportService, 'exportPdf').mockResolvedValue(undefined);
  });

  it('renders executive overview with KPI summary cards and trend data', async () => {
    render(
      <BrowserRouter>
        <ReportsPage />
      </BrowserRouter>
    );

    // Header check
    expect(screen.getByText('Reports & Financial Analytics')).toBeInTheDocument();
    expect(screen.getByText(/Delgone Trading PLC/i)).toBeInTheDocument();

    // Summary cards
    const revenueElements = await screen.findAllByText('Sales Revenue');
    expect(revenueElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cash Collections').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bank & Telebirr').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Outstanding Receivables')).toBeInTheDocument();

    // Verified KPI values
    expect(screen.getByText('45,000.00 ETB')).toBeInTheDocument();
    expect(screen.getAllByText('20,000.00 ETB').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('15,000.00 ETB').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('12,000.00 ETB')).toBeInTheDocument();

    // Trend table
    expect(screen.getByText('Tue, Nov 17')).toBeInTheDocument();
    expect(screen.getByText('Cash Drawer')).toBeInTheDocument();
  });

  it('switches to Daily Sales Closeout tab and displays transaction and voided sections', async () => {
    render(
      <BrowserRouter>
        <ReportsPage />
      </BrowserRouter>
    );

    // Switch tab
    const dailyTabBtn = screen.getByText('Daily Sales Closeout');
    fireEvent.click(dailyTabBtn);

    await waitFor(() => {
      expect(reportService.getDailySalesReport).toHaveBeenCalled();
    });

    // Verify daily transaction DL-2026-0101
    expect(await screen.findByText('DL-2026-0101')).toBeInTheDocument();
    expect(screen.getByText('000451')).toBeInTheDocument();

    // Verify voided section
    expect(screen.getByText(/Voided Transactions Audit Section/i)).toBeInTheDocument();
    expect(screen.getByText('DL-2026-0103')).toBeInTheDocument();
    expect(screen.getByText('Cashier printer paper jam duplicate')).toBeInTheDocument();
  });

  it('switches to Cash Collections tab and displays itemized cash receipts', async () => {
    render(
      <BrowserRouter>
        <ReportsPage />
      </BrowserRouter>
    );

    const cashTabBtn = screen.getByText('Cash Collections');
    fireEvent.click(cashTabBtn);

    await waitFor(() => {
      expect(reportService.getCashCollections).toHaveBeenCalled();
    });

    expect(await screen.findByText(/Physical Cash Drawer Collections/i)).toBeInTheDocument();
    expect(screen.getByText('DL-2026-0101')).toBeInTheDocument();
  });

  it('switches to Bank & Telebirr tab and displays electronic receipts with slip reference', async () => {
    render(
      <BrowserRouter>
        <ReportsPage />
      </BrowserRouter>
    );

    const bankTabBtn = screen.getByText('Bank & Telebirr');
    fireEvent.click(bankTabBtn);

    await waitFor(() => {
      expect(reportService.getBankCollections).toHaveBeenCalled();
    });

    expect(await screen.findByText('CBE-TRX-9988')).toBeInTheDocument();
    expect(screen.getByText('DL-2026-0102')).toBeInTheDocument();
  });

  it('switches to Employee Activity tab and displays staff sales vs collections', async () => {
    render(
      <BrowserRouter>
        <ReportsPage />
      </BrowserRouter>
    );

    const empTabBtn = screen.getByText('Employee Activity');
    fireEvent.click(empTabBtn);

    await waitFor(() => {
      expect(reportService.getEmployeeActivityReport).toHaveBeenCalled();
    });

    expect(await screen.findByText('Abebe Admin')).toBeInTheDocument();
    expect(screen.getByText('(admin)')).toBeInTheDocument();
    expect(screen.getByText('7,800.00 ETB')).toBeInTheDocument();
  });

  it('triggers Excel and PDF export handlers with active report type', async () => {
    render(
      <BrowserRouter>
        <ReportsPage />
      </BrowserRouter>
    );

    // Export Excel
    const excelBtn = screen.getByText('Excel (.xlsx)');
    fireEvent.click(excelBtn);

    await waitFor(() => {
      expect(reportService.exportExcel).toHaveBeenCalledWith(
        expect.objectContaining({ report_type: 'monthly_sales', period: 'this_month' })
      );
    });

    // Export PDF
    const pdfBtn = screen.getByText('PDF Document');
    fireEvent.click(pdfBtn);

    await waitFor(() => {
      expect(reportService.exportPdf).toHaveBeenCalledWith(
        expect.objectContaining({ report_type: 'monthly_sales', period: 'this_month' })
      );
    });
  });
});

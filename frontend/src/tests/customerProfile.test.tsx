import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerProfilePage } from '../pages/CustomerProfilePage';
import * as CustomerService from '../services/customerService';
import { Customer, CustomerFinancialSummary } from '../types/customer';
import { SaleListResponse } from '../types/sale';

const mockCustomer: Customer = {
  id: 'cust-101',
  name: 'Kidus Printing House',
  company_name: 'Kidus Printing PLC',
  phone: '0911556677',
  alt_phone: '0922889900',
  email: 'info@kidusprinting.com',
  address: 'Mexico Square, Addis Ababa',
  notes: 'Prompt payer on 15-day terms',
  is_active: true,
  created_at: '2026-11-10T10:00:00Z',
  updated_at: '2026-11-10T10:00:00Z',
};

const mockFinancials: CustomerFinancialSummary = {
  customer_id: 'cust-101',
  customer_name: 'Kidus Printing House',
  company_name: 'Kidus Printing PLC',
  phone: '0911556677',
  total_sales_amount: 25000,
  total_amount_paid: 18000,
  current_outstanding_balance: 7000,
  total_sales_count: 3,
  unpaid_sales_count: 1,
  partial_sales_count: 1,
};

const mockSales: SaleListResponse = {
  items: [
    {
      id: 'sale-1',
      sale_number: 'DL-2026-0010',
      fs_number: 'FS-5510',
      customer_id: 'cust-101',
      customer_name: 'Kidus Printing House',
      sale_date: '2026-11-12T09:00:00Z',
      subtotal: 10000,
      discount: 0,
      grand_total: 10000,
      total_paid: 10000,
      outstanding_balance: 0,
      payment_status: 'paid',
      created_by: 'user-1',
      created_by_name: 'Abebe Cashier',
      created_at: '2026-11-12T09:00:00Z',
      updated_at: '2026-11-12T09:00:00Z',
      items: [],
      payments: [],
    },
    {
      id: 'sale-2',
      sale_number: 'DL-2026-0011',
      fs_number: 'FS-5511',
      customer_id: 'cust-101',
      customer_name: 'Kidus Printing House',
      sale_date: '2026-11-14T11:00:00Z',
      subtotal: 15000,
      discount: 0,
      grand_total: 15000,
      total_paid: 8000,
      outstanding_balance: 7000,
      payment_status: 'partial',
      created_by: 'user-1',
      created_by_name: 'Abebe Cashier',
      created_at: '2026-11-14T11:00:00Z',
      updated_at: '2026-11-14T11:00:00Z',
      items: [],
      payments: [],
    },
    {
      id: 'sale-3',
      sale_number: 'DL-2026-0012',
      fs_number: 'FS-5512',
      customer_id: 'cust-101',
      customer_name: 'Kidus Printing House',
      sale_date: '2026-11-15T15:00:00Z',
      subtotal: 4000,
      discount: 0,
      grand_total: 4000,
      total_paid: 0,
      outstanding_balance: 4000,
      payment_status: 'voided',
      voided_at: '2026-11-15T16:00:00Z',
      void_reason: 'Customs fiscal printer paper jam duplicate',
      created_by: 'user-1',
      created_by_name: 'Abebe Cashier',
      created_at: '2026-11-15T15:00:00Z',
      updated_at: '2026-11-15T16:00:00Z',
      items: [],
      payments: [],
    },
  ],
  total: 3,
  page: 1,
  page_size: 10,
  total_pages: 1,
};

const mockPayments = {
  items: [
    {
      id: 'pay-1',
      sale_id: 'sale-1',
      sale_number: 'DL-2026-0010',
      amount: 10000,
      payment_method: 'bank_transfer',
      payment_date: '2026-11-12T09:30:00Z',
      reference: 'CBE-TX-998811',
      recorded_by: 'user-1',
      recorded_by_name: 'Abebe Cashier',
      created_at: '2026-11-12T09:30:00Z',
    },
    {
      id: 'pay-2',
      sale_id: 'sale-2',
      sale_number: 'DL-2026-0011',
      amount: 8000,
      payment_method: 'telebirr',
      payment_date: '2026-11-14T11:15:00Z',
      reference: 'TB-887766',
      recorded_by: 'user-1',
      recorded_by_name: 'Abebe Cashier',
      created_at: '2026-11-14T11:15:00Z',
    },
  ],
  total: 2,
  page: 1,
  page_size: 10,
  total_pages: 1,
};

describe('Customer Profile Page', () => {
  beforeEach(() => {
    vi.spyOn(CustomerService.customerService, 'getCustomerById').mockResolvedValue(mockCustomer);
    vi.spyOn(CustomerService.customerService, 'getFinancialSummary').mockResolvedValue(mockFinancials);
    vi.spyOn(CustomerService.customerService, 'getCustomerSales').mockResolvedValue(mockSales);
    vi.spyOn(CustomerService.customerService, 'getCustomerPayments').mockResolvedValue(mockPayments);
  });

  it('renders customer profile header, KPI cards, and sales history table', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/cust-101']}>
        <Routes>
          <Route path="/customers/:id" element={<CustomerProfilePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Kidus Printing House')).toBeInTheDocument();
      expect(screen.getByText('Kidus Printing PLC')).toBeInTheDocument();
      expect(screen.getByText('0911556677')).toBeInTheDocument();
      expect(screen.getByText('Active Customer')).toBeInTheDocument();
    });

    // Check Financial KPI cards
    expect(screen.getByText(/Lifetime Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Payments Collected/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Outstanding Due/i)).toBeInTheDocument();

    // Check Sales list
    expect(screen.getByText('DL-2026-0010')).toBeInTheDocument();
    expect(screen.getByText('DL-2026-0011')).toBeInTheDocument();
    expect(screen.getByText('DL-2026-0012')).toBeInTheDocument();

    // Check Voided sale badge is visible
    expect(screen.getByText('VOIDED')).toBeInTheDocument();
  });

  it('switches between tabs and displays payment receipts', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/cust-101']}>
        <Routes>
          <Route path="/customers/:id" element={<CustomerProfilePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Kidus Printing House')).toBeInTheDocument();
    });

    const paymentsTab = screen.getByText(/Payment Receipts/i);
    fireEvent.click(paymentsTab);

    await waitFor(() => {
      expect(screen.getByText('CBE-TX-998811')).toBeInTheDocument();
      expect(screen.getByText('TB-887766')).toBeInTheDocument();
    });
  });
});

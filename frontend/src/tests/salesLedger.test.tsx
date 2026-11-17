import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SalesLedgerPage } from '../pages/SalesLedgerPage';
import * as SaleService from '../services/saleService';
import { SaleListResponse } from '../types/sale';

const mockSalesData: SaleListResponse = {
  items: [
    {
      id: 'sale-1',
      sale_number: 'DL-2026-0001',
      fs_number: 'FS-99100',
      customer_id: 'cust-1',
      customer_name: 'Abyssinia Graphic Design',
      sale_date: '2026-11-16T09:00:00Z',
      subtotal: 5000,
      discount: 0,
      grand_total: 5000,
      total_paid: 5000,
      outstanding_balance: 0,
      paper_receipt_number: 'PR-1002',
      payment_status: 'paid',
      created_by: 'user-1',
      created_by_name: 'Abebe Cashier',
      created_at: '2026-11-16T09:00:00Z',
      updated_at: '2026-11-16T09:00:00Z',
      items: [],
      payments: [],
    },
    {
      id: 'sale-2',
      sale_number: 'DL-2026-0002',
      fs_number: 'FS-99101',
      customer_id: null,
      customer_name: null,
      sale_date: '2026-11-16T10:00:00Z',
      subtotal: 3000,
      discount: 0,
      grand_total: 3000,
      total_paid: 1000,
      outstanding_balance: 2000,
      paper_receipt_number: null,
      payment_status: 'partial',
      created_by: 'user-1',
      created_by_name: 'Abebe Cashier',
      created_at: '2026-11-16T10:00:00Z',
      updated_at: '2026-11-16T10:00:00Z',
      items: [],
      payments: [],
    },
  ],
  total: 2,
  page: 1,
  page_size: 15,
  total_pages: 1,
};

describe('SalesLedgerPage Component', () => {
  beforeEach(() => {
    vi.spyOn(SaleService.saleService, 'getSales').mockResolvedValue(mockSalesData);
  });

  it('renders sales ledger table with transactions and search bar', async () => {
    render(
      <BrowserRouter>
        <SalesLedgerPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Digital Sales Ledger/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by Sale #/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('DL-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('FS-99100')).toBeInTheDocument();
      expect(screen.getByText('Abyssinia Graphic Design')).toBeInTheDocument();
      expect(screen.getByText('DL-2026-0002')).toBeInTheDocument();
      expect(screen.getByText('FS-99101')).toBeInTheDocument();
      expect(screen.getByText('Walk-in')).toBeInTheDocument();
    });
  });

  it('filters transactions when status filter dropdown changes', async () => {
    const getSalesSpy = vi.spyOn(SaleService.saleService, 'getSales');

    render(
      <BrowserRouter>
        <SalesLedgerPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DL-2026-0001')).toBeInTheDocument();
    });

    const statusSelect = screen.getByDisplayValue('Payment: All');
    fireEvent.change(statusSelect, { target: { value: 'partial' } });

    await waitFor(() => {
      expect(getSalesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: 'partial',
        })
      );
    });
  });
});

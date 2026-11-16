import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SaleDetailsPage } from '../pages/SaleDetailsPage';
import * as SaleService from '../services/saleService';
import { SaleDetail } from '../types/sale';

const mockSaleDetail: SaleDetail = {
  id: 'sale-test-uuid',
  sale_number: 'DL-2026-0042',
  fs_number: 'FS-2026-0099',
  customer_id: 'cust-123',
  customer_name: 'Bole Stationery PLC',
  sale_date: '2026-11-16T08:30:00Z',
  subtotal: 6000,
  discount: 500,
  grand_total: 5500,
  total_paid: 2000,
  outstanding_balance: 3500,
  paper_receipt_number: 'PR-8819',
  payment_status: 'partial',
  notes: 'Customer to pay remainder by Friday',
  created_by: 'user-1',
  created_by_name: 'Abebe Cashier',
  created_at: '2026-11-16T08:30:00Z',
  updated_at: '2026-11-16T08:30:00Z',
  items: [
    {
      id: 'item-1',
      sale_id: 'sale-test-uuid',
      description_snapshot: 'Glossy Photo Paper A4 220gsm',
      unit: 'pack',
      quantity: 5,
      unit_price: 1200,
      line_subtotal: 6000,
    },
  ],
  payments: [
    {
      id: 'pay-1',
      sale_id: 'sale-test-uuid',
      amount: 2000,
      payment_method: 'bank_transfer',
      payment_date: '2026-11-16T08:30:00Z',
      reference: 'CBE-TRX-5566',
      recorded_by: 'user-1',
      recorded_by_name: 'Abebe Cashier',
      created_at: '2026-11-16T08:30:00Z',
    },
  ],
};

describe('SaleDetailsPage Component', () => {
  beforeEach(() => {
    vi.spyOn(SaleService.saleService, 'getSaleById').mockResolvedValue(mockSaleDetail);
  });

  it('renders sale overview, line items, and payment history', async () => {
    render(
      <MemoryRouter initialEntries={['/sales/sale-test-uuid']}>
        <Routes>
          <Route path="/sales/:id" element={<SaleDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DL-2026-0042')).toBeInTheDocument();
      expect(screen.getByText('FS-2026-0099')).toBeInTheDocument();
      expect(screen.getByText('Bole Stationery PLC')).toBeInTheDocument();
      expect(screen.getByText('PR-8819')).toBeInTheDocument();
      expect(screen.getByText('Glossy Photo Paper A4 220gsm')).toBeInTheDocument();
      expect(screen.getByText('CBE-TRX-5566')).toBeInTheDocument();
    });

    // Action buttons
    expect(screen.getByText('Record Payment')).toBeInTheDocument();
    expect(screen.getByText('Correct Transaction')).toBeInTheDocument();
    expect(screen.getByText('Void Sale')).toBeInTheDocument();
  });

  it('opens record payment modal when clicking Record Payment', async () => {
    render(
      <MemoryRouter initialEntries={['/sales/sale-test-uuid']}>
        <Routes>
          <Route path="/sales/:id" element={<SaleDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('DL-2026-0042')).toBeInTheDocument();
    });

    const recordPayBtn = screen.getByRole('button', { name: /Record Payment/i });
    fireEvent.click(recordPayBtn);

    await waitFor(() => {
      expect(screen.getByText('Confirm Payment')).toBeInTheDocument();
    });
  });
});

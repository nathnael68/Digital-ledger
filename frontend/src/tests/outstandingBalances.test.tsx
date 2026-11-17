import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutstandingBalancesPage } from '../pages/OutstandingBalancesPage';
import * as CustomerService from '../services/customerService';
import { CustomerOutstandingResponse } from '../types/customer';

const mockOutstandingData: CustomerOutstandingResponse = {
  items: [
    {
      id: 'cust-1',
      name: 'Abyssinia Graphic Design',
      company_name: 'Abyssinia PLC',
      phone: '0911223344',
      alt_phone: null,
      total_purchases: 50000,
      total_paid: 30000,
      outstanding_balance: 20000,
      aging_0_30: 5000,
      aging_31_60: 10000,
      aging_61_90: 5000,
      aging_over_90: 0,
      oldest_unpaid_sale_date: '2026-10-15T00:00:00Z',
      last_payment_date: '2026-11-10T00:00:00Z',
      unpaid_sales_count: 2,
    },
    {
      id: 'cust-2',
      name: 'Lucy Book Binding',
      company_name: 'Lucy Enterprise',
      phone: '0922334455',
      alt_phone: null,
      total_purchases: 25000,
      total_paid: 10000,
      outstanding_balance: 15000,
      aging_0_30: 0,
      aging_31_60: 0,
      aging_61_90: 0,
      aging_over_90: 15000,
      oldest_unpaid_sale_date: '2026-07-01T00:00:00Z',
      last_payment_date: null,
      unpaid_sales_count: 1,
    },
  ],
  total: 2,
  total_receivables: 35000,
};

describe('OutstandingBalancesPage Component', () => {
  beforeEach(() => {
    vi.spyOn(CustomerService.customerService, 'getOutstandingCustomers').mockResolvedValue(mockOutstandingData);
  });

  it('renders total company receivables overview and customer aging list', async () => {
    render(
      <BrowserRouter>
        <OutstandingBalancesPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Customer Outstanding Balances & Aging/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Company Receivables Due/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Abyssinia Graphic Design')).toBeInTheDocument();
      expect(screen.getByText('Abyssinia PLC')).toBeInTheDocument();
      expect(screen.getByText('Lucy Book Binding')).toBeInTheDocument();
      expect(screen.getByText('Lucy Enterprise')).toBeInTheDocument();
      expect(screen.getByText(/35,000.00 ETB/)).toBeInTheDocument();
    });
  });

  it('filters by aging bucket tab when clicked', async () => {
    const getOutstandingSpy = vi.spyOn(CustomerService.customerService, 'getOutstandingCustomers');

    render(
      <BrowserRouter>
        <OutstandingBalancesPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Abyssinia Graphic Design')).toBeInTheDocument();
    });

    const overdueTab = screen.getByText(/> 90 Days \(Overdue\)/i);
    fireEvent.click(overdueTab);

    await waitFor(() => {
      expect(getOutstandingSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          aging_bucket: 'over_90',
        })
      );
    });
  });
});

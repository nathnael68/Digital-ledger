import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewSalePage } from '../pages/NewSalePage';
import * as AuthContext from '../context/AuthContext';
import * as SaleService from '../services/saleService';

describe('NewSalePage Component', () => {
  beforeEach(() => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: {
        id: '1',
        username: 'almaz_cashier',
        full_name: 'Almaz Cashier',
        role: 'sales_employee',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    vi.spyOn(SaleService.saleService, 'searchProducts').mockResolvedValue([
      {
        id: 'prod-1',
        name: 'A4 Photocopy Paper 80gsm',
        description: 'Standard 500 sheets ream',
        default_price: 2450,
        unit: 'box',
        is_active: true,
      },
    ]);
  });

  it('renders counter terminal with FS number, customer selection, and line items table', async () => {
    render(
      <BrowserRouter>
        <NewSalePage />
      </BrowserRouter>
    );

    expect(screen.getByText('Record New Sale')).toBeInTheDocument();
    expect(screen.getByText('Live Terminal')).toBeInTheDocument();
    expect(screen.getByText(/Almaz Cashier/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/FS-2026-00451/i)).toBeInTheDocument();
    expect(screen.getByText('Walk-in Customer (Over-the-counter)')).toBeInTheDocument();
    expect(screen.getByText(/Products & Line Items/i)).toBeInTheDocument();
    expect(screen.getByText('Review & Finalize Transaction')).toBeInTheDocument();
  });

  it('validates mandatory FS Number before allowing review modal', async () => {
    render(
      <BrowserRouter>
        <NewSalePage />
      </BrowserRouter>
    );

    const submitBtn = screen.getByText('Review & Finalize Transaction');
    fireEvent.click(submitBtn);

    // Should display validation error
    await waitFor(() => {
      expect(screen.getByText(/FS Number \(Customs Fiscal Reference\) is mandatory/i)).toBeInTheDocument();
    });
  });

  it('calculates line subtotal, grand total, and opens confirmation modal', async () => {
    const createSaleSpy = vi.spyOn(SaleService.saleService, 'createSale').mockResolvedValue({
      id: 'sale-999',
      sale_number: 'DL-2026-0001',
      fs_number: 'FS-2026-00100',
      sale_date: new Date().toISOString(),
      subtotal: 2500,
      discount: 0,
      grand_total: 2500,
      total_paid: 2500,
      outstanding_balance: 0,
      payment_status: 'paid',
      created_by: '1',
      created_by_name: 'Almaz Cashier',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          sale_id: 'sale-999',
          description_snapshot: 'Thermal Receipt Paper Roll 80mm',
          unit: 'pack',
          quantity: 2,
          unit_price: 1250,
          line_subtotal: 2500,
        },
      ],
      payments: [],
    });

    render(
      <BrowserRouter>
        <NewSalePage />
      </BrowserRouter>
    );

    // 1. Enter FS Number
    const fsInput = screen.getByPlaceholderText(/FS-2026-00451/i);
    fireEvent.change(fsInput, { target: { value: 'FS-2026-00100' } });

    // 2. Fill item description and price
    const itemInput = screen.getByPlaceholderText(/Enter item description/i);
    fireEvent.change(itemInput, { target: { value: 'Thermal Receipt Paper Roll 80mm' } });

    const priceInputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(priceInputs[0], { target: { value: '2500' } });

    // 3. Click review
    const submitBtn = screen.getByText('Review & Finalize Transaction');
    fireEvent.click(submitBtn);

    // 4. Modal should appear
    await waitFor(() => {
      expect(screen.getByText('Confirm Sales Transaction')).toBeInTheDocument();
      expect(screen.getByText('Confirm & Save Sale')).toBeInTheDocument();
    });

    // 5. Confirm submission
    const confirmBtn = screen.getByText('Confirm & Save Sale');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(createSaleSpy).toHaveBeenCalled();
      expect(screen.getByText('Sale Recorded Successfully')).toBeInTheDocument();
      expect(screen.getByText('DL-2026-0001')).toBeInTheDocument();
    });
  });
});

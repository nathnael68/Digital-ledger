import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomersPage } from '../pages/CustomersPage';
import * as CustomerService from '../services/customerService';
import { CustomerListResponse } from '../types/customer';

const mockCustomerListData: CustomerListResponse = {
  items: [
    {
      id: 'cust-1',
      name: 'Abebe Bekele',
      company_name: 'Abyssinia Graphic Design & Print',
      phone: '0911223344',
      alt_phone: '0922334455',
      email: 'abebe@abyssiniagraphics.et',
      address: 'Piazza, Addis Ababa',
      notes: 'VIP offset print client',
      is_active: true,
      created_at: '2026-11-15T08:00:00Z',
      updated_at: '2026-11-15T08:00:00Z',
      total_purchases: 15000,
      total_paid: 10000,
      outstanding_balance: 5000,
      active_sales_count: 3,
    },
    {
      id: 'cust-2',
      name: 'Tigist Haile',
      company_name: 'Blue Nile Stationery',
      phone: '0933445566',
      alt_phone: null,
      email: null,
      address: 'Bole, Addis Ababa',
      notes: null,
      is_active: false,
      created_at: '2026-11-16T10:00:00Z',
      updated_at: '2026-11-16T10:00:00Z',
      total_purchases: 8000,
      total_paid: 8000,
      outstanding_balance: 0,
      active_sales_count: 1,
    },
  ],
  total: 2,
  page: 1,
  page_size: 15,
  total_pages: 1,
};

describe('Customer Directory Page', () => {
  beforeEach(() => {
    vi.spyOn(CustomerService.customerService, 'getCustomers').mockResolvedValue(mockCustomerListData);
  });

  it('renders customer list with contact details, financial totals, and status badges', async () => {
    render(
      <BrowserRouter>
        <CustomersPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Customer Management/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by customer name, company/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Abebe Bekele')).toBeInTheDocument();
      expect(screen.getByText('Abyssinia Graphic Design & Print')).toBeInTheDocument();
      expect(screen.getByText('0911223344')).toBeInTheDocument();
      expect(screen.getByText('Tigist Haile')).toBeInTheDocument();
      expect(screen.getByText('Blue Nile Stationery')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('allows searching customers and triggers API call with debounce', async () => {
    const getCustomersSpy = vi.spyOn(CustomerService.customerService, 'getCustomers');

    render(
      <BrowserRouter>
        <CustomersPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Abebe Bekele')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by customer name, company/i);
    fireEvent.change(searchInput, { target: { value: 'Abyssinia' } });

    await waitFor(() => {
      expect(getCustomersSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Abyssinia',
        })
      );
    });
  });

  it('opens new customer modal, validates input, checks duplicates, and saves', async () => {
    const createCustomerSpy = vi.spyOn(CustomerService.customerService, 'createCustomer').mockResolvedValue({
      id: 'cust-3',
      name: 'Dawit Yohannes',
      company_name: 'Dawit Advertising',
      phone: '0944556677',
      is_active: true,
      created_at: '2026-11-17T09:00:00Z',
      updated_at: '2026-11-17T09:00:00Z',
    });

    vi.spyOn(CustomerService.customerService, 'checkDuplicate').mockResolvedValue({
      possible_duplicates: [],
      has_matches: false,
      message: 'No duplicates found',
    });

    render(
      <BrowserRouter>
        <CustomersPage />
      </BrowserRouter>
    );

    const newBtn = screen.getByText('New Customer');
    fireEvent.click(newBtn);

    expect(screen.getByText('Register New Customer')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('e.g. Abebe Bekele');
    const companyInput = screen.getByPlaceholderText('e.g. Abyssinia Graphic Design & Print');
    const phoneInput = screen.getByPlaceholderText('e.g. 0911234567 or +251...');

    fireEvent.change(nameInput, { target: { value: 'Dawit Yohannes' } });
    fireEvent.change(companyInput, { target: { value: 'Dawit Advertising' } });
    fireEvent.change(phoneInput, { target: { value: '0944556677' } });

    const submitBtn = screen.getByText('Register Customer');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createCustomerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Dawit Yohannes',
          company_name: 'Dawit Advertising',
          phone: '0944556677',
        })
      );
    });
  });
});

import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { Sidebar } from '../components/Sidebar';
import * as AuthContext from '../context/AuthContext';

describe('Sidebar Role-Based Navigation', () => {
  it('renders standard navigation items for Sales Employee', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: {
        id: '123',
        username: 'sales_rep',
        full_name: 'Sales Rep Abebe',
        role: 'sales_employee',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Sidebar isOpen={true} onClose={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('New Sale')).toBeInTheDocument();
    expect(screen.getAllByText('Sales Ledger').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Customers')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
    // Employees link MUST NOT be present for Sales Employee
    expect(screen.queryByText('Employees')).not.toBeInTheDocument();
  });

  it('renders Employees link when user is Administrator', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: {
        id: '456',
        username: 'admin_director',
        full_name: 'Managing Director',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Sidebar isOpen={true} onClose={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});

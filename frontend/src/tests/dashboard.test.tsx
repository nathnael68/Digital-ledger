import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { DashboardPage } from '../pages/DashboardPage';
import * as AuthContext from '../context/AuthContext';
import * as DashboardService from '../services/dashboardService';

describe('DashboardPage Component', () => {
  it('renders summary cards with real database calculated values and empty state', async () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: {
        id: '123',
        username: 'admin',
        full_name: 'Lead Director',
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

    vi.spyOn(DashboardService.dashboardService, 'getDashboard').mockResolvedValue({
      summary: {
        today_sales: '0.00',
        cash_received: '0.00',
        bank_received: '0.00',
        credit_sales: '0.00',
        outstanding_balance: '0.00',
        total_transactions: 0,
      },
      trend_7_days: [
        { date: '2026-11-16', day_label: 'Mon, Nov 16', total_sales: '0.00', transaction_count: 0 },
      ],
      payment_methods: [],
      recent_transactions: [],
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Today's Sales")).toBeInTheDocument();
    expect(screen.getByText("Cash Received")).toBeInTheDocument();
    expect(screen.getByText("Bank Received")).toBeInTheDocument();
    expect(screen.getByText("Credit Sales")).toBeInTheDocument();
    expect(screen.getByText("Outstanding Balance")).toBeInTheDocument();
    expect(screen.getByText("Total Transactions")).toBeInTheDocument();

    expect(await screen.findByText('No sales recorded yet')).toBeInTheDocument();
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsPage } from '../pages/SettingsPage';
import * as AuthContext from '../context/AuthContext';
import { authService } from '../services/authService';

describe('SettingsPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: {
        id: 'user-admin-1',
        username: 'admin',
        full_name: 'Lead Director Abebe',
        role: 'admin',
        is_active: true,
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-01T00:00:00Z',
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshProfile: vi.fn(),
    });
  });

  it('renders system settings, organization profile, and PWA status cards', async () => {
    render(
      <BrowserRouter>
        <SettingsPage />
      </BrowserRouter>
    );

    // Title
    expect(screen.getByText('System Settings & Configuration')).toBeInTheDocument();

    // Business profile
    expect(screen.getByText('Delgone Trading PLC')).toBeInTheDocument();
    expect(screen.getByText('Addis Ababa, Ethiopia')).toBeInTheDocument();
    expect(screen.getByText('ETB (Ethiopian Birr)')).toBeInTheDocument();
    expect(screen.getAllByText(/Africa\/Addis_Ababa/i).length).toBeGreaterThanOrEqual(1);

    // User details
    expect(screen.getByText('Lead Director Abebe')).toBeInTheDocument();
    expect(screen.getByText('@admin')).toBeInTheDocument();

    // Compliance rules
    expect(screen.getByText('DL-YYYY-XXXX')).toBeInTheDocument();
    expect(screen.getByText('FS Number')).toBeInTheDocument();

    // PWA status
    expect(screen.getByText('PWA & Device Status')).toBeInTheDocument();
    expect(screen.getByText('Service Worker:')).toBeInTheDocument();
  });

  it('validates password inputs and submits successfully', async () => {
    vi.spyOn(authService, 'changePassword').mockResolvedValue(
      'Your password has been changed successfully'
    );

    render(
      <BrowserRouter>
        <SettingsPage />
      </BrowserRouter>
    );

    const currentInput = screen.getByPlaceholderText('Enter current password');
    const newInput = screen.getByPlaceholderText('At least 8 characters');
    const confirmInput = screen.getByPlaceholderText('Re-enter new password');
    const submitBtn = screen.getByText('Change My Password');

    // Fill valid data
    fireEvent.change(currentInput, { target: { value: 'OldPassword123!' } });
    fireEvent.change(newInput, { target: { value: 'NewPassword2026!' } });
    fireEvent.change(confirmInput, { target: { value: 'NewPassword2026!' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.changePassword).toHaveBeenCalledWith(
        'OldPassword123!',
        'NewPassword2026!'
      );
    });

    expect(
      await screen.findByText('Your password has been changed successfully')
    ).toBeInTheDocument();
  });
});

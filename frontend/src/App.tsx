import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { NewSalePage } from './pages/NewSalePage';
import { SalesLedgerPage } from './pages/SalesLedgerPage';
import { SaleDetailsPage } from './pages/SaleDetailsPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerProfilePage } from './pages/CustomerProfilePage';
import { OutstandingBalancesPage } from './pages/OutstandingBalancesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated Protected Shell */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />

              {/* Admin-Only Route */}
              <Route element={<ProtectedRoute requireAdmin={true} />}>
                <Route path="employees" element={<EmployeesPage />} />
              </Route>

              {/* Core Ledger Routes */}
              <Route path="sales/new" element={<NewSalePage />} />
              <Route path="sales/:id" element={<SaleDetailsPage />} />
              <Route path="sales" element={<SalesLedgerPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/outstanding" element={<OutstandingBalancesPage />} />
              <Route path="customers/:id" element={<CustomerProfilePage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />

              {/* Catch-all redirect to Dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

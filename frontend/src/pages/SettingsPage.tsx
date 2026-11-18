import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Settings,
  Building,
  Shield,
  Key,
  Receipt,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Download,
  Users,
  BarChart3,
  Globe,
  Database,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { isStandalonePWA, onInstallAvailabilityChange, promptPWAInstall } from '../utils/pwa';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useApiHealth } from '../hooks/useApiHealth';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isOnline = useNetworkStatus();
  const { data: healthData } = useApiHealth();

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // PWA installation state
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandalonePWA());
    return onInstallAvailabilityChange((available) => {
      setCanInstall(available);
    });
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const msg = await authService.changePassword(currentPassword, newPassword);
      setPasswordSuccess(msg || 'Your password was updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to update password. Please check your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-delgone-navy-800 text-white flex items-center justify-center shadow-sm">
            <Settings className="w-5 h-5 text-delgone-gold-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              System Settings & Configuration
            </h1>
            <p className="text-xs text-slate-500">
              Delgone Trading PLC — Business Profile, Security, Receipt Conventions & PWA Status
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Production Active
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Core Configuration Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Business Profile & Regional Conventions */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
              <Building className="w-4 h-4 text-delgone-navy-800" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Organization & Regional Profile
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-lg">
                <span className="text-slate-400 font-medium block text-[11px] uppercase">
                  Company Legal Entity
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  Delgone Trading PLC
                </span>
                <span className="text-slate-500 text-[11px]">Commercial Printing & Paper Supplies</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-lg">
                <span className="text-slate-400 font-medium block text-[11px] uppercase">
                  Operational Branch
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  Addis Ababa, Ethiopia
                </span>
                <span className="text-slate-500 text-[11px]">Primary Counter & Sales Desk</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-lg">
                <span className="text-slate-400 font-medium block text-[11px] uppercase">
                  System Currency
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  ETB (Ethiopian Birr)
                </span>
                <span className="text-slate-500 text-[11px]">Two-decimal exact arithmetic</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-lg">
                <span className="text-slate-400 font-medium block text-[11px] uppercase">
                  Business Timezone
                </span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Africa/Addis_Ababa (EAT, UTC+3)
                </span>
                <span className="text-slate-500 text-[11px]">Monday–Sunday weekly cycles</span>
              </div>
            </div>
          </div>

          {/* Card 2: Security & Password Update */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
              <Shield className="w-4 h-4 text-delgone-navy-800" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Account Security & Password
              </h2>
            </div>

            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-5 text-xs">
              <div>
                <p className="font-bold text-slate-900">{user?.full_name}</p>
                <p className="text-slate-500 font-mono text-[11px]">@{user?.username}</p>
              </div>
              <span
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  user?.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {user?.role === 'admin' ? 'Administrator' : 'Sales Employee'}
              </span>
            </div>

            {passwordSuccess && (
              <div className="flex items-center gap-2 p-3 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="flex items-center gap-2 p-3 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-lg mb-4">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-delgone-navy-800"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    New Password (min 8 chars)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-delgone-navy-800"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-delgone-navy-800"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-delgone-navy-800 hover:bg-delgone-navy-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                <Key className="w-3.5 h-3.5 text-delgone-gold-400" />
                {isChangingPassword ? 'Updating Password...' : 'Change My Password'}
              </button>
            </form>
          </div>

          {/* Card 3: Receipt Numbering & Dual Tracking Conventions */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
              <Receipt className="w-4 h-4 text-delgone-navy-800" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Receipt Numbering & Compliance Rules
              </h2>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 font-mono text-xs shrink-0">DL-YYYY-XXXX</span>
                <div>
                  <p className="font-semibold text-slate-800">Sequential Digital Sale Number</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Collision-safe, atomic serial sequence based on the Addis Ababa calendar year (e.g. DL-2026-0001). Never reused, even upon transaction voiding.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 font-mono text-xs shrink-0">FS Number</span>
                <div>
                  <p className="font-semibold text-slate-800">Ethiopian Fiscal Receipt Number</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Printed from the official cash register machine. Strictly preserved with leading zeros (e.g. 000451) across database, Excel, and PDF exports.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 font-mono text-xs shrink-0">Paper Ref</span>
                <div>
                  <p className="font-semibold text-slate-800">Manual Paper Receipt Book Reference</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Captures Delgone's physical duplicate paper receipt number for cross-referencing handwritten archives during audit inspections.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Device, PWA & Admin Controls */}
        <div className="space-y-6">
          {/* Card 4: PWA & Mobile Installation */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
              <Smartphone className="w-4 h-4 text-delgone-navy-800" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                PWA & Device Status
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Display Mode:</span>
                <span className="font-semibold text-slate-900">
                  {isStandalone ? 'Standalone App' : 'Browser Mode'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Service Worker:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active (App Shell Cached)
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Network Connection:</span>
                <span
                  className={`font-semibold flex items-center gap-1 ${
                    isOnline ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  {isOnline ? 'Online (Synchronized)' : 'Offline (Restricted)'}
                </span>
              </div>

              {canInstall && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => promptPWAInstall()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-900 bg-amber-300 hover:bg-amber-400 border border-amber-400 rounded-lg shadow-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install Delgone App to Device</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1.5">
                    Installs as a fast, standalone application on Android, iOS, or Windows.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 5: System Diagnostics */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
              <Database className="w-4 h-4 text-delgone-navy-800" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                System Diagnostics
              </h2>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Version:</span>
                <span className="font-mono font-bold text-slate-900">1.0.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Environment:</span>
                <span className="font-mono font-medium text-slate-800 capitalize">
                  {healthData?.environment || 'Development'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Database Connection:</span>
                <span className="font-semibold text-emerald-700">
                  {healthData?.database_connected ? 'Healthy / Connected' : 'Checking...'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Timezone:</span>
                <span className="font-mono text-slate-800">Africa/Addis_Ababa</span>
              </div>
            </div>
          </div>

          {/* Card 6: Administrator Quick Links (Admin Role Only) */}
          {user?.role === 'admin' && (
            <div className="bg-slate-900 text-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-3">
                <Shield className="w-4 h-4 text-delgone-gold-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-delgone-gold-400">
                  Administrator Operations
                </h2>
              </div>

              <div className="space-y-2 text-xs">
                <Link
                  to="/employees"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Manage Employee Accounts
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </Link>

                <Link
                  to="/reports"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                    Executive Financial Reports
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </Link>

                <Link
                  to="/customers"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    Customer Receivables & Aging
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

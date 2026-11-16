import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Banknote,
  Building2,
  CreditCard,
  PlusCircle,
  Receipt,
  RefreshCw,
  Server,
  Database,
  Globe,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useApiHealth } from '../hooks/useApiHealth';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { formatCurrency } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, latencyMs, lastChecked, refetch } = useApiHealth();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Counter Sales Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Delgone Trading PLC • Centralized Digital Sales Ledger & Physical Receipt Reconciliation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Check Connection
          </button>
          <button
            type="button"
            onClick={() => navigate('/sales/new')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-delgone-navy-900 text-white hover:bg-delgone-navy-800 active:bg-delgone-navy-950 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            New Sale (F2)
          </button>
        </div>
      </div>

      {/* Backend API & Database Connection Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Server className="w-5 h-5 text-delgone-navy-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Backend API & Database Connectivity
                </h2>
                {loading ? (
                  <StatusBadge status="pending" label="Pinging API..." />
                ) : error ? (
                  <StatusBadge status="error" label="Connection Failed" />
                ) : data?.database_connected ? (
                  <StatusBadge status="healthy" label="Fully Operational" />
                ) : (
                  <StatusBadge status="degraded" label="API Active • DB Disconnected" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Target endpoint: <code className="font-mono text-slate-700">GET /api/health</code>
              </p>
            </div>
          </div>
          {lastChecked && (
            <span className="text-xs text-slate-400 font-mono">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Health Details Grid */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              API Status
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-800">
              {loading ? 'Checking...' : error ? 'Offline' : data?.status.toUpperCase() || 'UNKNOWN'}
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              PostgreSQL
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-800 flex items-center gap-1">
              {loading ? (
                'Checking...'
              ) : data?.database_connected ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Pending</span>
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              API Latency
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-800 font-mono">
              {latencyMs !== null ? `${latencyMs} ms` : '-'}
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              Environment
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-800 capitalize">
              {data?.environment || 'development'}
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Timezone
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-800">
              {data?.timezone || 'Africa/Addis_Ababa'}
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Coins className="w-3.5 h-3.5 text-slate-400" />
              Currency
            </div>
            <div className="mt-1 text-sm font-semibold text-emerald-700 font-bold">
              {data?.currency || 'ETB'}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            <strong>Connection Notice:</strong> Unable to connect to backend API server at{' '}
            <code className="font-mono bg-rose-100 px-1 py-0.5 rounded">{import.meta.env.VITE_API_BASE_URL || '/api'}</code>.
            Ensure the FastAPI server is running (`uvicorn backend.app.main:app --reload`).
          </div>
        )}
      </div>

      {/* Daily Ledger KPI Metrics Placeholder (Phase 1 Baseline) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Daily Gross Sales"
          value={formatCurrency(0)}
          subtitle="Ready for Phase 2 live counter entries"
          icon={Receipt}
          badge={<StatusBadge status="pending" label="Shift Ready" />}
        />
        <StatCard
          title="Cash Collections"
          value={formatCurrency(0)}
          subtitle="Physical cash in counter drawer"
          icon={Banknote}
        />
        <StatCard
          title="Bank & Mobile Transfers"
          value={formatCurrency(0)}
          subtitle="CBE, Awash, Telebirr & CBE Birr"
          icon={Building2}
        />
        <StatCard
          title="Outstanding Credit"
          value={formatCurrency(0)}
          subtitle="Active customer credit balance"
          icon={CreditCard}
        />
      </div>

      {/* Phase 1 Technical Foundation Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-3">
            Phase 1 Technical Foundation Deliverables
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            The technical foundation for <strong>Delgone Digital Sales Ledger</strong> has been established.
            The relational database models, API architecture, migration pipelines, and responsive frontend shell are configured.
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-semibold text-slate-900">
                  SQLAlchemy 2.0 Normalized Schema & Models
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Users, Customers, Products, Sales, Sale Items, Payments, and Audit Logs models created with UUID primary keys and NUMERIC(12,2) Ethiopian Birr precision.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-semibold text-slate-900">
                  Dual Physical-to-Digital Reconciliation Design
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mandatory capture of handwritten paper receipt numbers alongside auto-generated digital sequential sale IDs (DLG-YYYYMM-XXXX).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-semibold text-slate-900">
                  Alembic Migration Pipeline & Docker Compose
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Alembic configured for repeatable schema versioning. Docker Compose prepared with PostgreSQL persistent storage.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links & Next Steps */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Next Up: Phase 2
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Upon approval of Phase 1, Phase 2 will implement:
            </p>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-delgone-navy-800" />
                JWT Authentication & Role-Based Access Control
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-delgone-navy-800" />
                Product Catalog Management & Pricing
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-delgone-navy-800" />
                Customer Directory & Walk-in Profiles
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-delgone-navy-800" />
                User Administration for Delgone Employees
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate('/sales')}
              className="w-full text-center py-2 px-3 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Open Sales Ledger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

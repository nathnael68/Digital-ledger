import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Banknote,
  Building2,
  CreditCard,
  PlusCircle,
  Receipt,
  RefreshCw,
  TrendingUp,
  PieChart,
  AlertCircle,
  Scale,
  Hash,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { DashboardResponse } from '../types/dashboard';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getDashboard();
      setData(res);
      setLastRefreshed(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch dashboard metrics';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Calculate highest sale value in 7 days for relative chart scaling
  const maxDaySales = data?.trend_7_days
    ? Math.max(...data.trend_7_days.map((d) => Number(d.total_sales)), 100)
    : 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Counter Sales Dashboard
            </h1>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">
              • Welcome, {user?.full_name}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time daily ledger calculations, cash & bank reconciliation, and credit monitoring.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchDashboard()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/sales/new')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-delgone-navy-900 text-white hover:bg-delgone-navy-800 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            New Sale (F2)
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchDashboard()}
            className="underline font-semibold hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* 6 SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(data?.summary.today_sales ?? 0)}
          subtitle="Finalized non-voided sales"
          icon={Receipt}
          badge={<StatusBadge status="active" label="Today" />}
        />
        <StatCard
          title="Cash Received"
          value={formatCurrency(data?.summary.cash_received ?? 0)}
          subtitle="Physical cash in counter"
          icon={Banknote}
        />
        <StatCard
          title="Bank Received"
          value={formatCurrency(data?.summary.bank_received ?? 0)}
          subtitle="CBE, Awash & Telebirr"
          icon={Building2}
        />
        <StatCard
          title="Credit Sales"
          value={formatCurrency(data?.summary.credit_sales ?? 0)}
          subtitle="Sales released on credit"
          icon={CreditCard}
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(data?.summary.outstanding_balance ?? 0)}
          subtitle="Uncollected customer dues"
          icon={Scale}
        />
        <StatCard
          title="Total Transactions"
          value={data?.summary.total_transactions ?? 0}
          subtitle="Recorded today"
          icon={Hash}
        />
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-DAY SALES TREND */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-delgone-navy-800" />
                <h2 className="text-sm font-bold text-slate-900">
                  Seven-Day Sales Trend (ETB)
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : ''}
              </span>
            </div>

            {/* Bar Chart Container */}
            <div className="mt-6">
              {isLoading ? (
                <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin text-delgone-navy-800 mr-2" />
                  Loading 7-day trend...
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 pt-6 pb-2">
                  {data?.trend_7_days.map((item) => {
                    const heightPercent = Math.max(
                      Math.round((Number(item.total_sales) / maxDaySales) * 100),
                      6
                    );
                    const hasSales = Number(item.total_sales) > 0;
                    return (
                      <div
                        key={item.date}
                        className="flex flex-col items-center justify-end h-full group"
                      >
                        {/* Hover Tooltip Value */}
                        <div className="text-[10px] font-mono text-slate-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {formatCurrency(item.total_sales)}
                        </div>
                        {/* Bar */}
                        <div className="w-full max-w-[36px] bg-slate-100 rounded-t-md relative flex items-end overflow-hidden h-32">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t-md transition-all duration-500 ${
                              hasSales
                                ? 'bg-delgone-navy-900 group-hover:bg-emerald-600'
                                : 'bg-slate-200'
                            }`}
                          />
                        </div>
                        {/* Day Label */}
                        <div className="mt-2 text-[11px] font-medium text-slate-500 text-center truncate w-full">
                          {item.day_label.split(',')[0]}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          {item.transaction_count} tx
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Aggregated by Addis Ababa calendar date</span>
            <span className="font-semibold text-slate-700">Currency: Ethiopian Birr (ETB)</span>
          </div>
        </div>

        {/* PAYMENT METHOD DISTRIBUTION */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <PieChart className="w-4 h-4 text-delgone-navy-800" />
              <h2 className="text-sm font-bold text-slate-900">
                Payment Distribution
              </h2>
            </div>

            <div className="mt-5">
              {isLoading ? (
                <div className="h-40 flex items-center justify-center text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin text-delgone-navy-800 mr-2" />
                  Calculating distribution...
                </div>
              ) : !data?.payment_methods || data.payment_methods.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-center p-4">
                  <PieChart className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No payment records</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Payments recorded in Phase 3 will populate this breakdown.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {data.payment_methods.map((method) => (
                    <div key={method.method} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">{method.method_label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-600">
                            {formatCurrency(method.total_amount)}
                          </span>
                          <span className="font-bold text-slate-900">{method.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${method.percentage}%` }}
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Includes Cash, Bank Transfers, and Mobile Money</span>
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS TABLE */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recent Counter Transactions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest sales recorded across active counter shifts
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="text-xs font-semibold text-delgone-navy-800 hover:text-delgone-navy-950 hover:underline"
          >
            View Complete Ledger &rarr;
          </button>
        </div>

        {/* Transactions Table or Empty State */}
        <div className="mt-4 overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-delgone-navy-800" />
              <span className="text-xs">Loading transactions...</span>
            </div>
          ) : !data?.recent_transactions || data.recent_transactions.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No sales recorded yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                The digital sales ledger is empty and fully prepared. Sales recording and paper receipt reconciliation will be activated in Phase 3.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Sale #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Paper Receipt #</th>
                  <th className="py-2.5 px-3">Cashier</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data.recent_transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => navigate(`/sales/${tx.id}`)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {tx.sale_number}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {formatDateTime(tx.sale_date)}
                    </td>
                    <td className="py-3 px-3 text-slate-800">
                      {tx.customer_name || <span className="text-slate-400">Walk-in</span>}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {tx.paper_receipt_number || '-'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {tx.created_by_name}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {formatCurrency(tx.grand_total)}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={tx.payment_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

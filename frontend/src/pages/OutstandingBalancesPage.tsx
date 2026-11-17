import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  DollarSign,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  AlertCircle,
  Building,
  Phone,
  ArrowUpDown,
  Calendar,
  Users,
} from 'lucide-react';
import { customerService } from '../services/customerService';
import { CustomerOutstandingItem } from '../types/customer';
import { formatCurrency, formatDate } from '../utils/formatters';

export const OutstandingBalancesPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [items, setItems] = useState<CustomerOutstandingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalReceivables, setTotalReceivables] = useState<number | string>(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [agingBucket, setAgingBucket] = useState<'all' | '0_30' | '31_60' | '61_90' | 'over_90'>('all');
  const [minBalance, setMinBalance] = useState<string>('');
  const [maxBalance, setMaxBalance] = useState<string>('');
  const [sortBy, setSortBy] = useState<'outstanding_balance' | 'name' | 'company_name' | 'oldest_unpaid'>('outstanding_balance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch outstanding receivables
  const fetchReceivables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await customerService.getOutstandingCustomers({
        aging_bucket: agingBucket,
        search: searchTerm.trim() || undefined,
        min_balance: minBalance ? parseFloat(minBalance) : undefined,
        max_balance: maxBalance ? parseFloat(maxBalance) : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize,
      });

      setItems(res.items);
      setTotal(res.total);
      setTotalReceivables(res.total_receivables);
      setTotalPages(Math.max(1, Math.ceil(res.total / pageSize)));
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load outstanding balances');
    } finally {
      setLoading(false);
    }
  }, [agingBucket, searchTerm, minBalance, maxBalance, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    fetchReceivables();
  }, [fetchReceivables]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setAgingBucket('all');
    setMinBalance('');
    setMaxBalance('');
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/customers"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              Customers
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-amber-700">Receivables</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-amber-600" />
            Customer Outstanding Balances & Aging
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track receivables across trade clients, monitor aging brackets, and identify overdue credit accounts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchReceivables}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/customers"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            Customer Directory
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="text-sm">
            <p className="font-semibold">Error loading receivables:</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* High-level Receivables Overview Metric Card */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Total Company Receivables Due
            </span>
            <div className="mt-1 text-3xl font-mono font-extrabold text-amber-950">
              {formatCurrency(totalReceivables)}
            </div>
            <p className="text-xs text-amber-700/80 mt-1">
              Active unsettled credit and partial balances calculated under Addis Ababa business calendar
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs bg-white/90 p-4 rounded-xl border border-amber-200/80 shadow-xs">
            <div>
              <span className="text-slate-500 font-medium block">Clients with Balance</span>
              <span className="text-lg font-mono font-bold text-slate-900">{total}</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-slate-500 font-medium block">Filtered Aging Bracket</span>
              <span className="text-sm font-semibold capitalize text-amber-900">
                {agingBucket === 'all' ? 'All Aging Buckets' : `${agingBucket.replace('_', '-')} Days`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Aging Category Quick Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <span className="text-xs font-semibold text-slate-500 mr-1">Aging Category:</span>
        {[
          { key: 'all', label: 'All Balances' },
          { key: '0_30', label: '0–30 Days (Current)' },
          { key: '31_60', label: '31–60 Days' },
          { key: '61_90', label: '61–90 Days' },
          { key: 'over_90', label: '> 90 Days (Overdue)' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setAgingBucket(tab.key as any);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              agingBucket === tab.key
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search customer name, company, or phone..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Balance min/max & Sort */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500 font-medium">Min ETB:</span>
            <input
              type="number"
              value={minBalance}
              onChange={(e) => {
                setMinBalance(e.target.value);
                setPage(1);
              }}
              placeholder="0"
              className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500 font-medium">Max ETB:</span>
            <input
              type="number"
              value={maxBalance}
              onChange={(e) => {
                setMaxBalance(e.target.value);
                setPage(1);
              }}
              placeholder="Max"
              className="w-20 px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e: any) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="py-1.5 px-2 rounded-lg border border-slate-300 text-xs bg-white font-medium"
            >
              <option value="outstanding_balance">Balance Due</option>
              <option value="name">Customer Name</option>
              <option value="company_name">Company Name</option>
              <option value="oldest_unpaid">Oldest Unpaid Date</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))}
              className="py-1.5 px-2 rounded-lg border border-slate-300 text-xs bg-white hover:bg-slate-50 text-slate-700 font-mono"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>

          {(searchTerm || agingBucket !== 'all' || minBalance || maxBalance) && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Receivables Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3.5">Customer & Trade Name</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3 text-right">Total Purchases</th>
                <th className="py-3 px-3 text-right">Total Paid</th>
                <th className="py-3 px-3 text-right">Total Outstanding</th>
                <th className="py-3 px-3 text-center">Aging Distribution (ETB)</th>
                <th className="py-3 px-3">Oldest Unpaid</th>
                <th className="py-3 px-3">Last Payment</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                    Calculating client receivables and aging distribution...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No matching receivables found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || agingBucket !== 'all' || minBalance || maxBalance
                        ? 'Try clearing or widening your filter criteria.'
                        : 'No outstanding balances currently recorded.'}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const b0 = parseFloat(String(item.aging_0_30 || 0));
                  const b31 = parseFloat(String(item.aging_31_60 || 0));
                  const b61 = parseFloat(String(item.aging_61_90 || 0));
                  const b90 = parseFloat(String(item.aging_over_90 || 0));

                  return (
                    <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                      {/* Customer & Company */}
                      <td className="py-3 px-3.5">
                        <Link
                          to={`/customers/${item.id}`}
                          className="font-bold text-slate-900 text-sm hover:text-amber-800 hover:underline"
                        >
                          {item.name}
                        </Link>
                        {item.company_name && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{item.company_name}</span>
                          </div>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {item.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{item.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      {/* Total Purchases */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        {formatCurrency(item.total_purchases)}
                      </td>

                      {/* Total Paid */}
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                        {formatCurrency(item.total_paid)}
                      </td>

                      {/* Total Outstanding */}
                      <td className="py-3 px-3 text-right font-mono font-bold whitespace-nowrap">
                        <span className="bg-amber-100 text-amber-950 px-2.5 py-1 rounded-md border border-amber-300">
                          {formatCurrency(item.outstanding_balance)}
                        </span>
                      </td>

                      {/* Aging Distribution */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-mono text-[10px]">
                          {b0 > 0 && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200"
                              title="0-30 Days"
                            >
                              0-30d: {formatCurrency(b0)}
                            </span>
                          )}
                          {b31 > 0 && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200"
                              title="31-60 Days"
                            >
                              31-60d: {formatCurrency(b31)}
                            </span>
                          )}
                          {b61 > 0 && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200"
                              title="61-90 Days"
                            >
                              61-90d: {formatCurrency(b61)}
                            </span>
                          )}
                          {b90 > 0 && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-bold"
                              title="Over 90 Days"
                            >
                              &gt;90d: {formatCurrency(b90)}
                            </span>
                          )}
                          {b0 === 0 && b31 === 0 && b61 === 0 && b90 === 0 && (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </div>
                      </td>

                      {/* Oldest Unpaid Sale Date */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {item.oldest_unpaid_sale_date ? (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formatDate(item.oldest_unpaid_sale_date)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Last Payment Date */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {item.last_payment_date ? (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3 h-3 text-emerald-500" />
                            <span>{formatDate(item.last_payment_date)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No payments</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/customers/${item.id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-700" />
                          Statement
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {items.length > 0 ? (page - 1) * pageSize + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(page * pageSize, total)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{total}</span> customers
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutstandingBalancesPage;

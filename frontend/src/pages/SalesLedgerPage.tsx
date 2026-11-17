import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  ArrowUpDown,
  Building,
  Calendar,
  X,
} from 'lucide-react';
import { saleService } from '../services/saleService';
import { SaleDetail, SaleListResponse } from '../types/sale';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';

export const SalesLedgerPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State from URL or defaults
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('payment_status') || '');
  const [methodFilter, setMethodFilter] = useState(searchParams.get('payment_method') || '');
  const [txStatusFilter, setTxStatusFilter] = useState<'active' | 'voided' | 'all'>(
    (searchParams.get('transaction_status') as any) || 'all'
  );
  const [balanceFilter, setBalanceFilter] = useState<string>(searchParams.get('balance') || 'all');
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '');
  const [sortBy, setSortBy] = useState<
    'sale_date' | 'sale_number' | 'fs_number' | 'customer_name' | 'grand_total' | 'outstanding_balance'
  >((searchParams.get('sort_by') as any) || 'sale_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sort_order') as any) || 'desc'
  );
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize] = useState(15);

  // Data state
  const [sales, setSales] = useState<SaleDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync state to URL search params
  const syncUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (statusFilter) params.set('payment_status', statusFilter);
    if (methodFilter) params.set('payment_method', methodFilter);
    if (txStatusFilter !== 'all') params.set('transaction_status', txStatusFilter);
    if (balanceFilter !== 'all') params.set('balance', balanceFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (sortBy !== 'sale_date') params.set('sort_by', sortBy);
    if (sortOrder !== 'desc') params.set('sort_order', sortOrder);
    if (page > 1) params.set('page', String(page));

    setSearchParams(params, { replace: true });
  }, [searchTerm, statusFilter, methodFilter, txStatusFilter, balanceFilter, dateFrom, dateTo, sortBy, sortOrder, page, setSearchParams]);

  // Fetch sales
  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let hasBalanceParam: boolean | undefined = undefined;
      if (balanceFilter === 'has_balance') hasBalanceParam = true;
      if (balanceFilter === 'settled') hasBalanceParam = false;

      const res: SaleListResponse = await saleService.getSales({
        search: searchTerm.trim() || undefined,
        payment_status: statusFilter || undefined,
        payment_method: methodFilter || undefined,
        transaction_status: txStatusFilter !== 'all' ? txStatusFilter : undefined,
        has_balance: hasBalanceParam,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize,
      });

      setSales(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load sales ledger');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, methodFilter, txStatusFilter, balanceFilter, dateFrom, dateTo, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    fetchSales();
    syncUrlParams();
  }, [fetchSales, syncUrlParams]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleSortColumn = (
    column: 'sale_date' | 'sale_number' | 'fs_number' | 'customer_name' | 'grand_total' | 'outstanding_balance'
  ) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setMethodFilter('');
    setTxStatusFilter('all');
    setBalanceFilter('all');
    setDateFrom('');
    setDateTo('');
    setSortBy('sale_date');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    statusFilter ||
    methodFilter ||
    txStatusFilter !== 'all' ||
    balanceFilter !== 'all' ||
    dateFrom ||
    dateTo
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-delgone-navy-800" />
            Advanced Digital Sales Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete transaction register, customs FS tracking, multi-criteria audit filtering, and real-time reconciliation
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchSales}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/sales/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-delgone-navy-800 text-white hover:bg-delgone-navy-900 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Record New Sale
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="text-sm">
            <p className="font-semibold">Error loading ledger records:</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Advanced Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        {/* Row 1: Primary Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by Sale # (e.g. DL-2026-0001), FS # (preserves zeroes), Customer Name, Company, Phone, Receipt #, or Product..."
            className="w-full pl-9 pr-9 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500 shadow-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setPage(1);
              }}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Row 2: Secondary Dropdown & Date Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-500">Filter By:</span>
          </div>

          {/* Payment Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-1 focus:ring-delgone-navy-500"
          >
            <option value="">Payment: All</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="credit">Credit (Unpaid)</option>
            <option value="voided">Voided</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
            className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-1 focus:ring-delgone-navy-500"
          >
            <option value="">Method: All</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="telebirr">Telebirr</option>
            <option value="cbe_birr">CBE Birr</option>
          </select>

          {/* Transaction Status Filter (Active / Voided / All) */}
          <select
            value={txStatusFilter}
            onChange={(e: any) => {
              setTxStatusFilter(e.target.value);
              setPage(1);
            }}
            className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-1 focus:ring-delgone-navy-500"
          >
            <option value="all">Records: Active & Voided</option>
            <option value="active">Active Only</option>
            <option value="voided">Voided Only</option>
          </select>

          {/* Balance Filter (Has Balance / Settled) */}
          <select
            value={balanceFilter}
            onChange={(e) => {
              setBalanceFilter(e.target.value);
              setPage(1);
            }}
            className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-1 focus:ring-delgone-navy-500"
          >
            <option value="all">Balance: All</option>
            <option value="has_balance">Has Balance Due (&gt; 0)</option>
            <option value="settled">Settled (0.00 ETB)</option>
          </select>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs text-slate-700 focus:outline-none"
              title="From Date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs text-slate-700 focus:outline-none"
              title="To Date"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded hover:bg-rose-50"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th
                  onClick={() => handleSortColumn('sale_number')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Sale #</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortColumn('fs_number')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>FS Number</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortColumn('sale_date')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Date (Addis)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSortColumn('customer_name')}
                  className="py-3 px-3.5 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Customer & Trade</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap">Paper Receipt</th>
                <th
                  onClick={() => handleSortColumn('grand_total')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Grand Total</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Paid</th>
                <th
                  onClick={() => handleSortColumn('outstanding_balance')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Balance Due</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-3 whitespace-nowrap">Cashier</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-delgone-navy-700" />
                    Loading digital ledger records...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No transactions found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {hasActiveFilters
                        ? 'Try clearing or broadening your search criteria.'
                        : 'No sales recorded yet. Click "Record New Sale" to begin.'}
                    </p>
                  </td>
                </tr>
              ) : (
                sales.map((sale) => {
                  const isVoid = sale.payment_status === 'voided' || sale.voided_at != null;
                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isVoid ? 'bg-rose-50/30 text-slate-500' : ''
                      }`}
                    >
                      {/* Sale Number */}
                      <td className="py-3 px-3.5 font-mono font-bold text-delgone-navy-900 whitespace-nowrap">
                        {sale.sale_number}
                        {isVoid && (
                          <span className="ml-1.5 px-1 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            VOID
                          </span>
                        )}
                      </td>

                      {/* FS Number (leading zeros preserved) */}
                      <td className="py-3 px-3 font-mono font-medium text-slate-800 whitespace-nowrap">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                          {sale.fs_number || '-'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {formatDateTime(sale.sale_date)}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3.5 text-slate-800">
                        {sale.customer_id ? (
                          <div>
                            <button
                              type="button"
                              onClick={() => navigate(`/customers/${sale.customer_id}`)}
                              className="font-semibold text-delgone-navy-900 hover:underline text-left block"
                            >
                              {sale.customer_name}
                            </button>
                            {sale.customer_company_name && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                <Building className="w-3 h-3 text-slate-400" />
                                <span>{sale.customer_company_name}</span>
                              </div>
                            )}
                          </div>
                        ) : sale.customer_name ? (
                          <span className="font-medium">{sale.customer_name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Walk-in</span>
                        )}
                      </td>

                      {/* Paper Receipt */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {sale.paper_receipt_number || '-'}
                      </td>

                      {/* Grand Total */}
                      <td className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${isVoid ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {formatCurrency(sale.grand_total)}
                      </td>

                      {/* Paid */}
                      <td className={`py-3 px-3 text-right font-mono whitespace-nowrap ${isVoid ? 'text-slate-400' : 'text-emerald-700'}`}>
                        {formatCurrency(sale.total_paid)}
                      </td>

                      {/* Balance */}
                      <td className="py-3 px-3 text-right font-mono font-semibold whitespace-nowrap">
                        {isVoid ? (
                          <span className="text-slate-400 italic">Excluded</span>
                        ) : parseFloat(String(sale.outstanding_balance)) > 0 ? (
                          <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {formatCurrency(sale.outstanding_balance)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0.00 ETB</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <StatusBadge status={sale.payment_status} />
                      </td>

                      {/* Cashier */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {sale.created_by_name}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/sales/${sale.id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-delgone-navy-700" />
                          Details
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
              {sales.length > 0 ? (page - 1) * pageSize + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(page * pageSize, total)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{total}</span> transactions
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

export default SalesLedgerPage;

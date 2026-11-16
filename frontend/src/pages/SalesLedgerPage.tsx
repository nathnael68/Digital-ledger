import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { saleService } from '../services/saleService';
import { SaleDetail, SaleListResponse } from '../types/sale';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';

export const SalesLedgerPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [sales, setSales] = useState<SaleDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: SaleListResponse = await saleService.getSales({
        search: searchTerm.trim() || undefined,
        payment_status: statusFilter || undefined,
        payment_method: methodFilter || undefined,
        page,
        page_size: pageSize,
      });
      setSales(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: any) {
      setError(err.message || 'Failed to load sales ledger');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, methodFilter, page, pageSize]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Debounce search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setMethodFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Digital Sales Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete transaction register, customs FS tracking, and payment status records
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchSales}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
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

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search sale #, FS #, customer, receipt #, or product..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-delgone-navy-500 font-medium"
            >
              <option value="">Status: All</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="credit">Credit (Unpaid)</option>
              <option value="voided">Voided</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
              className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-delgone-navy-500 font-medium"
            >
              <option value="">Payment: All</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="telebirr">Telebirr</option>
            </select>
          </div>

          {(searchTerm || statusFilter || methodFilter) && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
            >
              Clear Filters
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
                <th className="py-3 px-3.5">Sale #</th>
                <th className="py-3 px-3">FS Number</th>
                <th className="py-3 px-3">Date (Addis)</th>
                <th className="py-3 px-3.5">Customer</th>
                <th className="py-3 px-3">Paper Receipt</th>
                <th className="py-3 px-3 text-right">Grand Total</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Balance</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Cashier</th>
                <th className="py-3 px-3 text-center">Action</th>
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
                      {searchTerm || statusFilter || methodFilter
                        ? 'Try adjusting your search filters.'
                        : 'No sales recorded yet. Click "Record New Sale" to begin.'}
                    </p>
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      sale.payment_status === 'voided' ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    {/* Sale Number */}
                    <td className="py-3 px-3.5 font-mono font-bold text-delgone-navy-900 whitespace-nowrap">
                      {sale.sale_number}
                    </td>

                    {/* FS Number */}
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
                    <td className="py-3 px-3.5 font-medium text-slate-800">
                      {sale.customer_name ? (
                        <span>{sale.customer_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Walk-in</span>
                      )}
                    </td>

                    {/* Paper Receipt */}
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {sale.paper_receipt_number || '-'}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(sale.grand_total)}
                    </td>

                    {/* Paid */}
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                      {formatCurrency(sale.total_paid)}
                    </td>

                    {/* Balance */}
                    <td className="py-3 px-3 text-right font-mono font-semibold whitespace-nowrap">
                      {parseFloat(String(sale.outstanding_balance)) > 0 ? (
                        <span className="text-amber-700 font-bold">
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
                ))
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

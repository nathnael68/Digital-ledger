import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Receipt,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Eye,
  PlusCircle,
  Edit,
  UserX,
  UserCheck,
  RefreshCw,
  X,
  FileText,
} from 'lucide-react';
import { customerService } from '../services/customerService';
import {
  Customer,
  CustomerFinancialSummary,
  CustomerUpdateInput,
} from '../types/customer';
import { SaleDetail, PaymentRecord } from '../types/sale';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';

export const CustomerProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [financials, setFinancials] = useState<CustomerFinancialSummary | null>(null);
  const [sales, setSales] = useState<SaleDetail[]>([]);
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesPage, setSalesPage] = useState(1);
  const [salesTotalPages, setSalesTotalPages] = useState(1);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);

  const [activeTab, setActiveTab] = useState<'sales' | 'payments' | 'details'>('sales');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit / Status Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formTin, setFormTin] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAltPhone, setFormAltPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load customer data
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [custData, finData, salesData, paymentsData] = await Promise.all([
        customerService.getCustomerById(id),
        customerService.getFinancialSummary(id),
        customerService.getCustomerSales(id, { page: salesPage, page_size: 10 }),
        customerService.getCustomerPayments(id, { page: paymentsPage, page_size: 10 }),
      ]);

      setCustomer(custData);
      setFinancials(finData);
      setSales(salesData.items);
      setSalesTotal(salesData.total);
      setSalesTotalPages(salesData.total_pages);
      setPayments(paymentsData.items);
      setPaymentsTotal(paymentsData.total);
      setPaymentsTotalPages(paymentsData.total_pages);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  }, [id, salesPage, paymentsPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openEditModal = () => {
    if (!customer) return;
    setFormName(customer.name);
    setFormCompany(customer.company_name || '');
    setFormTin(customer.tin_number || '');
    setFormPhone(customer.phone || '');
    setFormAltPhone(customer.alt_phone || '');
    setFormEmail(customer.email || '');
    setFormAddress(customer.address || '');
    setFormNotes(customer.notes || '');
    setFormReason('');
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const openStatusModal = () => {
    if (!customer) return;
    setFormReason('');
    setFormError(null);
    setIsStatusModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Customer name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CustomerUpdateInput = {
        name: formName.trim(),
        company_name: formCompany.trim() || undefined,
        tin_number: formTin.trim() || undefined,
        phone: formPhone.trim() || undefined,
        alt_phone: formAltPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        notes: formNotes.trim() || undefined,
        reason: formReason.trim() || undefined,
      };

      await customerService.updateCustomer(customer.id, payload);
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err.message || 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const nextStatus = !customer.is_active;
      await customerService.updateStatus(customer.id, {
        is_active: nextStatus,
        reason: formReason.trim() || undefined,
      });
      setIsStatusModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err.message || 'Failed to change status');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !customer) {
    return (
      <div className="py-24 text-center max-w-7xl mx-auto">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-delgone-navy-800" />
        <p className="text-sm font-semibold text-slate-700">Loading customer account profile...</p>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 shadow-sm">
          <AlertCircle className="w-8 h-8 text-rose-600 mb-2" />
          <h2 className="text-lg font-bold">Failed to load customer</h2>
          <p className="text-sm mt-1">{error}</p>
          <div className="mt-4">
            <Link
              to="/customers"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-delgone-navy-800 text-white text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              Return to Customer Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const balanceNum = parseFloat(String(financials?.current_outstanding_balance || 0));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-delgone-navy-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Customer Directory
        </Link>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Customer Header Profile Card */}
      {customer && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-delgone-navy-50 border border-delgone-navy-100 flex items-center justify-center flex-shrink-0 text-delgone-navy-800 font-bold text-xl">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {customer.name}
                  </h1>
                  {customer.is_active ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Active Customer
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                      Inactive Account
                    </span>
                  )}
                </div>

                {customer.company_name && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span>{customer.company_name}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-slate-600">
                  {customer.phone && (
                    <div className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.tin_number && (
                    <div className="inline-flex items-center gap-1.5 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-500 font-sans">TIN:</span>
                      <span className="text-slate-800 font-semibold">{customer.tin_number}</span>
                    </div>
                  )}
                  {customer.alt_phone && (
                    <div className="flex items-center gap-1.5 font-mono text-slate-500">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Alt:</span>
                      <span>{customer.alt_phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{customer.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Registered {formatDateTime(customer.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 self-start">
              <button
                type="button"
                onClick={openEditModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
              >
                <Edit className="w-3.5 h-3.5 text-slate-500" />
                Edit Profile
              </button>
              <button
                type="button"
                onClick={openStatusModal}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border shadow-xs ${
                  customer.is_active
                    ? 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800'
                    : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                }`}
              >
                {customer.is_active ? (
                  <>
                    <UserX className="w-3.5 h-3.5" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    Reactivate
                  </>
                )}
              </button>
              {customer.is_active && (
                <button
                  type="button"
                  onClick={() => navigate('/sales/new', { state: { preselectedCustomer: customer } })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-delgone-navy-800 text-white hover:bg-delgone-navy-900 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  New Sale for Client
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Financial KPI Cards */}
      {financials && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Lifetime Purchases */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Lifetime Revenue</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-xl font-mono font-bold text-slate-900">
              {formatCurrency(financials.total_sales_amount)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Across {financials.total_sales_count} active transaction(s)
            </div>
          </div>

          {/* Total Payments Collected */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Total Payments Collected</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-xl font-mono font-bold text-emerald-700">
              {formatCurrency(financials.total_amount_paid)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Settled payments across cash & banks
            </div>
          </div>

          {/* Current Outstanding Balance */}
          <div
            className={`rounded-xl border p-5 shadow-xs ${
              balanceNum > 0
                ? 'border-amber-300 bg-amber-50/50'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Current Outstanding Due</span>
              {balanceNum > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              )}
            </div>
            <div
              className={`mt-2 text-xl font-mono font-bold ${
                balanceNum > 0 ? 'text-amber-900' : 'text-slate-900'
              }`}
            >
              {formatCurrency(financials.current_outstanding_balance)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {balanceNum > 0 ? (
                <span className="text-amber-800 font-semibold">Active trade credit due</span>
              ) : (
                'All sales fully settled'
              )}
            </div>
          </div>

          {/* Pending Invoices Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Unsettled Transactions</span>
              <Receipt className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-mono font-bold text-slate-900">
                {financials.unpaid_sales_count + financials.partial_sales_count}
              </span>
              <span className="text-xs text-slate-500">open invoice(s)</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2">
              <span className="text-rose-700 font-semibold">{financials.unpaid_sales_count} credit</span>
              <span>•</span>
              <span className="text-amber-700 font-semibold">{financials.partial_sales_count} partial</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'sales'
              ? 'border-delgone-navy-800 text-delgone-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Sales History ({salesTotal})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'border-delgone-navy-800 text-delgone-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Payment Receipts ({paymentsTotal})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'details'
              ? 'border-delgone-navy-800 text-delgone-navy-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Account Details & Notes
        </button>
      </div>

      {/* Tab 1: Sales History */}
      {activeTab === 'sales' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3.5">Sale #</th>
                  <th className="py-3 px-3">FS Number</th>
                  <th className="py-3 px-3">Date (Addis)</th>
                  <th className="py-3 px-3">Paper Receipt</th>
                  <th className="py-3 px-3 text-right">Grand Total</th>
                  <th className="py-3 px-3 text-right">Paid</th>
                  <th className="py-3 px-3 text-right">Balance Due</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Cashier</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-700">No sales transactions recorded</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Transactions recorded for this customer will appear here.
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
                          isVoid ? 'bg-rose-50/40 text-slate-500' : ''
                        }`}
                      >
                        <td className="py-3 px-3.5 font-mono font-bold text-delgone-navy-900 whitespace-nowrap">
                          {sale.sale_number}
                          {isVoid && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              VOIDED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-medium whitespace-nowrap">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200 text-slate-800">
                            {sale.fs_number || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {formatDateTime(sale.sale_date)}
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {sale.paper_receipt_number || '-'}
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${isVoid ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {formatCurrency(sale.grand_total)}
                        </td>
                        <td className={`py-3 px-3 text-right font-mono whitespace-nowrap ${isVoid ? 'text-slate-400' : 'text-emerald-700'}`}>
                          {formatCurrency(sale.total_paid)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold whitespace-nowrap">
                          {isVoid ? (
                            <span className="text-slate-400 italic">Excluded (Void)</span>
                          ) : parseFloat(String(sale.outstanding_balance)) > 0 ? (
                            <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              {formatCurrency(sale.outstanding_balance)}
                            </span>
                          ) : (
                            <span className="text-slate-400">0.00 ETB</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <StatusBadge status={sale.payment_status} />
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {sale.created_by_name}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => navigate(`/sales/${sale.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-delgone-navy-800" />
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

          {/* Sales Pagination */}
          {salesTotalPages > 1 && (
            <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
              <span>
                Page {salesPage} of {salesTotalPages} ({salesTotal} total sales)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={salesPage <= 1}
                  onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded border border-slate-300 bg-white disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={salesPage >= salesTotalPages}
                  onClick={() => setSalesPage((p) => Math.min(salesTotalPages, p + 1))}
                  className="p-1 rounded border border-slate-300 bg-white disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Payment History */}
      {activeTab === 'payments' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3.5">Payment Date</th>
                  <th className="py-3 px-3">Associated Sale #</th>
                  <th className="py-3 px-3">Payment Method</th>
                  <th className="py-3 px-3">Slip / Reference</th>
                  <th className="py-3 px-3 text-right">Amount Received</th>
                  <th className="py-3 px-3">Recorded By (Cashier)</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-700">No payment receipts found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        When payments or settlements are logged, they will be listed here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5 text-slate-800 font-medium whitespace-nowrap">
                        {formatDateTime(p.payment_date || p.created_at)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-delgone-navy-900 whitespace-nowrap">
                        <Link
                          to={`/sales/${p.sale_id}`}
                          className="hover:underline text-delgone-navy-800"
                        >
                          {(p as any).sale_number || 'View Sale'}
                        </Link>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="capitalize px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {p.payment_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {p.reference || '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {p.recorded_by_name}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/sales/${p.sale_id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-delgone-navy-800" />
                          View Sale
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Payments Pagination */}
          {paymentsTotalPages > 1 && (
            <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
              <span>
                Page {paymentsPage} of {paymentsTotalPages} ({paymentsTotal} total payment receipts)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={paymentsPage <= 1}
                  onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded border border-slate-300 bg-white disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={paymentsPage >= paymentsTotalPages}
                  onClick={() => setPaymentsPage((p) => Math.min(paymentsTotalPages, p + 1))}
                  className="p-1 rounded border border-slate-300 bg-white disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Details & Notes */}
      {activeTab === 'details' && customer && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium block">Full Name:</span>
                <span className="font-semibold text-slate-800 text-sm">{customer.name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Trade / Business Name:</span>
                <span className="font-semibold text-slate-800 text-sm">
                  {customer.company_name || 'Individual / Non-commercial'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">TIN Number (Taxpayer ID):</span>
                <span className="font-mono font-medium text-slate-800">
                  {customer.tin_number || 'Not recorded'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Primary Phone:</span>
                <span className="font-mono font-medium text-slate-800">
                  {customer.phone || 'Not recorded'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Alternative Phone:</span>
                <span className="font-mono font-medium text-slate-800">
                  {customer.alt_phone || 'None'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Email:</span>
                <span className="text-slate-800">{customer.email || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium block">Physical Address:</span>
                <span className="text-slate-800">{customer.address || 'None'}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
              Counter Notes & Remarks
            </h3>
            <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {customer.notes || 'No notes recorded for this customer.'}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
              Audit & Record Identifiers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-xs font-mono text-slate-600">
              <div>
                <span className="text-slate-400 block text-[11px] font-sans">System ID:</span>
                <span className="text-slate-700">{customer.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-sans">Created At:</span>
                <span className="text-slate-700">{formatDateTime(customer.created_at)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-sans">Last Updated:</span>
                <span className="text-slate-700">{formatDateTime(customer.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {isEditModalOpen && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 my-8 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Customer Information</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update customer record details with audit trail logging
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business / Company Name
                  </label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    TIN Number (10 digits, Optional)
                  </label>
                  <input
                    type="text"
                    value={formTin}
                    onChange={(e) => setFormTin(e.target.value)}
                    placeholder="e.g. 0012345678"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alt. Phone
                  </label>
                  <input
                    type="text"
                    value={formAltPhone}
                    onChange={(e) => setFormAltPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Address / Location
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Modification (Audit Trail)
                </label>
                <input
                  type="text"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Updated customer company and contact details"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-delgone-navy-800 text-white hover:bg-delgone-navy-900 disabled:opacity-50 shadow-sm"
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Toggle Modal */}
      {isStatusModalOpen && customer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl flex-shrink-0 ${
                  customer.is_active
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {customer.is_active ? (
                  <UserX className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  {customer.is_active ? 'Deactivate Customer' : 'Reactivate Customer'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {customer.is_active ? (
                    <>
                      Deactivating <strong>{customer.name}</strong> will prevent selecting this
                      account for new sales. Historical transactions and ledger credit balances will remain
                      fully intact.
                    </>
                  ) : (
                    <>
                      Reactivating <strong>{customer.name}</strong> will allow employees to select
                      this customer for new sales transactions again.
                    </>
                  )}
                </p>
              </div>
            </div>

            <form onSubmit={handleStatusSubmit} className="mt-4 space-y-3">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for status change (Optional)
                </label>
                <input
                  type="text"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Account suspended pending credit reconciliation"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg text-white shadow-sm disabled:opacity-50 ${
                    customer.is_active
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {submitting
                    ? 'Updating...'
                    : customer.is_active
                    ? 'Confirm Deactivation'
                    : 'Confirm Reactivation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfilePage;

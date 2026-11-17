import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  UserX,
  UserCheck,
  AlertTriangle,
  AlertCircle,
  ArrowUpDown,
  Phone,
  Building,
  Mail,
  DollarSign,
  X,
  CheckCircle,
} from 'lucide-react';
import { customerService } from '../services/customerService';
import {
  Customer,
  CustomerListItem,
  CustomerCreateInput,
  CustomerUpdateInput,
} from '../types/customer';
import { formatCurrency } from '../utils/formatters';

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all', 'active', 'inactive'
  const [sortBy, setSortBy] = useState<
    'name' | 'company_name' | 'created_at' | 'outstanding_balance' | 'total_purchases'
  >('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);

  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAltPhone, setFormAltPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formReason, setFormReason] = useState('');
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<Customer[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let isActiveParam: boolean | undefined = undefined;
      if (statusFilter === 'active') isActiveParam = true;
      if (statusFilter === 'inactive') isActiveParam = false;

      const res = await customerService.getCustomers({
        search: searchTerm.trim() || undefined,
        is_active: isActiveParam,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        page_size: pageSize,
      });

      setCustomers(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, sortBy, sortOrder, page, pageSize]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Debounce search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormName('');
    setFormCompany('');
    setFormPhone('');
    setFormAltPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormNotes('');
    setFormReason('');
    setConfirmDuplicate(false);
    setDuplicateMatches([]);
    setDuplicateWarning(null);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (cust: CustomerListItem) => {
    setSelectedCustomer(cust);
    setFormName(cust.name);
    setFormCompany(cust.company_name || '');
    setFormPhone(cust.phone || '');
    setFormAltPhone(cust.alt_phone || '');
    setFormEmail(cust.email || '');
    setFormAddress(cust.address || '');
    setFormNotes(cust.notes || '');
    setFormReason('');
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Open Status Toggle Modal
  const openStatusModal = (cust: CustomerListItem) => {
    setSelectedCustomer(cust);
    setFormReason('');
    setFormError(null);
    setIsStatusModalOpen(true);
  };

  // Handle Add Customer Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Customer name is required.');
      return;
    }

    setSubmitting(true);
    try {
      // First check for duplicates if not already confirmed
      if (!confirmDuplicate) {
        const dupCheck = await customerService.checkDuplicate({
          name: formName.trim(),
          company_name: formCompany.trim() || undefined,
          phone: formPhone.trim() || undefined,
          email: formEmail.trim() || undefined,
        });

        if (dupCheck.has_matches) {
          setDuplicateMatches(dupCheck.possible_duplicates);
          setDuplicateWarning(dupCheck.message);
          setSubmitting(false);
          return;
        }
      }

      // Proceed with creation
      const payload: CustomerCreateInput = {
        name: formName.trim(),
        company_name: formCompany.trim() || undefined,
        phone: formPhone.trim() || undefined,
        alt_phone: formAltPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        notes: formNotes.trim() || undefined,
        confirm_duplicate: confirmDuplicate,
      };

      await customerService.createCustomer(payload);
      setIsAddModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 409 && Array.isArray(detail?.matches)) {
        setDuplicateMatches(detail.matches);
        setDuplicateWarning(detail.message || 'Possible duplicate customer detected.');
      } else {
        setFormError(typeof detail === 'string' ? detail : err.message || 'Failed to create customer');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Customer Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
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
        phone: formPhone.trim() || undefined,
        alt_phone: formAltPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        address: formAddress.trim() || undefined,
        notes: formNotes.trim() || undefined,
        reason: formReason.trim() || undefined,
      };

      await customerService.updateCustomer(selectedCustomer.id, payload);
      setIsEditModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err.message || 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Status Toggle Submit
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const nextStatus = !selectedCustomer.is_active;
      await customerService.updateStatus(selectedCustomer.id, {
        is_active: nextStatus,
        reason: formReason.trim() || undefined,
      });
      setIsStatusModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || err.message || 'Failed to change customer status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-delgone-navy-800" />
            Customer Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain client records, trade accounts, verify duplicates, and monitor live credit balances
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/customers/outstanding"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 shadow-xs transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-700" />
            Outstanding Balances
          </Link>
          <button
            type="button"
            onClick={fetchCustomers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-delgone-navy-800 text-white hover:bg-delgone-navy-900 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Customer
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="text-sm">
            <p className="font-semibold">Error loading customers:</p>
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
            placeholder="Search by customer name, company, phone, or email..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
          />
        </div>

        {/* Status Filter & Sorting */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tab / Select */}
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <span className="font-medium text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-delgone-navy-500 font-medium"
            >
              <option value="all">All Accounts</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Sort By Select */}
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e: any) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-delgone-navy-500 font-medium"
            >
              <option value="created_at">Date Registered</option>
              <option value="name">Customer Name</option>
              <option value="company_name">Company Name</option>
              <option value="outstanding_balance">Outstanding Balance</option>
              <option value="total_purchases">Total Purchases</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="py-1.5 px-2 rounded-lg border border-slate-300 text-xs bg-white hover:bg-slate-50 text-slate-700 font-mono"
              title="Toggle Sort Order"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>

          {(searchTerm || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPage(1);
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3.5">Customer & Company</th>
                <th className="py-3 px-3">Contact Details</th>
                <th className="py-3 px-3 text-right">Lifetime Sales</th>
                <th className="py-3 px-3 text-right">Total Paid</th>
                <th className="py-3 px-3 text-right">Outstanding Due</th>
                <th className="py-3 px-3 text-center">Invoices</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-delgone-navy-700" />
                    Loading customer directory...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-700">No customers found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm || statusFilter !== 'all'
                        ? 'Try adjusting your search criteria.'
                        : 'No customers registered yet. Click "New Customer" to register one.'}
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((cust) => {
                  const balanceNum = parseFloat(String(cust.outstanding_balance || 0));
                  return (
                    <tr
                      key={cust.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !cust.is_active ? 'bg-slate-50/50 opacity-75' : ''
                      }`}
                    >
                      {/* Name & Company */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 text-sm">
                          <Link
                            to={`/customers/${cust.id}`}
                            className="hover:text-delgone-navy-700 hover:underline"
                          >
                            {cust.name}
                          </Link>
                        </div>
                        {cust.company_name ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{cust.company_name}</span>
                          </div>
                        ) : null}
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-3 text-slate-600">
                        {cust.phone ? (
                          <div className="flex items-center gap-1 font-mono text-xs">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{cust.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No phone</span>
                        )}
                        {cust.email && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{cust.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Total Purchases */}
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 whitespace-nowrap">
                        {formatCurrency(cust.total_purchases)}
                      </td>

                      {/* Total Paid */}
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 whitespace-nowrap">
                        {formatCurrency(cust.total_paid)}
                      </td>

                      {/* Outstanding Balance */}
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        {balanceNum > 0 ? (
                          <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {formatCurrency(cust.outstanding_balance)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0.00 ETB</span>
                        )}
                      </td>

                      {/* Active Sales Count */}
                      <td className="py-3 px-3 text-center text-slate-600 font-mono">
                        {cust.active_sales_count}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {cust.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/customers/${cust.id}`)}
                            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs"
                            title="View Profile & Statements"
                          >
                            <Eye className="w-3.5 h-3.5 text-delgone-navy-800" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(cust)}
                            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs"
                            title="Edit Details"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openStatusModal(cust)}
                            className={`p-1.5 rounded border shadow-xs ${
                              cust.is_active
                                ? 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700'
                                : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            }`}
                            title={cust.is_active ? 'Deactivate Customer' : 'Activate Customer'}
                          >
                            {cust.is_active ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
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
              {customers.length > 0 ? (page - 1) * pageSize + 1 : 0}
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

      {/* ============================================================== */}
      {/* ADD CUSTOMER MODAL */}
      {/* ============================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 my-8 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Register New Customer</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create a customer profile for invoicing, trade credit, and receipts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {formError}
                </div>
              )}

              {/* Duplicate Warning Alert */}
              {duplicateWarning && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{duplicateWarning}</p>
                      <p className="mt-0.5 text-amber-800">
                        The following existing customer record(s) closely match the entered details:
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-2.5 border border-amber-200 space-y-1 font-mono text-[11px]">
                    {duplicateMatches.map((m) => (
                      <div key={m.id} className="flex justify-between items-center py-0.5">
                        <span className="font-semibold text-slate-800">{m.name}</span>
                        <span className="text-slate-500">{m.company_name || 'Individual'}</span>
                        <span className="text-slate-600">{m.phone || 'No phone'}</span>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer font-medium text-amber-950">
                    <input
                      type="checkbox"
                      checked={confirmDuplicate}
                      onChange={(e) => setConfirmDuplicate(e.target.checked)}
                      className="rounded border-amber-400 text-delgone-navy-800 focus:ring-amber-500"
                    />
                    <span>I confirm this is a distinct business/client, not a duplicate.</span>
                  </label>
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
                  placeholder="e.g. Abebe Bekele"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business / Company Name (Optional)
                </label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="e.g. Abyssinia Graphic Design & Print"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 0911234567 or +251..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alt. Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={formAltPhone}
                    onChange={(e) => setFormAltPhone(e.target.value)}
                    placeholder="e.g. 0922334455"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. contact@abyssiniagraphics.et"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Address / Location (Optional)
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. Bole Sub-city, Woreda 03, Addis Ababa"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Special counter notes, billing terms, etc."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (duplicateWarning !== null && !confirmDuplicate)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-delgone-navy-800 text-white hover:bg-delgone-navy-900 disabled:opacity-50 shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* EDIT CUSTOMER MODAL */}
      {/* ============================================================== */}
      {isEditModalOpen && selectedCustomer && (
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
                  placeholder="e.g. Corrected company phone number per client call"
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

      {/* ============================================================== */}
      {/* STATUS TOGGLE MODAL */}
      {/* ============================================================== */}
      {isStatusModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl flex-shrink-0 ${
                  selectedCustomer.is_active
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {selectedCustomer.is_active ? (
                  <UserX className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  {selectedCustomer.is_active ? 'Deactivate Customer' : 'Reactivate Customer'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {selectedCustomer.is_active ? (
                    <>
                      Deactivating <strong>{selectedCustomer.name}</strong> will prevent selecting this
                      account for new sales. Historical transactions and ledger credit balances will remain
                      fully intact.
                    </>
                  ) : (
                    <>
                      Reactivating <strong>{selectedCustomer.name}</strong> will allow employees to select
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
                  placeholder="e.g. Account suspended pending credit review"
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
                    selectedCustomer.is_active
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {submitting
                    ? 'Updating...'
                    : selectedCustomer.is_active
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

export default CustomersPage;

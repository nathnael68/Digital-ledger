import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Building,
  User as UserIcon,
  CreditCard,
  Banknote,
  FileText,
  ArrowRight,
  RefreshCw,
  X,
  AlertTriangle,
  Printer,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saleService } from '../services/saleService';
import { customerService } from '../services/customerService';
import { Customer, Product, SaleDetail, SaleItemInput } from '../types/sale';
import { formatCurrency, numberToWords } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { CashSalesAttachment } from '../components/CashSalesAttachment';

export const NewSalePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Form State
  const [fsNumber, setFsNumber] = useState('');
  const [paperReceiptNumber, setPaperReceiptNumber] = useState('');
  const [buyerTin, setBuyerTin] = useState('');
  const [notes, setNotes] = useState('');

  // Customer State
  const [isWalkIn, setIsWalkIn] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustTin, setNewCustTin] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustConfirmDup, setNewCustConfirmDup] = useState(false);
  const [newCustDupWarning, setNewCustDupWarning] = useState<string | null>(null);
  const [newCustDupMatches, setNewCustDupMatches] = useState<any[]>([]);
  const [custModalError, setCustModalError] = useState<string | null>(null);

  // Check for preselected customer from navigation
  useEffect(() => {
    const pre = (location.state as any)?.preselectedCustomer;
    if (pre) {
      setSelectedCustomer(pre);
      setIsWalkIn(false);
    }
  }, [location.state]);

  // Catalog Products State
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [targetItemIndex, setTargetItemIndex] = useState<number | null>(null);

  // Line Items State
  const [items, setItems] = useState<SaleItemInput[]>([
    {
      product_id: null,
      product_name: '',
      unit: 'pcs',
      quantity: 1,
      unit_price: '',
    },
  ]);

  // Payment State
  const [discount, setDiscount] = useState<number | string>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'telebirr' | 'credit'>('cash');
  const [amountPaid, setAmountPaid] = useState<number | string>('');
  const [bankReference, setBankReference] = useState('');

  // UI / Submission State
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<SaleDetail | null>(null);

  // Load initial catalog items
  useEffect(() => {
    saleService.searchProducts('').then(setCatalogProducts).catch(console.error);
  }, []);

  // Customer search debounce
  useEffect(() => {
    if (isWalkIn) return;
    const timer = setTimeout(() => {
      setIsSearchingCustomers(true);
      saleService
        .searchCustomers(customerSearch)
        .then(setCustomerOptions)
        .catch(console.error)
        .finally(() => setIsSearchingCustomers(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch, isWalkIn]);

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => {
      const q = parseFloat(String(item.quantity)) || 0;
      const p = parseFloat(String(item.unit_price)) || 0;
      return acc + q * p;
    }, 0);
  }, [items]);

  const numDiscount = parseFloat(String(discount)) || 0;
  const taxableAmount = Math.max(0, subtotal - numDiscount);
  const vatRate = 0.15;
  const vatAmount = Math.round(taxableAmount * vatRate * 100) / 100;
  const grandTotal = Math.round((taxableAmount + vatAmount) * 100) / 100;

  // Keep amount paid in sync when payment method or grand total changes
  useEffect(() => {
    if (paymentMethod === 'credit') {
      setAmountPaid(0);
    } else {
      setAmountPaid(grandTotal > 0 ? grandTotal : '');
    }
  }, [paymentMethod, grandTotal]);

  const numAmountPaid = parseFloat(String(amountPaid)) || 0;
  const balanceDue = Math.max(0, grandTotal - numAmountPaid);

  // Item line handlers
  const handleItemChange = (index: number, field: keyof SaleItemInput, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        product_id: null,
        product_name: '',
        unit: 'pcs',
        quantity: 1,
        unit_price: '',
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length === 1) {
      setItems([
        {
          product_id: null,
          product_name: '',
          unit: 'pcs',
          quantity: 1,
          unit_price: '',
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const openCatalogForIndex = (index: number) => {
    setTargetItemIndex(index);
    setCatalogSearch('');
    setShowCatalogModal(true);
  };

  const selectCatalogProduct = (product: Product) => {
    if (targetItemIndex === null) return;
    setItems((prev) => {
      const updated = [...prev];
      updated[targetItemIndex] = {
        ...updated[targetItemIndex],
        product_id: product.id,
        product_name: product.name,
        unit: product.unit,
        unit_price: product.default_price,
      };
      return updated;
    });
    setShowCatalogModal(false);
    setTargetItemIndex(null);
  };

  // Quick Customer Creation
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      setCustModalError('Customer name is required');
      return;
    }
    if (!newCustTin.trim()) {
      setCustModalError('TIN Number is mandatory.');
      return;
    }
    const cleanCustTin = newCustTin.trim().replace(/[\s-]/g, '');
    if (!/^\d{9,12}$/.test(cleanCustTin)) {
      setCustModalError('TIN Number must be a valid 10-digit number (e.g., 0012345678).');
      return;
    }
    setCustModalError(null);
    try {
      const newCust = await customerService.createCustomer({
        name: newCustName.trim(),
        company_name: newCustCompany.trim() || undefined,
        tin_number: newCustTin.trim() || undefined,
        phone: newCustPhone.trim() || undefined,
        address: newCustAddress.trim() || undefined,
        confirm_duplicate: newCustConfirmDup,
      });
      setSelectedCustomer(newCust as any);
      if (newCustTin.trim() && !buyerTin) {
        setBuyerTin(newCustTin.trim());
      }
      setIsWalkIn(false);
      setShowNewCustomerModal(false);
      setNewCustName('');
      setNewCustCompany('');
      setNewCustTin('');
      setNewCustPhone('');
      setNewCustAddress('');
      setNewCustConfirmDup(false);
      setNewCustDupWarning(null);
      setNewCustDupMatches([]);
      setCustModalError(null);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 409 && Array.isArray(detail?.matches)) {
        setNewCustDupMatches(detail.matches);
        setNewCustDupWarning(detail.message || 'Possible duplicate customer detected.');
      } else {
        setCustModalError(typeof detail === 'string' ? detail : err.message || 'Failed to create customer');
      }
    }
  };

  // Validation before opening confirm modal
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fsNumber.trim()) {
      setError('FS Number (Customs Fiscal Reference) is mandatory.');
      return;
    }

    if (!buyerTin.trim()) {
      setError('Buyer TIN Number is mandatory.');
      return;
    }

    const cleanBuyerTin = buyerTin.trim().replace(/[\s-]/g, '');
    if (!/^\d{9,12}$/.test(cleanBuyerTin)) {
      setError('Buyer TIN Number must be a valid 10-digit number (e.g., 0012345678).');
      return;
    }

    if (!isWalkIn && !selectedCustomer) {
      setError('Please select a customer or switch to Walk-in Customer.');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one line item to the sale.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.product_name.trim()) {
        setError(`Line #${i + 1}: Description or product name cannot be blank.`);
        return;
      }
      const qty = parseFloat(String(item.quantity));
      if (isNaN(qty) || qty <= 0) {
        setError(`Line #${i + 1}: Quantity must be greater than zero.`);
        return;
      }
      const price = parseFloat(String(item.unit_price));
      if (isNaN(price) || price < 0) {
        setError(`Line #${i + 1}: Unit price must be a valid positive number or 0.`);
        return;
      }
    }

    if (numDiscount > subtotal) {
      setError(`Discount (${formatCurrency(numDiscount)}) cannot exceed the subtotal (${formatCurrency(subtotal)}).`);
      return;
    }

    if (numAmountPaid > grandTotal) {
      setError(`Payment amount (${formatCurrency(numAmountPaid)}) cannot exceed the grand total (${formatCurrency(grandTotal)}).`);
      return;
    }

    setShowConfirmModal(true);
  };

  // Final submission
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        fs_number: fsNumber.trim(),
        paper_receipt_number: paperReceiptNumber.trim() || undefined,
        buyer_tin: buyerTin.trim() || undefined,
        customer_id: isWalkIn ? null : selectedCustomer?.id,
        discount: numDiscount,
        vat_rate: 0.15,
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          product_id: item.product_id || null,
          product_name: item.product_name.trim(),
          description: item.product_name.trim(),
          unit: item.unit.trim().toLowerCase(),
          quantity: parseFloat(String(item.quantity)),
          unit_price: parseFloat(String(item.unit_price)),
        })),
        initial_payment:
          paymentMethod !== 'credit' && numAmountPaid > 0
            ? {
                payment_method: paymentMethod,
                amount: numAmountPaid,
                reference: bankReference.trim() || undefined,
              }
            : undefined,
        idempotency_key: `sale-ui-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      };

      const result = await saleService.createSale(payload);
      setCompletedSale(result);
      setShowConfirmModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to complete sales transaction.');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFsNumber('');
    setPaperReceiptNumber('');
    setBuyerTin('');
    setNotes('');
    setIsWalkIn(true);
    setSelectedCustomer(null);
    setItems([
      {
        product_id: null,
        product_name: '',
        unit: 'pcs',
        quantity: 1,
        unit_price: '',
      },
    ]);
    setDiscount(0);
    setPaymentMethod('cash');
    setAmountPaid('');
    setBankReference('');
    setError(null);
    setCompletedSale(null);
  };

  // SUCCESS SCREEN
  if (completedSale) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sale Recorded Successfully</h1>
          <p className="text-sm text-slate-500 mt-1">
            Transaction is finalized and recorded in the Digital Sales Ledger.
          </p>

          <div className="mt-6 bg-slate-50 border border-slate-200/80 rounded-xl p-5 text-left divide-y divide-slate-200/60">
            <div className="flex justify-between items-center pb-3">
              <span className="text-sm text-slate-500">Sale Number:</span>
              <span className="text-base font-bold text-delgone-navy-900 font-mono">
                {completedSale.sale_number}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-slate-500">FS Number (Customs):</span>
              <span className="text-sm font-semibold text-slate-900 font-mono">
                {completedSale.fs_number}
              </span>
            </div>
            {completedSale.paper_receipt_number && (
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-slate-500">Paper Receipt #:</span>
                <span className="text-sm font-medium text-slate-800">
                  {completedSale.paper_receipt_number}
                </span>
              </div>
            )}
            {completedSale.buyer_tin && (
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-slate-500">Buyer TIN #:</span>
                <span className="text-sm font-mono text-slate-800">
                  {completedSale.buyer_tin}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-slate-500">Customer:</span>
              <span className="text-sm font-medium text-slate-800">
                {completedSale.customer_name || 'Walk-in Customer'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 text-xs">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-mono text-slate-700">{formatCurrency(completedSale.subtotal)}</span>
            </div>
            {parseFloat(String(completedSale.discount || 0)) > 0 && (
              <div className="flex justify-between items-center py-2 text-xs text-rose-600">
                <span>Discount:</span>
                <span className="font-mono">- {formatCurrency(completedSale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-2 text-xs text-delgone-navy-800">
              <span className="font-semibold">VAT (15%):</span>
              <span className="font-mono font-bold">+ {formatCurrency(completedSale.vat_amount || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-900">Grand Total:</span>
              <span className="text-base font-bold text-emerald-700 font-mono">
                {formatCurrency(completedSale.grand_total)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-slate-500">Payment Status:</span>
              <StatusBadge status={completedSale.payment_status} />
            </div>
            <div className="flex justify-between items-center pt-3">
              <span className="text-sm text-slate-500">Balance Due:</span>
              <span className="text-sm font-semibold text-slate-800">
                {formatCurrency(completedSale.outstanding_balance)}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={() => setShowAttachmentModal(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-delgone-navy-300 bg-delgone-navy-50 text-delgone-navy-900 text-sm font-bold hover:bg-delgone-navy-100 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-delgone-navy-700" />
              Print Cash Sales Attachment
            </button>
            <button
              onClick={() => navigate(`/sales/${completedSale.id}`)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 shadow-sm transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              View Sale Details
            </button>
            <button
              onClick={() => navigate('/sales')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 shadow-sm transition-colors"
            >
              Go to Sales Ledger
            </button>
            <button
              onClick={resetForm}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-delgone-navy-800 text-white text-sm font-medium hover:bg-delgone-navy-900 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Record Another Sale
            </button>
          </div>

          {/* Printable Sales Attachment Modal */}
          {showAttachmentModal && completedSale && (
            <CashSalesAttachment
              sale={completedSale}
              onClose={() => setShowAttachmentModal(false)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Record New Sale
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-md">
              Live Terminal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cashier: <span className="font-semibold text-slate-700">{user?.full_name}</span> | Addis Ababa Time: {new Date().toLocaleDateString('en-US', { timeZone: 'Africa/Addis_Ababa', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/sales')}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 bg-white shadow-sm"
        >
          View Sales Ledger
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="text-sm">
            <p className="font-semibold">Unable to record sale:</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleProceedToReview} noValidate className="space-y-6">
        {/* Section 1: Transaction Metadata & Customer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadata Card */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileText className="w-4 h-4 text-delgone-navy-700" />
              1. Document References
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  FS Number (Customs Fiscal Ref) <span className="text-rose-600 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fsNumber}
                  onChange={(e) => setFsNumber(e.target.value)}
                  placeholder="e.g., FS-2026-00451"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Mandatory fiscal cash-register receipt number.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Paper Receipt Number (Optional)
                </label>
                <input
                  type="text"
                  value={paperReceiptNumber}
                  onChange={(e) => setPaperReceiptNumber(e.target.value)}
                  placeholder="e.g., PR-00892"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Physical receipt voucher book serial number.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Buyer TIN Number <span className="text-rose-600 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={buyerTin}
                  onChange={(e) => setBuyerTin(e.target.value)}
                  placeholder="e.g., 0012345678"
                  maxLength={50}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Mandatory 10-digit Taxpayer Identification Number.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Urgent printing job for piazza branch"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
              />
            </div>
          </div>

          {/* Customer Selection Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-delgone-navy-700" />
                2. Customer Selection
              </h2>
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="walkin-check"
                  checked={isWalkIn}
                  onChange={(e) => {
                    setIsWalkIn(e.target.checked);
                    if (e.target.checked) setSelectedCustomer(null);
                  }}
                  className="w-4 h-4 rounded text-delgone-navy-800 border-slate-300 focus:ring-delgone-navy-500"
                />
                <label htmlFor="walkin-check" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Walk-in
                </label>
              </div>
            </div>

            {isWalkIn ? (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-900 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Walk-in Customer (Over-the-counter)</p>
                  <p className="text-emerald-700 mt-0.5">
                    No customer account will be linked. Ideal for immediate cash retail sales.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search name or phone..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                  />
                </div>

                {isSearchingCustomers && (
                  <p className="text-[11px] text-slate-400">Searching customers...</p>
                )}

                {customerOptions.length > 0 && (
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-slate-50 text-xs">
                    {customerOptions.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          if (c.tin_number && !buyerTin) {
                            setBuyerTin(c.tin_number);
                          }
                          setCustomerSearch('');
                          setCustomerOptions([]);
                        }}
                        className="p-2 hover:bg-slate-100 cursor-pointer flex justify-between items-center"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">{c.name}</span>
                          {c.company_name && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              {c.company_name}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">{c.phone || '-'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedCustomer ? (
                  <div className="p-3 rounded-lg bg-delgone-navy-50 border border-delgone-navy-200 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-delgone-navy-900">{selectedCustomer.name}</p>
                      {selectedCustomer.company_name && (
                        <p className="text-[11px] text-slate-600 font-medium">
                          {selectedCustomer.company_name}
                        </p>
                      )}
                      <p className="text-[11px] font-mono text-delgone-navy-700">
                        {selectedCustomer.phone || 'No phone'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerModal(true)}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-dashed border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add New Customer Profile
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Product Line Items */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-delgone-navy-700" />
                3. Products & Line Items
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select from the printing supply catalog or enter custom line items manually.
              </p>
            </div>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-delgone-navy-800 rounded-lg hover:bg-delgone-navy-900 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Product Line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3 min-w-[280px]">Product / Description</th>
                  <th className="py-2.5 px-3 w-28">Unit</th>
                  <th className="py-2.5 px-3 w-24">Qty</th>
                  <th className="py-2.5 px-3 w-32">Price (ETB)</th>
                  <th className="py-2.5 px-3 w-36 text-right">Subtotal</th>
                  <th className="py-2.5 px-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const lineQty = parseFloat(String(item.quantity)) || 0;
                  const linePrice = parseFloat(String(item.unit_price)) || 0;
                  const lineTotal = lineQty * linePrice;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      {/* Product Name / Catalog Selector */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1.5">
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              required
                              value={item.product_name}
                              onChange={(e) =>
                                handleItemChange(idx, 'product_name', e.target.value)
                              }
                              placeholder="Enter item description or pick from catalog..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-delgone-navy-500"
                            />
                            <button
                              type="button"
                              onClick={() => openCatalogForIndex(idx)}
                              title="Select from Catalog"
                              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 whitespace-nowrap"
                            >
                              Catalog
                            </button>
                          </div>
                          {item.product_id && (
                            <span className="inline-block text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Catalog Linked
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-3">
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-delgone-navy-500 bg-white"
                        >
                          <option value="pcs">pcs</option>
                          <option value="box">box</option>
                          <option value="roll">roll</option>
                          <option value="ream">ream</option>
                          <option value="pack">pack</option>
                          <option value="can">can</option>
                          <option value="meter">meter</option>
                          <option value="kg">kg</option>
                          <option value="set">set</option>
                        </select>
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs text-right focus:outline-none focus:ring-1 focus:ring-delgone-navy-500 font-mono"
                        />
                      </td>

                      {/* Unit Price */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          required
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs text-right focus:outline-none focus:ring-1 focus:ring-delgone-navy-500 font-mono"
                        />
                      </td>

                      {/* Line Subtotal */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        {formatCurrency(lineTotal)}
                      </td>

                      {/* Delete */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Remove Line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Summary, Discounts & Payment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Method Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
              <CreditCard className="w-4 h-4 text-delgone-navy-700" />
              4. Payment & Settlement
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                Cash
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building className="w-4 h-4 text-blue-600" />
                Bank (CBE/Awash)
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('telebirr')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'telebirr'
                    ? 'border-cyan-600 bg-cyan-50 text-cyan-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 text-cyan-600" />
                Telebirr
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'credit'
                    ? 'border-amber-600 bg-amber-50 text-amber-800 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Credit (Unpaid)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount Tendered / Paid (ETB)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  disabled={paymentMethod === 'credit'}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono text-right focus:outline-none focus:ring-2 focus:ring-delgone-navy-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {paymentMethod === 'credit'
                    ? 'Pure credit sale (0.00 ETB paid now).'
                    : 'Partial down payment supported.'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference / Bank Slip # (Optional)
                </label>
                <input
                  type="text"
                  value={bankReference}
                  onChange={(e) => setBankReference(e.target.value)}
                  placeholder="e.g., CBE-TRX-881923"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Bank transfer confirmation code or slip serial.
                </span>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
              Financial Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-mono font-semibold">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Discount (ETB):</span>
                <div className="w-36">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full px-2 py-1 text-xs rounded border border-slate-300 text-right font-mono focus:outline-none focus:ring-1 focus:ring-delgone-navy-500"
                  />
                </div>
              </div>

              {/* Financial Totals Box matching Cash Sales Attachment */}
              <div className="border border-slate-300 rounded-lg overflow-hidden divide-y divide-slate-200 text-xs font-sans">
                <div className="flex justify-between items-center px-3 py-2 bg-slate-50">
                  <span className="font-semibold text-slate-700">Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
                {numDiscount > 0 && (
                  <div className="flex justify-between items-center px-3 py-1.5 bg-white text-rose-600">
                    <span>Discount:</span>
                    <span className="font-mono font-bold">- {formatCurrency(numDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-3 py-2 bg-slate-50">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    VAT
                    <span className="text-[10px] bg-delgone-navy-50 text-delgone-navy-800 px-1.5 py-0.5 rounded border border-delgone-navy-200 font-mono font-bold">
                      15%
                    </span>
                  </span>
                  <span className="font-mono font-bold text-slate-900">+ {formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between items-center px-3 py-2 bg-slate-200 text-slate-900 font-bold border-t border-slate-300">
                  <span className="text-xs uppercase tracking-wide">Grand Total:</span>
                  <span className="text-sm font-black font-mono">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {/* Amount In Words */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] space-y-0.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                  Amount In Words:
                </span>
                <p className="font-serif italic font-bold text-slate-800 leading-snug">
                  {numberToWords(grandTotal)}
                </p>
              </div>

              <div className="flex justify-between items-center text-emerald-700 pt-1">
                <span>Paid Now:</span>
                <span className="font-mono font-bold">{formatCurrency(numAmountPaid)}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-700">Balance Due:</span>
                <span
                  className={`font-mono font-bold text-base ${
                    balanceDue > 0 ? 'text-amber-600' : 'text-slate-800'
                  }`}
                >
                  {formatCurrency(balanceDue)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 py-3 px-4 rounded-xl font-bold text-white bg-delgone-navy-800 hover:bg-delgone-navy-900 shadow-md transition-all flex items-center justify-center gap-2 text-sm tracking-wide"
            >
              <CheckCircle2 className="w-5 h-5" />
              Review & Finalize Transaction
            </button>
          </div>
        </div>
      </form>

      {/* Catalog Search Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Select Printing Product</h3>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search catalog product name..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-delgone-navy-500"
              />
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
              {catalogProducts
                .filter((p) =>
                  p.name.toLowerCase().includes(catalogSearch.toLowerCase())
                )
                .map((product) => (
                  <div
                    key={product.id}
                    onClick={() => selectCatalogProduct(product)}
                    className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 text-xs">{product.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Unit: {product.unit} | {product.description || 'Printing supply'}
                      </p>
                    </div>
                    <div className="text-right font-mono font-bold text-xs text-delgone-navy-800">
                      {formatCurrency(product.default_price)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">New Customer Profile</h3>
                <p className="text-[11px] text-slate-500">Quick-create customer at counter</p>
              </div>
              <button
                onClick={() => setShowNewCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {custModalError && (
              <p className="text-xs text-rose-600 font-semibold">{custModalError}</p>
            )}

            {/* Duplicate Warning in Counter Modal */}
            {newCustDupWarning && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">{newCustDupWarning}</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">Existing matches:</p>
                  </div>
                </div>
                <div className="bg-white/80 rounded p-2 border border-amber-200 text-[11px] font-mono space-y-1">
                  {newCustDupMatches.map((m: any) => (
                    <div key={m.id} className="flex justify-between">
                      <span className="font-bold">{m.name}</span>
                      <span className="text-slate-500">{m.company_name || 'Individual'}</span>
                      <span className="text-slate-600">{m.phone || '-'}</span>
                    </div>
                  ))}
                </div>
                <label className="flex items-center gap-2 pt-1 cursor-pointer font-medium text-amber-950">
                  <input
                    type="checkbox"
                    checked={newCustConfirmDup}
                    onChange={(e) => setNewCustConfirmDup(e.target.checked)}
                    className="rounded border-amber-400 text-delgone-navy-800"
                  />
                  <span>Confirm this is a distinct customer (not duplicate)</span>
                </label>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g., Abebe Bekele"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-delgone-navy-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Company / Trade Name (Optional)
                </label>
                <input
                  type="text"
                  value={newCustCompany}
                  onChange={(e) => setNewCustCompany(e.target.value)}
                  placeholder="e.g., Lucy Printing Solutions"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-delgone-navy-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  TIN Number (10 digits) <span className="text-rose-600 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustTin}
                  onChange={(e) => setNewCustTin(e.target.value)}
                  placeholder="e.g., 0012345678"
                  maxLength={50}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-delgone-navy-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g., 0911234567"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-delgone-navy-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="e.g., Stadium, Addis Ababa"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-delgone-navy-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newCustDupWarning !== null && !newCustConfirmDup}
                  className="px-4 py-2 rounded-lg bg-delgone-navy-800 text-white font-semibold hover:bg-delgone-navy-900 disabled:opacity-50"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-delgone-navy-800" />
                Confirm Sales Transaction
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Customs FS No:</span>
                <span className="font-mono font-bold text-slate-900">{fsNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-medium text-slate-900">
                  {isWalkIn ? 'Walk-in Customer' : selectedCustomer?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Line Items:</span>
                <span className="font-semibold text-slate-900">{items.length} line(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-semibold uppercase text-slate-800">{paymentMethod}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/80 pt-2">
                <span className="text-slate-500">Items Subtotal:</span>
                <span className="font-mono text-slate-800">{formatCurrency(subtotal)}</span>
              </div>
              {numDiscount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span className="font-mono">- {formatCurrency(numDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-delgone-navy-900">
                <span className="font-medium">15% VAT:</span>
                <span className="font-mono font-bold text-delgone-navy-800">+ {formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
                <span>Grand Total:</span>
                <span className="text-delgone-navy-900 font-mono">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-emerald-700">
                <span>Amount Paid Now:</span>
                <span className="font-mono">{formatCurrency(numAmountPaid)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-amber-700">
                <span>Balance Due:</span>
                <span className="font-mono">{formatCurrency(balanceDue)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Sale number will be sequentially generated and locked into the ledger.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Go Back & Edit
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmSubmit}
                className="px-5 py-2 rounded-lg bg-delgone-navy-800 text-white text-xs font-bold hover:bg-delgone-navy-900 flex items-center gap-2 shadow-sm"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {isSubmitting ? 'Recording...' : 'Confirm & Save Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewSalePage;

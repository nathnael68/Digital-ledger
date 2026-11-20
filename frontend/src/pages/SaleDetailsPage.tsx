import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Building,
  Banknote,
  AlertTriangle,
  Ban,
  Plus,
  RefreshCw,
  X,
  Calendar,
  Receipt,
  FileEdit,
} from 'lucide-react';
import { saleService } from '../services/saleService';
import { SaleDetail } from '../types/sale';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';

export const SaleDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'telebirr'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Correction state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctedFsNumber, setCorrectedFsNumber] = useState('');
  const [correctedReceiptNumber, setCorrectedReceiptNumber] = useState('');
  const [correctedBuyerTin, setCorrectedBuyerTin] = useState('');
  const [correctedNotes, setCorrectedNotes] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  // Void state
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState<string | null>(null);
  const [isSubmittingVoid, setIsSubmittingVoid] = useState(false);

  const fetchSale = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await saleService.getSaleById(id);
      setSale(data);
      // Initialize correction fields
      setCorrectedFsNumber(data.fs_number || '');
      setCorrectedReceiptNumber(data.paper_receipt_number || '');
      setCorrectedBuyerTin(data.buyer_tin || '');
      setCorrectedNotes(data.notes || '');
      setPaymentAmount(data.outstanding_balance);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve transaction details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSale();
  }, [fetchSale]);

  // Handle Payment Submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;
    setPaymentError(null);

    const amt = parseFloat(String(paymentAmount));
    if (isNaN(amt) || amt <= 0) {
      setPaymentError('Payment amount must be greater than 0.');
      return;
    }

    const currentBalance = parseFloat(String(sale.outstanding_balance));
    if (amt > currentBalance) {
      setPaymentError(
        `Payment amount (${formatCurrency(amt)}) cannot exceed outstanding balance (${formatCurrency(currentBalance)}).`
      );
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await saleService.recordPayment(sale.id, {
        amount: amt,
        payment_method: paymentMethod,
        reference: paymentReference.trim() || undefined,
        idempotency_key: `pay-ui-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      });
      setShowPaymentModal(false);
      setPaymentReference('');
      await fetchSale();
    } catch (err: any) {
      setPaymentError(err.message || 'Payment submission failed.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Handle Correction Submit
  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;
    setCorrectionError(null);

    if (!correctedBuyerTin.trim()) {
      setCorrectionError('Buyer TIN Number is mandatory.');
      return;
    }

    const cleanBuyerTin = correctedBuyerTin.trim().replace(/[\s-]/g, '');
    if (!/^\d{9,12}$/.test(cleanBuyerTin)) {
      setCorrectionError('Buyer TIN Number must be a valid 10-digit number (e.g., 0012345678).');
      return;
    }

    if (!correctionReason.trim() || correctionReason.trim().length < 3) {
      setCorrectionError('A clear correction reason (at least 3 characters) is required for audit history.');
      return;
    }

    setIsSubmittingCorrection(true);
    try {
      await saleService.correctSale(sale.id, {
        fs_number: correctedFsNumber.trim() || undefined,
        paper_receipt_number: correctedReceiptNumber.trim() || undefined,
        buyer_tin: correctedBuyerTin.trim() || undefined,
        notes: correctedNotes.trim() || undefined,
        reason: correctionReason.trim(),
      });
      setShowCorrectionModal(false);
      setCorrectionReason('');
      await fetchSale();
    } catch (err: any) {
      setCorrectionError(err.message || 'Correction failed.');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Handle Void Submit
  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;
    setVoidError(null);

    if (!voidReason.trim() || voidReason.trim().length < 3) {
      setVoidError('A mandatory void justification (at least 3 characters) is required.');
      return;
    }

    setIsSubmittingVoid(true);
    try {
      await saleService.voidSale(sale.id, {
        reason: voidReason.trim(),
      });
      setShowVoidModal(false);
      setVoidReason('');
      await fetchSale();
    } catch (err: any) {
      setVoidError(err.message || 'Failed to void transaction.');
    } finally {
      setIsSubmittingVoid(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500 max-w-4xl mx-auto">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-delgone-navy-800" />
        <p className="font-semibold text-slate-700">Loading sale details...</p>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-lg font-bold text-rose-900">Unable to Load Sale</h2>
          <p className="text-sm text-rose-700">{error || 'Transaction not found.'}</p>
          <button
            onClick={() => navigate('/sales')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-delgone-navy-800 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sales Ledger
          </button>
        </div>
      </div>
    );
  }

  const isVoided = sale.payment_status === 'voided';
  const outstandingNum = parseFloat(String(sale.outstanding_balance)) || 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Nav and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => navigate('/sales')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sales Ledger
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Record Payment Button */}
          {!isVoided && outstandingNum > 0 && (
            <button
              type="button"
              onClick={() => {
                setPaymentAmount(sale.outstanding_balance);
                setPaymentError(null);
                setShowPaymentModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Payment
            </button>
          )}

          {/* Correct Transaction Button */}
          {!isVoided && (
            <button
              type="button"
              onClick={() => {
                setCorrectionReason('');
                setCorrectionError(null);
                setShowCorrectionModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-xs"
            >
              <FileEdit className="w-3.5 h-3.5 text-slate-500" />
              Correct Transaction
            </button>
          )}

          {/* Void Transaction Button */}
          {!isVoided && (
            <button
              type="button"
              onClick={() => {
                setVoidReason('');
                setVoidError(null);
                setShowVoidModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-100 shadow-xs"
            >
              <Ban className="w-3.5 h-3.5 text-rose-600" />
              Void Sale
            </button>
          )}
        </div>
      </div>

      {/* Void Alert Banner */}
      {isVoided && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-sm">
          <Ban className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <p className="font-bold text-rose-900 uppercase tracking-wider">
              This Transaction Has Been Voided
            </p>
            <p className="text-rose-800">
              <span className="font-semibold">Void Reason:</span> {sale.void_reason || 'No justification recorded.'}
            </p>
            <p className="text-[11px] text-rose-700">
              Voided by: {sale.voided_by_name || 'System'} | Void Date: {formatDateTime(sale.voided_at || '')}
            </p>
            <p className="text-[11px] text-rose-600 italic">
              Voided transactions remain in the historical ledger for audit purposes, but are excluded from active dashboard metrics and cannot receive subsequent payments.
            </p>
          </div>
        </div>
      )}

      {/* Main Metadata Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-delgone-navy-900 font-mono tracking-tight">
                {sale.sale_number}
              </h1>
              <StatusBadge status={sale.payment_status} />
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Finalized: {formatDateTime(sale.sale_date)} (Addis Ababa Time)
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Grand Total
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              {formatCurrency(sale.grand_total)}
            </span>
          </div>
        </div>

        {/* Reference Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-slate-400 font-medium mb-1">Customs FS Number</p>
            <p className="font-mono font-bold text-slate-900 text-sm">
              {sale.fs_number || '-'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-slate-400 font-medium mb-1">Paper Receipt #</p>
            <p className="font-semibold text-slate-800 text-sm">
              {sale.paper_receipt_number || '-'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-slate-400 font-medium mb-1">Buyer TIN Number</p>
            <p className="font-mono font-bold text-slate-900 text-sm">
              {sale.buyer_tin || sale.customer_tin || '-'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-slate-400 font-medium mb-1">Customer</p>
            <p className="font-semibold text-slate-800 text-sm">
              {sale.customer_name || 'Walk-in Customer'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-slate-400 font-medium mb-1">Cashier / Staff</p>
            <p className="font-semibold text-slate-800 text-sm">
              {sale.created_by_name}
            </p>
          </div>
        </div>

        {sale.notes && (
          <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs">
            <p className="font-semibold text-amber-900">Notes:</p>
            <p className="text-slate-700 mt-0.5">{sale.notes}</p>
          </div>
        )}
      </div>

      {/* Itemized Lines Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Receipt className="w-4 h-4 text-delgone-navy-800" />
          Line Items ({sale.items.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3 text-right">Quantity</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 font-medium text-slate-900">
                    {item.description_snapshot}
                  </td>
                  <td className="py-3 px-3 text-slate-600 uppercase">
                    {item.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-800">
                    {parseFloat(String(item.quantity)).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-800">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(item.line_subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary Breakdown */}
        <div className="border-t border-slate-100 pt-4 flex justify-end">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold">{formatCurrency(sale.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Discount:</span>
              <span className="font-mono font-semibold text-rose-600">
                - {formatCurrency(sale.discount)}
              </span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-2 text-sm">
              <span>Grand Total:</span>
              <span className="font-mono text-delgone-navy-900">
                {formatCurrency(sale.grand_total)}
              </span>
            </div>
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Total Paid:</span>
              <span className="font-mono">{formatCurrency(sale.total_paid)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-slate-200 pt-2 text-sm">
              <span className="text-slate-700">Outstanding Balance:</span>
              <span
                className={`font-mono ${
                  outstandingNum > 0 ? 'text-amber-700' : 'text-slate-800'
                }`}
              >
                {formatCurrency(sale.outstanding_balance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-delgone-navy-800" />
            Payment Records ({sale.payments.length})
          </h2>

          {!isVoided && outstandingNum > 0 && (
            <button
              type="button"
              onClick={() => {
                setPaymentAmount(sale.outstanding_balance);
                setPaymentError(null);
                setShowPaymentModal(true);
              }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              + Add Subsequent Payment
            </button>
          )}
        </div>

        {sale.payments.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
            No payments have been recorded for this transaction yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Reference / Slip #</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 text-slate-600">
                      {formatDateTime(p.payment_date)}
                    </td>
                    <td className="py-3 px-3 uppercase font-medium text-slate-800">
                      <span className="inline-flex items-center gap-1">
                        {p.payment_method === 'cash' ? (
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Building className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        {p.payment_method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {p.reference || '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {p.recorded_by_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Record Payment
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentError && (
              <p className="text-xs text-rose-600 font-semibold">{paymentError}</p>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <Building className="w-4 h-4 text-blue-600" />
                    Bank
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('telebirr')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 ${
                      paymentMethod === 'telebirr'
                        ? 'border-cyan-600 bg-cyan-50 text-cyan-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-cyan-600" />
                    Telebirr
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">Amount (ETB) *</label>
                  <span className="text-[11px] text-amber-700 font-semibold">
                    Max: {formatCurrency(sale.outstanding_balance)}
                  </span>
                </div>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference / Bank Slip # (Optional)
                </label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g., CBE-TRX-100293"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  {isSubmittingPayment && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmittingPayment ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-delgone-navy-800" />
                Correct Transaction Metadata
              </h3>
              <button
                onClick={() => setShowCorrectionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {correctionError && (
              <p className="text-xs text-rose-600 font-semibold">{correctionError}</p>
            )}

            <form onSubmit={handleCorrectionSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customs FS Number
                </label>
                <input
                  type="text"
                  value={correctedFsNumber}
                  onChange={(e) => setCorrectedFsNumber(e.target.value)}
                  placeholder="e.g., FS-2026-00451"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-delgone-navy-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Paper Receipt Number
                </label>
                <input
                  type="text"
                  value={correctedReceiptNumber}
                  onChange={(e) => setCorrectedReceiptNumber(e.target.value)}
                  placeholder="e.g., PR-01923"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-delgone-navy-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Buyer TIN Number <span className="text-rose-600 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={correctedBuyerTin}
                  onChange={(e) => setCorrectedBuyerTin(e.target.value)}
                  placeholder="e.g., 0012345678"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-delgone-navy-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={correctedNotes}
                  onChange={(e) => setCorrectedNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-delgone-navy-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-rose-700 mb-1">
                  Mandatory Reason for Correction *
                </label>
                <textarea
                  required
                  rows={2}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Explain why this correction is being made for audit trail..."
                  className="w-full px-3 py-2 rounded-lg border border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorrection}
                  className="px-5 py-2 rounded-lg bg-delgone-navy-800 text-white font-bold hover:bg-delgone-navy-900 flex items-center gap-1.5"
                >
                  {isSubmittingCorrection && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmittingCorrection ? 'Saving...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Transaction Modal */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-rose-900 text-base flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600" />
                Void Sales Transaction
              </h3>
              <button
                onClick={() => setShowVoidModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {voidError && (
              <p className="text-xs text-rose-600 font-semibold">{voidError}</p>
            )}

            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <p className="font-semibold">Are you sure you want to void this transaction?</p>
              <p className="mt-1">
                Voiding cannot be undone. The transaction will be marked as VOIDED, excluded from sales revenue, and future payments will be blocked.
              </p>
            </div>

            <form onSubmit={handleVoidSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-rose-800 mb-1">
                  Justification Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g., Mistaken duplicate entry or customer canceled before dispatch..."
                  className="w-full px-3 py-2 rounded-lg border border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVoidModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVoid}
                  className="px-5 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 flex items-center gap-1.5"
                >
                  {isSubmittingVoid && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmittingVoid ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleDetailsPage;

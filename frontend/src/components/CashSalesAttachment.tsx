import React from 'react';
import { X, Printer } from 'lucide-react';
import { SaleDetail } from '../types/sale';
import { formatNumber, numberToWords } from '../utils/formatters';

interface CashSalesAttachmentProps {
  sale: SaleDetail;
  onClose?: () => void;
  isModal?: boolean;
}

export const CashSalesAttachment: React.FC<CashSalesAttachmentProps> = ({
  sale,
  onClose,
  isModal = true,
}) => {
  const isCredit = sale.payment_status === 'credit';
  const docTitle = isCredit ? 'Credit Sales Attachment' : 'Cash Sales Attachment';

  const grandTotalNum = parseFloat(String(sale.grand_total || 0));
  const subtotalNum = parseFloat(
    String(
      sale.subtotal !== undefined && sale.subtotal !== null
        ? sale.subtotal
        : grandTotalNum > 0
        ? (grandTotalNum / 1.15).toFixed(2)
        : 0
    )
  );
  const discountNum = parseFloat(String(sale.discount || 0));
  const vatNum = parseFloat(
    String(
      sale.vat_amount !== undefined && sale.vat_amount !== null
        ? sale.vat_amount
        : Math.max(0, grandTotalNum - subtotalNum)
    )
  );

  // Determine payment method label
  let paymentMethodLabel = '-';
  if (sale.payments && sale.payments.length > 0) {
    const methods = Array.from(new Set(sale.payments.map((p) => p.payment_method.replace('_', ' ').toUpperCase())));
    paymentMethodLabel = methods.join(', ');
  } else if (!isCredit) {
    paymentMethodLabel = 'CASH';
  } else {
    paymentMethodLabel = 'ON CREDIT';
  }

  // Format date as MM/DD/YYYY HH:mm:ss
  const saleDateObj = new Date(sale.sale_date || sale.created_at);
  const formattedDate = !isNaN(saleDateObj.getTime())
    ? saleDateObj.toLocaleString('en-US', {
        timeZone: 'Africa/Addis_Ababa',
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : '-';

  const amountInWords = numberToWords(grandTotalNum);

  const handlePrint = () => {
    window.print();
  };

  const documentContent = (
    <div
      id="printable-sales-attachment"
      className="bg-white text-black p-6 sm:p-8 font-serif max-w-4xl mx-auto border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full"
      style={{ minHeight: '100%' }}
    >
      {/* Header Info */}
      <div className="flex justify-between items-start">
        <div className="text-xs leading-tight">
          <h1 className="text-xl sm:text-2xl font-black font-serif tracking-tight text-black mb-1">
            DELGONE TRADING PLC
          </h1>
          <p className="font-sans font-medium text-[11px] text-slate-800">
            A.A S/C KIRKOS WO. 08 H.NO NEW SHOP No.209
          </p>
          <p className="font-sans font-medium text-[11px] text-slate-800">PALAS BUILDING</p>
          <p className="font-sans font-bold text-[11px] text-slate-900 mt-0.5">TIN. 0000048371</p>
          <p className="font-sans font-medium text-[11px] text-slate-800">TEL. 0115150122</p>
        </div>
      </div>

      {/* Document Title */}
      <div className="text-center my-4">
        <h2 className="text-lg sm:text-xl font-bold font-serif text-black tracking-wide inline-block border-b-2 border-black pb-0.5">
          {docTitle}
        </h2>
      </div>

      {/* Metadata 2-Column Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 border border-black text-xs font-sans mb-4">
        {/* Left Column: Customer Details */}
        <div className="divide-y divide-black border-b md:border-b-0 md:border-r border-black">
          <div className="flex">
            <span className="w-24 px-2 py-1 font-semibold bg-slate-100 border-r border-black">Bill to</span>
            <span className="flex-1 px-2 py-1 font-bold text-slate-900">
              {sale.customer_name || 'Walk-in Customer'}
            </span>
          </div>
          <div className="flex">
            <span className="w-24 px-2 py-1 font-semibold bg-slate-100 border-r border-black">TIN</span>
            <span className="flex-1 px-2 py-1 font-mono font-bold text-slate-900">
              {sale.buyer_tin || sale.customer_tin || '-'}
            </span>
          </div>
          <div className="flex">
            <span className="w-24 px-2 py-1 font-semibold bg-slate-100 border-r border-black">Address</span>
            <span className="flex-1 px-2 py-1">
              {(sale as any).customer_address || '-'}
            </span>
          </div>
        </div>

        {/* Right Column: Transaction Details */}
        <div className="divide-y divide-black">
          <div className="flex">
            <span className="w-24 px-2 py-1 font-semibold bg-slate-100 border-r border-black">Date</span>
            <span className="flex-1 px-2 py-1 font-mono">{formattedDate}</span>
          </div>
          <div className="flex">
            <span className="w-24 px-2 py-1 font-semibold bg-slate-100 border-r border-black">Reference</span>
            <span className="flex-1 px-2 py-1 font-mono font-bold">{sale.sale_number}</span>
          </div>
          <div className="flex">
            <span className="w-24 px-2 py-1 font-semibold bg-slate-100 border-r border-black">FSNO</span>
            <span className="flex-1 px-2 py-1 font-mono font-bold text-slate-900">
              {sale.fs_number || '-'}
            </span>
          </div>
          <div className="flex">
            <span className="w-24 px-2 py-1 font-semibold bg-slate-100 border-r border-black">Station</span>
            <span className="flex-1 px-2 py-1 font-mono">STATION 1</span>
          </div>
          <div className="flex">
            <span className="w-24 px-2 py-1 font-semibold bg-slate-100 border-r border-black">Store</span>
            <span className="flex-1 px-2 py-1 font-mono">STORE1</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-xs font-sans border-collapse border border-black mb-4">
        <thead>
          <tr className="bg-slate-200 border-b border-black text-black">
            <th className="border-r border-black px-2 py-1.5 text-center font-bold w-12">ID</th>
            <th className="border-r border-black px-2 py-1.5 text-left font-bold">Description</th>
            <th className="border-r border-black px-2 py-1.5 text-center font-bold w-16">Unit</th>
            <th className="border-r border-black px-2 py-1.5 text-right font-bold w-20">Quantity</th>
            <th className="border-r border-black px-2 py-1.5 text-right font-bold w-24">Unit Price</th>
            <th className="px-2 py-1.5 text-right font-bold w-28">Line Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black">
          {sale.items && sale.items.length > 0 ? (
            sale.items.map((item, idx) => {
              const qty = parseFloat(String(item.quantity || 0));
              const price = parseFloat(String(item.unit_price || 0));
              const lineTotal = parseFloat(String(item.line_subtotal || qty * price));
              return (
                <tr key={item.id || idx} className="hover:bg-slate-50">
                  <td className="border-r border-black px-2 py-1 text-center font-mono">
                    {idx + 1}
                  </td>
                  <td className="border-r border-black px-2 py-1 font-medium text-slate-900">
                    {item.description_snapshot || (item as any).product_name}
                  </td>
                  <td className="border-r border-black px-2 py-1 text-center uppercase font-mono">
                    {item.unit || 'PCS'}
                  </td>
                  <td className="border-r border-black px-2 py-1 text-right font-mono">
                    {formatNumber(qty)}
                  </td>
                  <td className="border-r border-black px-2 py-1 text-right font-mono">
                    {formatNumber(price)}
                  </td>
                  <td className="px-2 py-1 text-right font-mono font-semibold">
                    {formatNumber(lineTotal)}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="text-center py-4 text-slate-400">
                No items recorded.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Summary Footer: Left details + Right Totals Table */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 text-xs font-sans">
        {/* Left Side: Payment Method & Amount in Words */}
        <div className="flex-1 space-y-2 pr-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 w-32">Payment Method</span>
            <span className="font-bold text-slate-900 uppercase font-mono">{paymentMethodLabel}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-slate-700 w-32 flex-shrink-0">Amount In Words</span>
            <span className="font-serif italic font-bold text-slate-900 leading-snug">
              {amountInWords}
            </span>
          </div>
        </div>

        {/* Right Side: Totals Table */}
        <div className="w-full sm:w-72 border border-black divide-y divide-black font-sans">
          <div className="flex justify-between px-3 py-1 bg-slate-100">
            <span className="font-semibold text-slate-800">Subtotal</span>
            <span className="font-mono font-bold text-slate-900">{formatNumber(subtotalNum)}</span>
          </div>
          {discountNum > 0 && (
            <div className="flex justify-between px-3 py-1 bg-white text-rose-700">
              <span className="font-semibold">Discount</span>
              <span className="font-mono font-bold">- {formatNumber(discountNum)}</span>
            </div>
          )}
          <div className="flex justify-between px-3 py-1 bg-slate-100">
            <span className="font-semibold text-slate-800">VAT (15%)</span>
            <span className="font-mono font-bold text-slate-900">{formatNumber(vatNum)}</span>
          </div>
          <div className="flex justify-between px-3 py-1.5 bg-slate-200 text-sm font-bold border-t border-black">
            <span className="text-black">Grand Total</span>
            <span className="font-mono text-black font-black">{formatNumber(grandTotalNum)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isModal) {
    return documentContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-6 overflow-hidden border border-slate-300 print:shadow-none print:border-none print:w-full print:max-w-none print:m-0">
        {/* Modal Action Bar (hidden when printing) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800 text-white print:hidden">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Delgone Cash Sales Attachment Voucher</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Attachment
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
          {documentContent}
        </div>
      </div>
    </div>
  );
};

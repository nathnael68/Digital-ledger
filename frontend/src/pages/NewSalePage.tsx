import React from 'react';
import { ShoppingCart, User, Receipt, CreditCard } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const NewSalePage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Record New Sale
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Point-of-sale transaction entry with instant catalog snapshotting and paper receipt linkage
          </p>
        </div>
        <StatusBadge status="pending" label="Scheduled for Phase 3" />
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-delgone-navy-50 text-delgone-navy-800 flex items-center justify-center mx-auto mb-4 border border-delgone-navy-100">
          <ShoppingCart className="w-7 h-7 text-delgone-navy-800" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Sales Recording Engine (Phase 3)
        </h2>
        <p className="text-sm text-slate-500 max-w-lg mx-auto mt-2 leading-relaxed">
          This counter terminal will allow Delgone sales employees to quickly register sales, select standard printing supplies from the catalog or enter custom line items, record handwritten receipt numbers, and process split payments.
        </p>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-left">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1">
              <User className="w-4 h-4 text-emerald-600" />
              1. Customer Selection
            </div>
            <p className="text-xs text-slate-500">
              Lookup existing commercial clients or select Walk-in Customer for immediate cash checkout.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1">
              <Receipt className="w-4 h-4 text-delgone-navy-800" />
              2. Items & Snapshots
            </div>
            <p className="text-xs text-slate-500">
              Auto-calculate subtotals with immutable price snapshotting to protect historical integrity.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1">
              <CreditCard className="w-4 h-4 text-blue-600" />
              3. Split Settlement
            </div>
            <p className="text-xs text-slate-500">
              Accept Cash, Bank Transfer (CBE/Awash), Telebirr, or record outstanding Credit balance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

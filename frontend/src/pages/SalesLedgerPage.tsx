import React from 'react';
import { Receipt, Search, Filter, Calendar } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const SalesLedgerPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Digital Sales Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete transaction register, paper receipt audit, and payment status tracking
          </p>
        </div>
        <StatusBadge status="pending" label="Scheduled for Phase 3" />
      </div>

      {/* Filter Bar Mockup */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 opacity-75">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              disabled
              placeholder="Search by sale number (DLG-...), paper receipt #, or customer..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-slate-50 cursor-not-allowed"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-500 cursor-not-allowed"
          >
            <Calendar className="w-3.5 h-3.5" />
            Date Range
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-500 cursor-not-allowed"
          >
            <Filter className="w-3.5 h-3.5" />
            Status: All
          </button>
        </div>
      </div>

      {/* Ledger Table Placeholder */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-delgone-navy-50 text-delgone-navy-800 flex items-center justify-center mx-auto mb-4 border border-delgone-navy-100">
          <Receipt className="w-7 h-7 text-delgone-navy-800" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Digital Ledger Table (Phase 3)
        </h2>
        <p className="text-sm text-slate-500 max-w-lg mx-auto mt-2 leading-relaxed">
          The sales ledger table will present all finalized transactions with sale numbers, customer names, paper receipt serial numbers, grand totals in ETB, recorded payments, and active payment states (Paid, Partial, Credit, Voided).
        </p>
      </div>
    </div>
  );
};

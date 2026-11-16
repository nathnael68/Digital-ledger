import React from 'react';
import { BarChart3 } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sales & Financial Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Daily register closeouts, cash vs bank reconciliation, and revenue summaries
          </p>
        </div>
        <StatusBadge status="pending" label="Scheduled for Phase 5" />
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-delgone-navy-50 text-delgone-navy-800 flex items-center justify-center mx-auto mb-4 border border-delgone-navy-100">
          <BarChart3 className="w-7 h-7 text-delgone-navy-800" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Executive & Shift Reporting (Phase 5)
        </h2>
        <p className="text-sm text-slate-500 max-w-lg mx-auto mt-2 leading-relaxed">
          Comprehensive business reporting including daily shift closeouts, weekly/monthly revenue trends, top-selling paper supplies, and aged credit reports will be activated in Phase 5.
        </p>
      </div>
    </div>
  );
};

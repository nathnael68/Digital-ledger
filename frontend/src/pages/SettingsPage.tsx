import React from 'react';
import { Settings } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System & User Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage employee accounts, product catalog, and receipt configuration
          </p>
        </div>
        <StatusBadge status="pending" label="Scheduled for Phase 2 & 5" />
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-delgone-navy-50 text-delgone-navy-800 flex items-center justify-center mx-auto mb-4 border border-delgone-navy-100">
          <Settings className="w-7 h-7 text-delgone-navy-800" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Administration & Configuration
        </h2>
        <p className="text-sm text-slate-500 max-w-lg mx-auto mt-2 leading-relaxed">
          Administrator account management, employee credential resets, product catalog pricing controls, and receipt book sequence numbering will be configured here in Phase 2.
        </p>
      </div>
    </div>
  );
};

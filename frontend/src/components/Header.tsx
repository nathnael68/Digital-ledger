import React, { useState, useEffect } from 'react';
import { Menu, Clock, UserCheck } from 'lucide-react';
import { useApiHealth } from '../hooks/useApiHealth';
import { StatusBadge } from './StatusBadge';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { data, loading, error } = useApiHealth();
  const [addisTime, setAddisTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setAddisTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Africa/Addis_Ababa',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-delgone-navy-800 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
              Delgone Trading PLC
            </span>
            <span className="hidden sm:inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              Addis Ababa
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-normal">
            Digital Sales Ledger System
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Addis Ababa Time Indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono font-medium">{addisTime || 'Addis Ababa (EAT)'}</span>
        </div>

        {/* Live Backend Connection Indicator */}
        <div className="flex items-center gap-1.5">
          {loading ? (
            <StatusBadge status="pending" label="Checking API..." />
          ) : error ? (
            <StatusBadge status="error" label="API Offline" />
          ) : data?.database_connected ? (
            <StatusBadge status="healthy" label="Online • DB Ready" />
          ) : (
            <StatusBadge status="degraded" label="API Online • DB Pending" />
          )}
        </div>

        {/* User Account Placeholder for Phase 1 */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-delgone-navy-900 text-white flex items-center justify-center text-xs font-semibold">
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-900 leading-tight">
              Counter Cashier
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Sales Employee
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { Menu, Clock, UserCheck, LogOut, Shield, ChevronDown } from 'lucide-react';
import { useApiHealth } from '../hooks/useApiHealth';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import { formatDateTime } from '../utils/formatters';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { data, loading, error } = useApiHealth();
  const { user, logout } = useAuth();
  const [addisTime, setAddisTime] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Addis Ababa live clock
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

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

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

        {/* User Account Dropdown */}
        <div className="relative pl-2 border-l border-slate-200" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
            aria-expanded={dropdownOpen}
          >
            <div className="w-8 h-8 rounded-full bg-delgone-navy-900 text-emerald-400 flex items-center justify-center text-xs font-bold uppercase shadow-sm">
              {user?.full_name ? user.full_name.charAt(0) : <UserCheck className="w-4 h-4" />}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                {user?.full_name || 'Counter Cashier'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium capitalize flex items-center gap-1">
                {user?.role === 'admin' ? (
                  <>
                    <Shield className="w-2.5 h-2.5 text-purple-600" />
                    <span>Administrator</span>
                  </>
                ) : (
                  <span>Sales Employee</span>
                )}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-fadeIn text-xs">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="font-bold text-slate-900 text-sm">{user?.full_name}</p>
                <p className="font-mono text-slate-500 text-[11px]">@{user?.username}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                    Role
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      user?.role === 'admin'
                        ? 'bg-purple-50 text-purple-800'
                        : 'bg-blue-50 text-blue-800'
                    }`}
                  >
                    {user?.role === 'admin' ? 'Administrator' : 'Sales Employee'}
                  </span>
                </div>
                {user?.last_login_at && (
                  <p className="mt-2 text-[10px] text-slate-400">
                    Last login: {formatDateTime(user.last_login_at)}
                  </p>
                )}
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-rose-700 hover:bg-rose-50 transition-colors font-semibold"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Sign Out of Counter</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

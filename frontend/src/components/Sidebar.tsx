import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  Users,
  UserCog,
  BarChart3,
  Settings,
  X,
  BookOpen,
  ShieldCheck,
  Shield,
  DollarSign,
} from 'lucide-react';
import { NavItem } from '../types/navigation';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const baseNavItems: NavItem[] = [
    {
      title: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      description: 'System overview & daily status',
    },
    {
      title: 'New Sale',
      path: '/sales/new',
      icon: PlusCircle,
      badge: 'F2',
      description: 'Record counter sale transaction',
    },
    {
      title: 'Sales Ledger',
      path: '/sales',
      icon: Receipt,
      description: 'Digital sales log & receipt lookup',
    },
    {
      title: 'Customers',
      path: '/customers',
      icon: Users,
      description: 'Customer directory & profiles',
    },
    {
      title: 'Credit Balances',
      path: '/customers/outstanding',
      icon: DollarSign,
      description: 'Receivables & aging breakdown',
    },
    {
      title: 'Reports',
      path: '/reports',
      icon: BarChart3,
      description: 'Daily closeout & sales summaries',
    },
  ];

  // Admin-only nav item
  const adminNavItems: NavItem[] = isAdmin
    ? [
        {
          title: 'Employees',
          path: '/employees',
          icon: UserCog,
          badge: 'Admin',
          description: 'Employee directory & security roles',
        },
      ]
    : [];

  const footerNavItems: NavItem[] = [
    {
      title: 'Settings',
      path: '/settings',
      icon: Settings,
      description: 'System preferences & receipt series',
    },
  ];

  const allNavItems = [...baseNavItems, ...adminNavItems, ...footerNavItems];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col bg-delgone-navy-900 text-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wide text-white">
                DELGONE
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Sales Ledger
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency & Role Indicator */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <span className="text-slate-400">Operating Role</span>
          <span className="font-bold tracking-wide flex items-center gap-1 text-emerald-400">
            {isAdmin ? (
              <>
                <Shield className="w-3 h-3 text-purple-400" />
                <span className="text-purple-300">Administrator</span>
              </>
            ) : (
              <span>Sales Employee</span>
            )}
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
          {allNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        isActive ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.title}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                        item.badge === 'Admin'
                          ? 'bg-purple-950 text-purple-300 border-purple-800'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer / System Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Delgone Counter Security Active</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Delgone Trading PLC • Phase 2 Verified
          </div>
        </div>
      </aside>
    </>
  );
};

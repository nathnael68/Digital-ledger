import React from 'react';

interface StatusBadgeProps {
  status: 'healthy' | 'degraded' | 'error' | 'active' | 'pending' | 'paid' | 'partial' | 'credit' | string;
  label?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  showDot = true,
}) => {
  const normalized = status.toLowerCase();

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (normalized === 'healthy' || normalized === 'active' || normalized === 'paid') {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (normalized === 'degraded' || normalized === 'partial' || normalized === 'pending') {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
  } else if (normalized === 'error' || normalized === 'voided') {
    colorClasses = 'bg-rose-50 text-rose-800 border-rose-200';
    dotColor = 'bg-rose-500';
  } else if (normalized === 'credit') {
    colorClasses = 'bg-blue-50 text-blue-800 border-blue-200';
    dotColor = 'bg-blue-500';
  }

  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
      )}
      {displayLabel}
    </span>
  );
};

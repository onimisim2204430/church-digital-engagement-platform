/**
 * MetricCard — A single metric display with optional skeleton loading state
 * Memoized to prevent re-renders when props don't change
 */

import React, { memo } from 'react';
import type { MetricShape } from '../types/dashboard.types';

const MetricCard = memo(({ label, value, change, changePositive, bars, special, loading }: MetricShape) => (
  <div className="min-w-0 rounded-lg border border-border-light dark:border-slate-700 bg-gradient-to-b from-white dark:from-slate-800/60 to-blue-50/30 dark:to-slate-800/40 p-3 transition-all hover:border-primary/30 dark:hover:border-primary/40">
    <div className="flex justify-between items-start mb-1.5 gap-1">
      <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight truncate min-w-0">{label}</span>
      <span className={`text-[10px] font-mono font-bold flex-shrink-0 ${changePositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>{change}</span>
    </div>
    {loading ? (
      <div className="h-5 w-16 bg-slate-100 dark:bg-slate-700 rounded animate-pulse mt-1" />
    ) : (
      <div className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">{value}</div>
    )}
    {bars ? (
      <div className="mt-2 h-7 w-full bg-primary/5 dark:bg-primary/10 rounded flex items-end px-1 gap-0.5">
        {bars.map((h, bi) => (
          <div
            key={bi}
            className={`flex-1 rounded-t-sm ${bi === bars.length - 1 ? 'bg-primary' : 'bg-primary/30'}`}
            style={{ height: `${(h / 8) * 100}%` }}
          />
        ))}
      </div>
    ) : special === 'health' ? (
      <div className="mt-2 h-7 w-full bg-slate-100 dark:bg-slate-700/50 rounded flex items-center justify-center">
        <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase">Operational</span>
      </div>
    ) : (
      <div className="mt-3 flex gap-1 items-center">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
        <div className="h-1 flex-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden min-w-0">
          <div className="w-[60%] h-full bg-emerald-400 rounded-full" />
        </div>
      </div>
    )}
  </div>
));

MetricCard.displayName = 'MetricCard';

export default MetricCard;

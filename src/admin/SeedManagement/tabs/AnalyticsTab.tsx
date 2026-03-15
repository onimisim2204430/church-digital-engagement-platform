/**
 * AnalyticsTab — Donation metrics and fundraising progress
 * Memoized and lazy-loaded
 */

import React, { memo } from 'react';
import Icon from '../../../components/common/Icon';
import { formatCurrency, getProgressPct, fmtDate } from '../helpers/giving.helpers';
import type { GivingItem } from '../types/giving.types';

interface AnalyticsTabProps {
  currentItem: GivingItem;
}

const AnalyticsTab = memo<AnalyticsTabProps>(({ currentItem }) => {
  const progressPct = getProgressPct(currentItem.raised_amount || 0, currentItem.goal_amount || 0);
  const isCompleted = currentItem.status === 'completed';
  const isFullyFunded = progressPct >= 100;
  
  // Calculate days remaining if deadline exists
  const daysRemaining = currentItem.deadline ? Math.ceil((new Date(currentItem.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const isDeadlinePassed = daysRemaining !== null && daysRemaining < 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Status banner for completed/fully funded */}
      {(isCompleted || isFullyFunded) && (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${
          isCompleted 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' 
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
        }`}>
          <Icon 
            name={isCompleted ? 'check_circle' : 'celebration'} 
            size={24} 
            className={isCompleted ? 'text-emerald-500' : 'text-amber-500'} 
          />
          <div>
            <p className={`font-bold ${isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {isCompleted ? 'Project Completed' : 'Fully Funded!'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {isCompleted 
                ? 'This project has been marked as completed. Payments are disabled on the public page.'
                : 'This project has reached its funding goal. You can mark it as completed to disable further payments.'
              }
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: 'payments', label: 'Total Raised', value: formatCurrency(currentItem.total_donations), color: 'text-primary', bg: 'bg-primary/10' },
          { icon: 'people', label: 'Unique Donors', value: currentItem.donor_count.toLocaleString(), color: 'text-blue-600', bg: 'bg-blue-100' },
          { icon: 'analytics', label: 'Avg. Gift', value: currentItem.donor_count > 0 ? formatCurrency(Math.round(currentItem.total_donations / currentItem.donor_count)) : '—', color: 'text-green-600', bg: 'bg-green-100' },
          { icon: 'trending_up', label: 'Goal Progress', value: currentItem.goal_amount ? `${progressPct}%` : 'N/A', color: progressPct >= 100 ? 'text-emerald-600' : 'text-amber-600', bg: progressPct >= 100 ? 'bg-emerald-100' : 'bg-amber-100' },
        ].map(m => (
          <div key={m.label} className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${m.bg}`}>
              <Icon name={m.icon} size={22} className={m.color} />
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">{m.label}</p>
              <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Goal progress bar — if applicable */}
      {currentItem.goal_amount && (
        <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Fundraising Progress</h3>
            <span className={`text-sm font-bold ${progressPct >= 100 ? 'text-emerald-600' : 'text-primary'}`}>
              {progressPct}% of goal
            </span>
          </div>
          <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${progressPct >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{formatCurrency(currentItem.raised_amount)} raised</span>
            <span className="text-xs text-slate-400">Goal: {formatCurrency(currentItem.goal_amount)}</span>
          </div>
        </div>
      )}

      {/* Deadline info - if applicable */}
      {currentItem.deadline && (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${
          isDeadlinePassed 
            ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
            : daysRemaining !== null && daysRemaining <= 7
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
        }`}>
          <Icon 
            name="event" 
            size={24} 
            className={isDeadlinePassed ? 'text-red-500' : daysRemaining !== null && daysRemaining <= 7 ? 'text-amber-500' : 'text-slate-400'} 
          />
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">
              {isDeadlinePassed ? 'Deadline Passed' : `${daysRemaining} days remaining`}
            </p>
            <p className="text-sm text-slate-500">
              Deadline: {fmtDate(currentItem.deadline)}
            </p>
          </div>
        </div>
      )}

      {/* Category and status info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="category" size={18} className="text-slate-400" />
            <span className="text-xs uppercase text-slate-400 font-bold">Category</span>
          </div>
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100 capitalize">{currentItem.category}</p>
        </div>
        <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="flag" size={18} className="text-slate-400" />
            <span className="text-xs uppercase text-slate-400 font-bold">Status</span>
          </div>
          <p className={`text-lg font-semibold capitalize ${
            currentItem.status === 'completed' ? 'text-emerald-600' :
            currentItem.status === 'archived' ? 'text-slate-500' :
            currentItem.status === 'draft' ? 'text-slate-400' : 'text-primary'
          }`}>
            {currentItem.status}
          </p>
        </div>
      </div>

      {/* Placeholder chart */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-10 text-center">
        <Icon name="bar_chart" size={48} className="text-slate-200 mx-auto" />
        <p className="text-slate-700 dark:text-slate-200 font-semibold mt-4">Donation Timeline Coming Soon</p>
        <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">Month-by-month donation volume, donor retention, and conversion analytics will appear here in a future update.</p>
      </div>
    </div>
  );
});

AnalyticsTab.displayName = 'AnalyticsTab';

export default AnalyticsTab;

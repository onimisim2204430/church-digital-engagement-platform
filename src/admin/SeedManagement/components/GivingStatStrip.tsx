/**
 * GivingStatStrip — Stats grid for list header (5 metric tiles)
 * Memoized to prevent re-renders when stats don't change
 */

import React, { memo } from 'react';
import Icon from '../../../components/common/Icon';
import { formatCurrency } from '../helpers/giving.helpers';

interface GivingStatStripProps {
  stats: {
    totalItems: number;
    activeItems: number;
    totalRaised: number;
    totalDonors: number;
    featuredCount: number;
  };
}

const GivingStatStrip = memo<GivingStatStripProps>(({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
    {[
      { icon: 'list_alt',    label: 'Total Items',   value: stats.totalItems,                              color: 'text-slate-600 dark:text-slate-300',  bg: 'bg-slate-100 dark:bg-slate-700' },
      { icon: 'check_circle', label: 'Active',         value: stats.activeItems,                             color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-100 dark:bg-green-950/40' },
      { icon: 'payments',     label: 'Total Raised',   value: formatCurrency(stats.totalRaised),             color: 'text-primary',                        bg: 'bg-primary/10' },
      { icon: 'people',       label: 'Total Donors',   value: stats.totalDonors.toLocaleString(),            color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-100 dark:bg-blue-950/40' },
      { icon: 'star',         label: 'Featured',       value: stats.featuredCount,                           color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-100 dark:bg-amber-950/40' },
    ].map(s => (
      <div key={s.label} className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg ${s.bg}`}>
          <Icon name={s.icon} size={18} className={s.color} />
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-soft dark:text-slate-400 font-bold tracking-wider">{s.label}</p>
          <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
        </div>
      </div>
    ))}
  </div>
));

GivingStatStrip.displayName = 'GivingStatStrip';

export default GivingStatStrip;

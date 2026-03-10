/**
 * SettingsTab — Item metadata and danger zone actions
 * Memoized and lazy-loaded
 */

import React, { memo } from 'react';
import Icon from '../../../components/common/Icon';
import { formatCurrency, fmtDate } from '../helpers/giving.helpers';
import type { GivingItem } from '../types/giving.types';

interface SettingsTabProps {
  currentItem: GivingItem;
  onArchive: () => void;
  onDelete: (item: GivingItem) => void;
}

const SettingsTab = memo<SettingsTabProps>(({ currentItem, onArchive, onDelete }) => (
  <div className="flex flex-col lg:flex-row gap-5 items-start">
    <div className="flex-1 flex flex-col gap-5">
      {/* Info card */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
          <Icon name="info" size={18} className="text-primary/70" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Item Metadata</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {[
            { icon: 'bookmark', label: 'Item ID', value: currentItem.id },
            { icon: 'library_books', label: 'Category', value: currentItem.category },
            { icon: 'calendar_today', label: 'Created', value: fmtDate(currentItem.created_at) },
            { icon: 'history', label: 'Last Updated', value: fmtDate(currentItem.updated_at) },
            { icon: 'people', label: 'Total Donors', value: currentItem.donor_count.toLocaleString() },
            { icon: 'payments', label: 'Total Raised', value: formatCurrency(currentItem.total_donations) },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-4 px-6 py-3.5">
              <Icon name={row.icon} size={16} className="text-slate-300 flex-shrink-0" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-32 flex-shrink-0">{row.label}</span>
              <span className="text-sm text-slate-800 dark:text-slate-200 font-medium truncate">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    {/* Danger zone */}
    <div className="w-full lg:w-80 flex-shrink-0">
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-red-200 dark:border-red-800/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-red-100 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/20 flex items-center gap-2.5">
          <Icon name="warning" size={18} className="text-red-500" />
          <h3 className="text-sm font-bold text-red-700">Danger Zone</h3>
        </div>
        <div className="px-5 py-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Archive Item</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed mb-3">Hides the item from the public page without deleting data.</p>
            <button
              onClick={onArchive}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="archive" size={14} />
              Archive (Set Hidden + Paused)
            </button>
          </div>
          <div className="border-t border-red-100" />
          <div>
            <p className="text-sm font-semibold text-red-700">Delete Item</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed mb-3">Permanently removes this item. Donation records will be retained but detached.</p>
            <button
              onClick={() => onDelete(currentItem)}
              className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Icon name="delete_forever" size={14} />
              Delete Giving Item
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
));

SettingsTab.displayName = 'SettingsTab';

export default SettingsTab;

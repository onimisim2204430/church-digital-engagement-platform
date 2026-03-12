/**
 * GivingListItem — A single draggable row in the list view
 * Memoized to prevent re-renders when props don't change
 * Uses data-item-id pattern for stable drag handlers (no closure over item.id)
 */

import React, { memo } from 'react';
import Icon from '../../../components/common/Icon';
import type { GivingItem } from '../types/giving.types';
import { formatCurrency, getProgressPct, statusStyle, visibilityStyle, normalizeIconName } from '../helpers/giving.helpers';

interface GivingListItemProps {
  item: GivingItem;
  index: number;
  isDragging: boolean;
  supportedIcons: string[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onEdit: (id: string) => void;
  onToggleFeatured: (id: string, value: boolean) => void;
  onDelete: (item: GivingItem) => void;
}

const GivingListItem = memo<GivingListItemProps>(({
  item,
  index,
  isDragging,
  supportedIcons,
  onDragStart,
  onDragOver,
  onDrop,
  onEdit,
  onToggleFeatured,
  onDelete,
}) => {
  const pct = item.goal_amount ? getProgressPct(item.raised_amount, item.goal_amount) : null;

  return (
    <div
      data-item-id={item.id}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all select-none ${isDragging ? 'opacity-40 scale-[0.99]' : ''}`}
    >
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Drag handle */}
        <div className="text-slate-300 dark:text-slate-600 cursor-grab active:cursor-grabbing flex-shrink-0">
          <Icon name="drag_indicator" size={20} />
        </div>

        {/* Order number */}
        <span className="text-xs font-bold text-slate-300 dark:text-slate-600 w-5 text-center flex-shrink-0">{index + 1}</span>

        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
          <Icon name={normalizeIconName(supportedIcons, item.icon)} size={20} className="text-slate-soft dark:text-slate-400" />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-200 truncate">{item.title}</p>
            {item.is_featured && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[9px] font-bold uppercase tracking-wider border border-amber-200 dark:border-amber-800/50">Featured</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-soft dark:text-slate-400 flex-wrap">
            <span className="font-semibold text-slate-600 dark:text-slate-300">{item.category}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span>{item.donor_count} donors</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(item.total_donations)} raised</span>
            {item.goal_amount && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                <span>Goal: {formatCurrency(item.goal_amount)} ({pct}%)</span>
              </>
            )}
          </div>
          {/* Inline progress bar for goal items */}
          {item.goal_amount != null && (
            <div className="mt-2 h-1.5 w-48 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusStyle(item.status)}`}>
            {item.status}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${visibilityStyle(item.visibility)}`}>
            {item.visibility.replace('_', ' ')}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(item.id)}
            className="p-2 rounded-lg text-slate-soft hover:text-primary hover:bg-primary/10 transition-colors"
            title="Edit"
          >
            <Icon name="edit" size={16} />
          </button>
          <button
            onClick={() => onToggleFeatured(item.id, !item.is_featured)}
            className={`p-2 rounded-lg transition-colors ${item.is_featured ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'}`}
            title={item.is_featured ? 'Remove from featured' : 'Mark as featured'}
          >
            <Icon name="star" size={16} />
          </button>
          <button
            onClick={() => onDelete(item)}
            className="p-2 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Delete"
          >
            <Icon name="delete" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});

GivingListItem.displayName = 'GivingListItem';

export default GivingListItem;

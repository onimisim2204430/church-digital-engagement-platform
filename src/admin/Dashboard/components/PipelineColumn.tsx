/**
 * PipelineColumn — A kanban column for a content status (draft/review/scheduled)
 * Memoized to prevent re-renders when props don't change
 */

import React, { memo } from 'react';
import { STATUS_ICONS, STATUS_ICON_COLORS, STATUS_LABELS, STATUS_LABEL_COLORS } from '../constants/dashboard.constants';
import PipelineCard from './PipelineCard';
import type { ContentItem } from '../types/dashboard.types';

interface PipelineColumnProps {
  status: ContentItem['status'];
  items: ContentItem[];
  onAddClick: () => void;
}

const PipelineColumn = memo(({ status, items, onAddClick }: PipelineColumnProps) => {
  const icon = STATUS_ICONS[status];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border-light dark:border-slate-700 pb-2">
        <span className={`text-xs font-bold uppercase ${STATUS_LABEL_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
        {icon ? (
          <span className={`material-symbols-outlined text-sm ${STATUS_ICON_COLORS[status]}`}>{icon}</span>
        ) : (
          <button onClick={onAddClick} className="text-sm text-slate-soft dark:text-slate-500 hover:text-primary dark:hover:text-primary">add</button>
        )}
      </div>
      {items.map((item) => <PipelineCard key={item.id} item={item} />)}
    </div>
  );
});

PipelineColumn.displayName = 'PipelineColumn';

export default PipelineColumn;

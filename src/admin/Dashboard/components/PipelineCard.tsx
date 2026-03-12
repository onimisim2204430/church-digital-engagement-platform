/**
 * PipelineCard — A single content item in the pipeline kanban
 * Memoized to prevent re-renders when props don't change
 * Images use lazy loading for performance
 */

import React, { memo } from 'react';
import { STATUS_STYLES } from '../constants/dashboard.constants';
import type { ContentItem } from '../types/dashboard.types';

const PipelineCard = memo(({ item }: { item: ContentItem }) => {
  const s = STATUS_STYLES[item.status];
  return (
    <div className={`rounded-lg border ${s.border} ${s.bg} p-3 space-y-2 shadow-sm cursor-pointer group transition-colors`}>
      {item.thumbnail && (
        <div className="h-20 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <img
            alt="Thumbnail"
            className="w-full h-full object-cover"
            src={item.thumbnail}
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-deep dark:text-slate-100 leading-tight group-hover:text-primary dark:group-hover:text-primary">{item.title}</h3>
      <div className="flex items-center justify-between">
        {item.authors ? (
          <div className="flex -space-x-2">
            {Array.from({ length: Math.min(item.authors, 2) }).map((_, i) => (
              <div key={i} className="size-5 rounded-full bg-slate-200 border-2 border-white" />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-soft dark:text-slate-400">{item.scheduledDate}, {item.scheduledTime}</p>
        )}
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{item.type}</span>
      </div>
    </div>
  );
});

PipelineCard.displayName = 'PipelineCard';

export default PipelineCard;

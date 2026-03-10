/**
 * ActivityFeedItem — A single activity in the live feed
 * Memoized to prevent re-renders when props don't change
 */

import React, { memo } from 'react';
import Icon from '../../../components/common/Icon';
import type { ActivityItem } from '../types/dashboard.types';

const ActivityFeedItem = memo(({ activity }: { activity: ActivityItem }) => (
  <div className="flex gap-3 items-start min-w-0">
    <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-700 border border-border-light dark:border-slate-600 flex-shrink-0 flex items-center justify-center text-slate-soft dark:text-slate-400">
      <Icon name={activity.icon} size={14} />
    </div>
    <div className="border-b border-slate-50 dark:border-slate-700/50 pb-2 min-w-0 flex-1">
      <p className="text-sm text-slate-deep dark:text-slate-200 overflow-hidden">
        <span className="font-bold">{activity.user}</span> {activity.action}
      </p>
      <p className="text-xs text-slate-soft dark:text-slate-400 mt-0.5 truncate">{activity.time} · {activity.location}</p>
    </div>
  </div>
));

ActivityFeedItem.displayName = 'ActivityFeedItem';

export default ActivityFeedItem;

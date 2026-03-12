/**
 * Dashboard module constants — all module-level data (zero allocation on re-render)
 */

import type { ActivityItem, ContentItem } from '../types/dashboard.types';

export const ACTIVITIES: ActivityItem[] = [
  { id: 1, user: 'Sarah M.',  action: 'shared a prayer request',       location: 'Houston, TX', time: '2 mins ago',  icon: 'person' },
  { id: 2, user: 'David L.',  action: 'joined "Young Adults" group',   location: 'London, UK',  time: '5 mins ago',  icon: 'group_add' },
  { id: 3, user: 'Maria G.',  action: 'started a devotion',            location: 'Madrid, ES',  time: '8 mins ago',  icon: 'menu_book' },
  { id: 4, user: 'James K.',  action: 'submitted a prayer request',    location: 'Nairobi, KE', time: '12 mins ago', icon: 'volunteer_activism' },
];

export const CONTENT_ITEMS: ContentItem[] = [
  { id: 1, title: 'Sermon Series: Faith in Action',     status: 'draft',     type: 'Podcasting',     authors: 2,
    thumbnail: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400&q=80' },
  { id: 2, title: 'Sunday Service: Awakening Pt. 4',    status: 'review',    type: 'Needs Approval', authors: 1,
    thumbnail: 'https://images.unsplash.com/photo-1438232992991-995b671e5f2d?w=400&q=80' },
  { id: 3, title: 'Newsletter: Monthly Vision Update',  status: 'scheduled', type: 'Auto-post',
    scheduledDate: 'Oct 12', scheduledTime: '09:00 AM' },
];

export const REGIONS = [
  { region: 'North America', value: '2.4M', color: 'bg-primary' },
  { region: 'Europe',        value: '890K', color: 'bg-emerald-500' },
  { region: 'Africa',        value: '1.1M', color: 'bg-amber-500' },
  { region: 'Asia Pacific',  value: '640K', color: 'bg-violet-500' },
  { region: 'Latin America', value: '420K', color: 'bg-rose-400' },
  { region: 'Middle East',   value: '180K', color: 'bg-cyan-500' },
] as const;

export const PIPELINE_STATUSES = ['draft', 'review', 'scheduled'] as const;

export const STATUS_LABELS: Record<ContentItem['status'], string> = {
  draft:     'Draft (3)',
  review:    'Review (1)',
  scheduled: 'Scheduled (4)',
};

export const STATUS_LABEL_COLORS: Record<ContentItem['status'], string> = {
  draft:     'text-slate-soft dark:text-slate-400',
  review:    'text-amber-600 dark:text-amber-400',
  scheduled: 'text-emerald-600 dark:text-emerald-400',
};

export const STATUS_ICONS: Record<ContentItem['status'], string | null> = {
  draft:     null,
  review:    'priority_high',
  scheduled: 'event_available',
};

export const STATUS_ICON_COLORS: Record<ContentItem['status'], string> = {
  draft:     '',
  review:    'text-amber-500',
  scheduled: 'text-emerald-500',
};

export const STATUS_STYLES: Record<ContentItem['status'], { border: string; bg: string; badge: string }> = {
  draft:     { border: 'border-border-light dark:border-slate-700 hover:border-primary/40',       bg: 'bg-white dark:bg-slate-800/60',       badge: 'bg-slate-100 dark:bg-slate-700 text-slate-soft dark:text-slate-400' },
  review:    { border: 'border-amber-100 dark:border-amber-900/50 hover:border-amber-300',         bg: 'bg-amber-50/30 dark:bg-amber-950/20', badge: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50' },
  scheduled: { border: 'border-border-light dark:border-slate-700',                                bg: 'bg-white dark:bg-slate-800/60',       badge: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' },
};

export const HIDE_SCROLLBAR: React.CSSProperties = { scrollbarWidth: 'none' };

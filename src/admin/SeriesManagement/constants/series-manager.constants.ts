/**
 * SeriesManager constants
 */

export const VISIBILITY_STYLES = {
  PUBLIC: 'px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold',
  MEMBERS_ONLY: 'px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold',
  HIDDEN: 'px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold',
} as const;

export const VISIBILITY_LABELS = {
  PUBLIC: 'Public',
  MEMBERS_ONLY: 'Members Only',
  HIDDEN: 'Hidden',
} as const;

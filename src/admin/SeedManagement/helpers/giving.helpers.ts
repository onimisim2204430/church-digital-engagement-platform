/**
 * Pure helper functions for Giving/Seed Manager
 */

import type { CreateGivingItemRequest } from '../../../services/giving.service';

export const formatCurrency = (n: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export const fmtDate = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export const getProgressPct = (raised: number, goal: number): number =>
  goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;

export const statusStyle = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active': return 'bg-green-100 text-green-700 border-green-200';
    case 'paused': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'archived':
    case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

export const visibilityStyle = (v: string): string => {
  switch (v.toLowerCase()) {
    case 'public': return 'bg-green-100 text-green-700 border-green-200';
    case 'members_only': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-slate-100 text-slate-500 border-slate-200';
  }
};

export const emptyForm = (): CreateGivingItemRequest => ({
  category: 'offering',
  title: '',
  description: '',
  icon: 'favorite',
  visibility: 'public',
  status: 'draft',
  is_featured: false,
  is_recurring_enabled: false,
  suggested_amounts: [25, 50, 100, 250],
  goal_amount: null,
  deadline: '',
  verse: '',
  cover_image: '',
  display_order: 99,
});

export const normalizeIconName = (supportedIcons: string[], name?: string): string =>
  name && supportedIcons.includes(name) ? name : 'help_outline';

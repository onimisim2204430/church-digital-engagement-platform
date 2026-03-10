/**
 * InteractionModeration
 *
 * Layout matches the admin system (screenshot: My Drafts page):
 *  ┌─────────────────────────────────────────────────────┐
 *  │  Page title + breadcrumb + action buttons            │  ← page-header strip
 *  ├──────────┬──────────┬──────────┬────────────────────┤
 *  │ stat card │ stat card│ stat card│     stat card      │  ← metrics row
 *  ├─────────────────────────────────────────────────────┤
 *  │  [Questions] [Comments] [Flagged]   search  filter  │  ← tab/filter bar (white card)
 *  ├─────────────────────────────────────────────────────┤
 *  │  TABLE — white card, sticky header, zebra rows       │
 *  │  ...                                                 │
 *  └─────────────────────────────────────────────────────┘
 *
 *  Clicking "Manage" opens a fixed slide-over drawer from the RIGHT (not a push layout).
 *
 *  Design language: Tailwind-compatible utility classes + scoped CSS vars.
 *  Fonts / colours / radii all inherit from the admin CSS variables.
 */

import React, {
  useState, useEffect, useMemo, useCallback, memo,
} from 'react';
import interactionService, {
  Interaction, InteractionDetail, InteractionStats,
} from '../services/interaction.service';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '../types/auth.types';
import Icon from '../components/common/Icon';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab          = 'questions' | 'comments' | 'flagged';
type StatusFilter = '' | 'OPEN' | 'ANSWERED' | 'CLOSED' | 'PENDING' | 'REVIEWED';
type DrawerTab    = 'detail' | 'respond';
type SortKey      = 'type' | 'status' | 'created_at' | 'user';
type SortDir      = 'asc' | 'desc';

// ─── Configs ──────────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; dot: string; text: string; bg: string; border: string }> = {
  OPEN:     { label: 'Open',     dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  PENDING:  { label: 'Pending',  dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  ANSWERED: { label: 'Answered', dot: '#10b981', text: '#065f46', bg: '#ecfdf5', border: '#a7f3d0' },
  REVIEWED: { label: 'Reviewed', dot: '#10b981', text: '#065f46', bg: '#ecfdf5', border: '#a7f3d0' },
  ACTIONED: { label: 'Actioned', dot: '#10b981', text: '#065f46', bg: '#ecfdf5', border: '#a7f3d0' },
  CLOSED:   { label: 'Closed',   dot: '#9ca3af', text: '#4b5563', bg: '#f9fafb', border: '#e5e7eb' },
};

const TYPE: Record<string, { label: string; icon: string; dot: string; text: string; bg: string; border: string }> = {
  QUESTION: { label: 'Question', icon: 'help_outline',        dot: '#3b82f6', text: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
  COMMENT:  { label: 'Comment',  icon: 'chat_bubble_outline', dot: '#6b7280', text: '#374151', bg: '#f9fafb', border: '#e5e7eb' },
  FLAGGED:  { label: 'Flagged',  icon: 'flag',                dot: '#ef4444', text: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
};

// ─── Injected CSS (scoped to .imod) ───────────────────────────────────────────

const CSS = `
/* PAGE SHELL */
.imod {
  min-height: 100%;
  background: transparent;
  font-family: 'Times New Roman', Times, serif;
  color: var(--admin-text-primary, #0f172a);
  padding: 28px 32px 48px;
  position: relative;
}
.imod *, .imod *::before, .imod *::after { box-sizing: border-box; }

/* PAGE HEADER */
.imod-page-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 16px;
  margin-bottom: 24px; flex-wrap: wrap;
}
.imod-page-title {
  font-size: 26px; font-weight: 700; margin: 0 0 4px;
  color: var(--admin-text-primary, #0f172a);
  font-family: 'Times New Roman', Times, serif;
  letter-spacing: -0.02em; line-height: 1.2;
}
.imod-page-crumb {
  font-size: 13px; color: var(--admin-text-secondary, #64748b);
  display: flex; align-items: center; gap: 5px;
}
.imod-page-crumb span { color: var(--admin-text-tertiary, #94a3b8); }
.imod-header-btns { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }

/* BUTTONS */
.imod-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: var(--admin-radius-md, 8px);
  font-family: 'Times New Roman', Times, serif;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all 0.15s; white-space: nowrap; border: none;
}
.imod-btn-ghost {
  background: var(--admin-bg-primary, #fff);
  color: var(--admin-text-primary, #0f172a);
  border: 1px solid var(--admin-border, #e2e8f0);
  box-shadow: 0 1px 2px rgba(15,23,42,.05);
}
.imod-btn-ghost:hover { background: var(--admin-bg-secondary, #f1f5f9); }
.imod-btn-primary {
  background: var(--admin-primary, #2268f5);
  color: #fff;
  box-shadow: 0 2px 8px rgba(34,104,245,.25);
}
.imod-btn-primary:hover {
  background: var(--admin-primary-hover, #1a52d0);
  box-shadow: 0 4px 14px rgba(34,104,245,.35);
}
.imod-btn-danger  { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
.imod-btn-danger:not(:disabled):hover  { background: #fee2e2; }
.imod-btn-dark    { background: #0f172a; color: #fff; }
.imod-btn-dark:not(:disabled):hover    { background: #1e293b; }
.imod-btn:disabled { opacity: .45; cursor: not-allowed; }

/* STAT CARDS ROW */
.imod-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px; margin-bottom: 24px;
}
@media (max-width: 900px) { .imod-stats { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .imod-stats { grid-template-columns: 1fr; } }

.imod-stat-card {
  background: var(--sidebar-bg, var(--admin-bg-primary, #fff));
  border: 1px solid var(--admin-border, #e2e8f0);
  border-radius: var(--admin-radius-lg, 12px);
  padding: 18px 20px;
  display: flex; align-items: center; gap: 14px;
  cursor: pointer; transition: all 0.15s;
  box-shadow: 0 1px 3px rgba(15,23,42,.05);
  position: relative; overflow: hidden;
}
.imod-stat-card::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0;
  height: 2px; background: transparent; transition: background .15s;
}
.imod-stat-card:hover { border-color: #93c5fd; box-shadow: 0 4px 12px rgba(34,104,245,.1); }
.imod-stat-card.active { border-color: var(--admin-primary, #2268f5); box-shadow: 0 4px 16px rgba(34,104,245,.14); }
.imod-stat-card.active::after { background: var(--admin-primary, #2268f5); }

.imod-stat-icon {
  width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.imod-stat-body { flex: 1; min-width: 0; }
.imod-stat-val {
  font-size: 28px; font-weight: 700; line-height: 1;
  font-family: 'Times New Roman', Times, serif;
  color: var(--admin-text-primary, #0f172a);
}
.imod-stat-card.active .imod-stat-val { color: var(--admin-primary, #2268f5); }
.imod-stat-label {
  font-size: 12px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .07em; margin-top: 4px;
  color: var(--admin-text-secondary, #64748b);
}
.imod-stat-sub {
  font-size: 11px; color: var(--admin-text-tertiary, #94a3b8); margin-top: 1px;
}

/* MAIN CARD (tabs + table) */
.imod-card {
  background: var(--sidebar-bg, var(--admin-bg-primary, #fff));
  border: 1px solid var(--admin-border, #e2e8f0);
  border-radius: var(--admin-radius-lg, 12px);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15,23,42,.05);
}

/* TAB BAR */
.imod-tabbar {
  display: flex; align-items: center;
  border-bottom: 1px solid var(--admin-border, #e2e8f0);
  padding: 0 20px; background: var(--sidebar-bg, var(--admin-bg-primary, #fff));
}
.imod-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 14px 16px 13px;
  font-family: 'Times New Roman', Times, serif;
  font-size: 13px; font-weight: 600;
  color: var(--admin-text-secondary, #64748b);
  background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; transition: all 0.14s; white-space: nowrap;
  margin-bottom: -1px;
}
.imod-tab:hover { color: var(--admin-text-primary, #0f172a); }
.imod-tab.active {
  color: var(--admin-primary, #2268f5);
  border-bottom-color: var(--admin-primary, #2268f5);
}
.imod-tab-pill {
  font-size: 10px; font-weight: 700; padding: 2px 7px;
  border-radius: 20px; background: var(--admin-bg-secondary, #f1f5f9);
  color: var(--admin-text-secondary, #64748b);
}
.imod-tab.active .imod-tab-pill {
  background: #dbeafe; color: var(--admin-primary, #2268f5);
}
.imod-tabbar-sep { flex: 1; }

/* FILTER BAR */
.imod-filterbar {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px;
  background: var(--sidebar-bg, var(--admin-bg-primary, #fff));
  border-bottom: 1px solid var(--admin-border, #e2e8f0);
  flex-wrap: wrap;
}
.imod-search-wrap { position: relative; flex: 1; min-width: 180px; max-width: 320px; }
.imod-search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  font-size: 16px; color: var(--admin-text-tertiary, #94a3b8); pointer-events: none;
}
.imod-search {
  width: 100%; padding: 8px 12px 8px 34px;
  border: 1px solid var(--admin-border, #e2e8f0);
  border-radius: var(--admin-radius-md, 8px);
  font-family: 'Times New Roman', Times, serif; font-size: 13px;
  background: var(--sidebar-bg, var(--admin-bg-primary, #fff)); color: var(--admin-text-primary, #0f172a);
  outline: none; transition: all .14s;
}
.imod-search:focus { border-color: var(--admin-primary, #2268f5); box-shadow: 0 0 0 3px rgba(34,104,245,.1); }
.imod-search::placeholder { color: var(--admin-text-tertiary, #94a3b8); }

.imod-select {
  padding: 8px 12px;
  border: 1px solid var(--admin-border, #e2e8f0);
  border-radius: var(--admin-radius-md, 8px);
  font-family: 'Times New Roman', Times, serif; font-size: 13px;
  background: var(--sidebar-bg, var(--admin-bg-primary, #fff)); color: var(--admin-text-primary, #0f172a);
  outline: none; cursor: pointer;
}
.imod-select:focus { border-color: var(--admin-primary, #2268f5); box-shadow: 0 0 0 3px rgba(34,104,245,.1); }

.imod-result-count {
  font-size: 12px; font-weight: 600; text-transform: uppercase;
  letter-spacing: .06em; color: var(--admin-text-tertiary, #94a3b8);
  white-space: nowrap; margin-left: auto;
}

/* TABLE */
.imod-table-wrap {
  overflow-x: auto;
  scrollbar-width: thin; scrollbar-color: var(--admin-border,#e2e8f0) transparent;
  background: var(--sidebar-bg, var(--admin-bg-primary, #fff));
}
.imod-table { width: 100%; border-collapse: collapse; min-width: 680px; }
.imod-thead {
  position: sticky; top: 0; z-index: 2;
  background: var(--sidebar-bg, var(--admin-bg-primary, #fff));
  border-bottom: 1px solid var(--admin-border, #e2e8f0);
}
.imod-thead th {
  padding: 10px 16px; text-align: left;
  font-family: 'Times New Roman', Times, serif;
  font-size: 11px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase;
  color: var(--admin-text-secondary, #64748b);
  cursor: pointer; user-select: none; white-space: nowrap;
  transition: color .12s;
}
.imod-thead th:hover { color: var(--admin-text-primary, #0f172a); }
.imod-thead th.sorted { color: var(--admin-primary, #2268f5); }

.imod-tr {
  border-bottom: 1px solid var(--admin-border, #e2e8f0);
  transition: background .11s; cursor: pointer;
}
.imod-tr:last-child { border-bottom: none; }
.imod-tr:hover { background: #f8faff; }
.imod-tr.active-row { background: #eff6ff; }
.imod-tr.active-row td:first-child {
  border-left: 3px solid var(--admin-primary, #2268f5);
  padding-left: 13px;
}

.imod-td { padding: 12px 16px; vertical-align: middle; }

.imod-content-preview {
  font-size: 13px; line-height: 1.45;
  color: var(--admin-text-primary, #0f172a);
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
  max-width: 260px;
}
.imod-user-name  { font-size: 13px; font-weight: 600; color: var(--admin-text-primary, #0f172a); }
.imod-user-email { font-size: 11px; color: var(--admin-text-secondary, #64748b); font-style: italic; }
.imod-post-title { font-size: 13px; font-weight: 500; color: var(--admin-text-primary, #0f172a); }
.imod-post-auth  { font-size: 11px; color: var(--admin-text-secondary, #64748b); }
.imod-ago        { font-size: 12px; color: var(--admin-text-secondary, #64748b); white-space: nowrap; }
.imod-row-no     { font-size: 11px; color: var(--admin-text-tertiary, #94a3b8); font-family: monospace; }

.imod-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px 3px 6px; border-radius: 20px; font-size: 11px; font-weight: 600;
  border: 1px solid; letter-spacing: .03em; white-space: nowrap;
  font-family: 'Times New Roman', Times, serif;
}
.imod-badge-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

.imod-hidden-tag {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  padding: 1px 5px; border-radius: 20px;
  background: #f1f5f9; border: 1px solid #e2e8f0; color: #9ca3af; margin-left: 4px;
}

.imod-sort-icon { font-size: 11px; opacity: .35; margin-left: 2px; vertical-align: middle; }
.imod-thead th.sorted .imod-sort-icon { opacity: 1; color: var(--admin-primary, #2268f5); }

/* Manage button */
.imod-manage {
  padding: 5px 14px; border-radius: var(--admin-radius-md, 8px);
  font-family: 'Times New Roman', Times, serif; font-size: 12px; font-weight: 700;
  cursor: pointer; transition: all .13s; white-space: nowrap;
  background: transparent; border: 1.5px solid var(--admin-border, #e2e8f0);
  color: var(--admin-text-secondary, #64748b);
}
.imod-manage:hover { border-color: var(--admin-primary, #2268f5); color: var(--admin-primary, #2268f5); background: #eff6ff; }
.imod-manage.open  { background: var(--admin-primary, #2268f5); border-color: var(--admin-primary, #2268f5); color: #fff; }

/* Empty state */
.imod-empty {
  padding: 72px 24px; text-align: center;
  display: flex; flex-direction: column; align-items: center;
}
.imod-empty-icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--admin-bg-secondary, #f1f5f9);
  border: 2px dashed var(--admin-border, #e2e8f0);
  display: flex; align-items: center; justify-content: center;
  color: var(--admin-text-tertiary, #94a3b8); margin-bottom: 16px;
}
.imod-empty h3 {
  font-family: 'Times New Roman', Times, serif; font-size: 17px; font-weight: 700;
  color: var(--admin-text-primary, #0f172a); margin: 0 0 6px;
}
.imod-empty p { font-size: 13px; color: var(--admin-text-secondary, #64748b); margin: 0; }

/* Skeleton shimmer */
.imod-skel-row { border-bottom: 1px solid var(--admin-border, #e2e8f0); }
.imod-skel {
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--sidebar-bg, var(--admin-bg-primary, #fff)) 25%,
    var(--admin-border, #e2e8f0) 50%,
    var(--sidebar-bg, var(--admin-bg-primary, #fff)) 75%
  );
  background-size: 200% 100%; animation: imodShimmer 1.4s infinite;
}
@keyframes imodShimmer { from{background-position:200% 0} to{background-position:-200% 0} }

/* ══════════════════════════════════════════════════════════════════
   SLIDE-OVER DRAWER (fixed, overlays from right)
══════════════════════════════════════════════════════════════════ */
.imod-backdrop {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(15,23,42,.35);
  backdrop-filter: blur(3px);
  animation: imodFade .2s ease;
}
@keyframes imodFade { from{opacity:0} to{opacity:1} }

.imod-drawer {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 101;
  width: 480px; max-width: 96vw;
  background: var(--admin-bg-primary, #fff);
  box-shadow: -8px 0 40px rgba(15,23,42,.16);
  display: flex; flex-direction: column; overflow: hidden;
  animation: imodSlide .28s cubic-bezier(.32,1,.56,1);
}
@keyframes imodSlide { from{transform:translateX(100%)} to{transform:translateX(0)} }

/* Drawer header */
.imod-drawer-header {
  display: flex; align-items: stretch;
  border-bottom: 1px solid var(--admin-border, #e2e8f0);
  flex-shrink: 0;
}
.imod-drawer-type-strip {
  width: 56px; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 4px; padding: 16px 0;
  border-right: 1px solid var(--admin-border, #e2e8f0);
}
.imod-drawer-type-icon {
  width: 36px; height: 36px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}
.imod-drawer-type-lbl {
  font-size: 8px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
  color: var(--admin-text-tertiary, #94a3b8); writing-mode: horizontal-tb;
}

.imod-drawer-info {
  flex: 1; min-width: 0; padding: 16px 14px;
}
.imod-drawer-meta {
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;
}
.imod-drawer-weekday {
  font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
  color: var(--admin-text-tertiary, #94a3b8);
}
.imod-drawer-name {
  font-family: 'Times New Roman', Times, serif;
  font-size: 17px; font-weight: 700;
  color: var(--admin-text-primary, #0f172a);
  line-height: 1.25; margin-bottom: 3px;
}
.imod-drawer-sub { font-size: 12px; color: var(--admin-text-secondary, #64748b); }

.imod-drawer-close {
  width: 52px; flex-shrink: 0;
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 16px;
}
.imod-drawer-close button {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--admin-bg-secondary, #f1f5f9);
  border: 1px solid var(--admin-border, #e2e8f0);
  color: var(--admin-text-secondary, #64748b);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .13s;
}
.imod-drawer-close button:hover { background: #fef2f2; border-color: #fecaca; color: #dc2626; }

/* Drawer tabs */
.imod-drawer-tabs {
  display: flex; border-bottom: 1px solid var(--admin-border, #e2e8f0);
  background: var(--admin-bg-secondary, #f8faff); flex-shrink: 0;
}
.imod-dtab {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 11px 8px 10px;
  font-family: 'Times New Roman', Times, serif;
  font-size: 12px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
  color: var(--admin-text-secondary, #64748b); background: none; border: none;
  border-bottom: 2px solid transparent; margin-bottom: -1px; cursor: pointer; transition: all .13s;
}
.imod-dtab:hover { color: var(--admin-text-primary, #0f172a); }
.imod-dtab.on { color: var(--admin-primary, #2268f5); border-bottom-color: var(--admin-primary, #2268f5); }

/* Drawer body */
.imod-drawer-body {
  flex: 1; overflow-y: auto; padding: 20px 24px 16px;
  scrollbar-width: thin; scrollbar-color: var(--admin-border,#e2e8f0) transparent;
}

.imod-section-label {
  font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
  color: var(--admin-primary, #2268f5); margin-bottom: 8px; margin-top: 20px;
  display: flex; align-items: center; gap: 6px;
}
.imod-section-label:first-child { margin-top: 0; }
.imod-section-label::after { content:''; flex:1; height:1px; background:#bfdbfe; }

.imod-info-table {
  width: 100%; border-collapse: collapse;
  background: var(--admin-bg-secondary, #f8faff);
  border: 1px solid var(--admin-border, #e2e8f0);
  border-radius: var(--admin-radius-lg, 12px);
  overflow: hidden; margin-bottom: 4px;
}
.imod-info-table td {
  padding: 9px 14px; font-size: 13px;
  border-bottom: 1px solid var(--admin-border, #e2e8f0);
  vertical-align: top;
}
.imod-info-table tr:last-child td { border-bottom: none; }
.imod-info-table .k {
  font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
  color: var(--admin-text-tertiary, #94a3b8); width: 90px;
}
.imod-info-table .v { color: var(--admin-text-primary, #0f172a); }

.imod-content-box {
  background: var(--admin-bg-secondary, #f8faff);
  border: 1px solid var(--admin-border, #e2e8f0);
  border-radius: var(--admin-radius-lg, 12px);
  padding: 14px 16px; font-size: 14px; line-height: 1.75;
  color: var(--admin-text-primary, #0f172a); white-space: pre-line;
  font-family: 'Times New Roman', Times, serif;
}

.imod-flag-box {
  background: #fef2f2; border: 1px solid #fecaca;
  border-left: 3px solid #dc2626;
  border-radius: 0 8px 8px 0; padding: 12px 16px;
}
.imod-flag-lbl { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #dc2626; margin-bottom: 5px; }
.imod-flag-txt { font-size: 13px; color: #7f1d1d; line-height: 1.5; }
.imod-flag-by  { margin-top: 8px; font-size: 11px; color: #b91c1c; }

.imod-reply-card {
  background: var(--admin-bg-secondary, #f8faff);
  border: 1px solid var(--admin-border, #e2e8f0);
  border-radius: 10px; padding: 12px 14px; margin-bottom: 8px;
}
.imod-reply-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.imod-reply-name { font-size: 12px; font-weight: 700; color: var(--admin-text-primary, #0f172a); }
.imod-reply-date { font-size: 11px; color: var(--admin-text-secondary, #64748b); font-style: italic; }
.imod-reply-body { font-size: 13px; color: var(--admin-text-secondary, #64748b); line-height: 1.6; }

.imod-field { margin-bottom: 14px; }
.imod-field-label {
  display: block; font-size: 11px; font-weight: 700; letter-spacing: .08em;
  text-transform: uppercase; color: var(--admin-text-secondary, #64748b); margin-bottom: 6px;
}
.imod-textarea {
  width: 100%; background: var(--admin-bg-primary, #fff);
  border: 1.5px solid var(--admin-border, #e2e8f0);
  border-radius: var(--admin-radius-md, 8px); padding: 10px 13px;
  font-family: 'Times New Roman', Times, serif; font-size: 14px;
  color: var(--admin-text-primary, #0f172a); outline: none; resize: none; transition: all .13s;
}
.imod-textarea:focus { border-color: var(--admin-primary, #2268f5); box-shadow: 0 0 0 3px rgba(34,104,245,.1); }
.imod-textarea::placeholder { color: var(--admin-text-tertiary, #94a3b8); }

.imod-notice {
  background: var(--admin-bg-secondary, #f8faff);
  border: 1px solid var(--admin-border, #e2e8f0);
  border-radius: 8px; padding: 16px; font-size: 13px;
  color: var(--admin-text-secondary, #64748b); text-align: center; line-height: 1.65;
}

.imod-alert-ok  { display:flex; align-items:center; gap:7px; padding:9px 13px; border-radius:8px; font-size:13px; margin-bottom:12px; background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; }
.imod-alert-err { display:flex; align-items:center; gap:7px; padding:9px 13px; border-radius:8px; font-size:13px; margin-bottom:12px; background:#fef2f2; border:1px solid #fecaca; color:#dc2626; }

/* Drawer footer */
.imod-drawer-footer {
  flex-shrink: 0;
  background: var(--admin-bg-primary, #fff);
  border-top: 1px solid var(--admin-border, #e2e8f0);
  padding: 14px 24px 18px;
  display: flex; gap: 8px; flex-wrap: wrap;
}
.imod-drawer-footer .imod-btn { flex: 1; min-width: 80px; justify-content: center; }
.imod-drawer-footer .imod-btn-full { flex-basis: 100%; }

/* Loading spinner */
.imod-spinner {
  width: 24px; height: 24px; border-radius: 50%;
  border: 3px solid var(--admin-border, #e2e8f0);
  border-top-color: var(--admin-primary, #2268f5);
  animation: imodSpin .8s linear infinite;
}
@keyframes imodSpin { to{transform:rotate(360deg)} }
.imod-loading-state {
  flex: 1; display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 12px; padding: 48px;
}
.imod-loading-state span { font-size: 13px; color: var(--admin-text-secondary, #64748b); }

/* Mobile */
@media (max-width: 767px) {
  .imod { padding: 16px; }
  .imod-drawer { width: 100%; max-width: 100%; }
}
`;

let _injected = false;
const injectCSS = () => {
  if (_injected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = CSS;
  document.head.appendChild(el);
  _injected = true;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtAgo = (s: string) => {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (d < 60) return 'Just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtFull = (s: string) =>
  new Date(s).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ─── Badge atom ───────────────────────────────────────────────────────────────

const Badge = memo(({ cfg }: { cfg: { label: string; dot: string; text: string; bg: string; border: string } }) => (
  <span className="imod-badge" style={{ color: cfg.text, background: cfg.bg, borderColor: cfg.border }}>
    <span className="imod-badge-dot" style={{ background: cfg.dot }} />
    {cfg.label}
  </span>
));
Badge.displayName = 'Badge';

// ─── Skeleton rows ────────────────────────────────────────────────────────────

const SkelRow = memo(() => (
  <tr className="imod-skel-row">
    {[4, 9, 26, 15, 17, 10, 8, 8].map((w, i) => (
      <td key={i} className="imod-td">
        <div className="imod-skel" style={{ height: 13, width: `${w * 2.6}px` }} />
      </td>
    ))}
  </tr>
));
SkelRow.displayName = 'SkelRow';

// ─── Drawer content ───────────────────────────────────────────────────────────

const DrawerContent = memo(({ interaction, onClose, onUpdate }: {
  interaction: InteractionDetail;
  onClose: () => void;
  onUpdate: () => void;
}) => {
  const { user }           = useAuth();
  const [dtab, setDtab]   = useState<DrawerTab>('detail');
  const [reply, setReply] = useState('');
  const [saving, setSave] = useState(false);
  const [ok, setOk]       = useState('');
  const [err, setErr]     = useState('');

  const act = async (fn: () => Promise<any>, msg: string) => {
    setOk(''); setErr('');
    try { await fn(); setOk(msg); onUpdate(); }
    catch (e: any) { setErr(e?.response?.data?.error || `Failed: ${msg}`); }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setSave(true);
    await act(() => interactionService.respond(interaction.id, reply), 'Response submitted.');
    setReply(''); setSave(false);
  };

  const tCfg = TYPE[interaction.type]   ?? TYPE.COMMENT;
  const sCfg = STATUS[interaction.status] ?? STATUS.CLOSED;
  const dow  = new Date(interaction.created_at)
    .toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  return (
    <>
      {/* Header */}
      <div className="imod-drawer-header">
        {/* Type strip */}
        <div className="imod-drawer-type-strip">
          <div className="imod-drawer-type-icon" style={{ background: tCfg.bg }}>
            <Icon name={tCfg.icon} size={18} style={{ color: tCfg.dot }} />
          </div>
          <span className="imod-drawer-type-lbl">{tCfg.label}</span>
        </div>

        {/* Info */}
        <div className="imod-drawer-info">
          <div className="imod-drawer-meta">
            <span className="imod-drawer-weekday">{dow}</span>
            <Badge cfg={sCfg} />
            {interaction.is_hidden && (
              <span className="imod-hidden-tag"><Icon name="visibility_off" size={8} />Hidden</span>
            )}
          </div>
          <div className="imod-drawer-name">
            {interaction.user.first_name} {interaction.user.last_name}
          </div>
          <div className="imod-drawer-sub">
            {interaction.user.email} · {fmtAgo(interaction.created_at)}
          </div>
        </div>

        {/* Close */}
        <div className="imod-drawer-close">
          <button onClick={onClose}><Icon name="close" size={13} /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="imod-drawer-tabs">
        <button className={`imod-dtab ${dtab === 'detail' ? 'on' : ''}`} onClick={() => setDtab('detail')}>
          <Icon name="info" size={12} />Details
        </button>
        <button className={`imod-dtab ${dtab === 'respond' ? 'on' : ''}`} onClick={() => setDtab('respond')}>
          <Icon name="reply" size={12} />Respond
        </button>
      </div>

      {/* Body */}
      <div className="imod-drawer-body">
        {ok  && <div className="imod-alert-ok"><Icon name="check_circle" size={14} />{ok}</div>}
        {err && <div className="imod-alert-err"><Icon name="error_outline" size={14} />{err}</div>}

        {dtab === 'detail' && (
          <>
            {/* Post */}
            <div className="imod-section-label"><Icon name="article" size={11} />Related Post</div>
            <table className="imod-info-table">
              <tbody>
                <tr><td className="k">Title</td><td className="v" style={{ fontWeight: 600 }}>{interaction.post.title}</td></tr>
                <tr><td className="k">Author</td><td className="v">{interaction.post.author_name}</td></tr>
              </tbody>
            </table>

            {/* Message */}
            <div className="imod-section-label" style={{ marginTop: 18 }}><Icon name="chat" size={11} />Message</div>
            <div className="imod-content-box">{interaction.content}</div>

            {/* Flag */}
            {interaction.is_flagged && interaction.flag_reason && (
              <>
                <div className="imod-section-label" style={{ marginTop: 18 }}><Icon name="flag" size={11} />Flag Details</div>
                <div className="imod-flag-box">
                  <div className="imod-flag-lbl">Reason</div>
                  <div className="imod-flag-txt">{interaction.flag_reason}</div>
                  {interaction.flagged_by && (
                    <div className="imod-flag-by">
                      Flagged by {interaction.flagged_by.email}
                      {interaction.flagged_at ? ` · ${fmtAgo(interaction.flagged_at)}` : ''}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Replies */}
            {interaction.replies && interaction.replies.length > 0 && (
              <>
                <div className="imod-section-label" style={{ marginTop: 18 }}>
                  <Icon name="forum" size={11} />Responses ({interaction.replies.length})
                </div>
                {interaction.replies.map(r => (
                  <div key={r.id} className="imod-reply-card">
                    <div className="imod-reply-header">
                      <span className="imod-reply-name">{r.user.first_name} {r.user.last_name}</span>
                      <span className="imod-reply-date">{fmtAgo(r.created_at)}</span>
                    </div>
                    <div className="imod-reply-body">{r.content}</div>
                  </div>
                ))}
              </>
            )}

            {/* Meta */}
            <div className="imod-section-label" style={{ marginTop: 18 }}><Icon name="schedule" size={11} />Activity</div>
            <table className="imod-info-table">
              <tbody>
                <tr><td className="k">Submitted</td><td className="v">{fmtFull(interaction.created_at)}</td></tr>
                {interaction.responded_by && (
                  <tr>
                    <td className="k">Responded</td>
                    <td className="v">
                      {interaction.responded_by.email}
                      {interaction.responded_at ? ` · ${fmtAgo(interaction.responded_at)}` : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {dtab === 'respond' && (
          interaction.can_respond && interaction.status === 'OPEN' ? (
            <div className="imod-field">
              <label className="imod-field-label">Write a Response</label>
              <textarea
                className="imod-textarea" rows={8}
                value={reply} onChange={e => setReply(e.target.value)}
                placeholder="Type your response here…"
                disabled={saving}
              />
              <div style={{ fontSize: 12, color: 'var(--admin-text-tertiary,#94a3b8)', marginTop: 5 }}>
                This will mark the interaction as Answered.
              </div>
            </div>
          ) : (
            <div className="imod-notice">
              {interaction.status !== 'OPEN'
                ? `This interaction is ${interaction.status_display?.toLowerCase() ?? 'closed'} — no further responses can be added.`
                : 'You do not have permission to respond to this interaction.'}
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <div className="imod-drawer-footer">
        {dtab === 'respond' && interaction.can_respond && interaction.status === 'OPEN' && (
          <button className="imod-btn imod-btn-primary imod-btn-full"
            onClick={sendReply} disabled={saving || !reply.trim()}>
            <Icon name={saving ? 'hourglass_empty' : 'send'} size={14} />
            {saving ? 'Sending…' : 'Submit Response'}
          </button>
        )}

        {user?.role === UserRole.ADMIN && (
          <>
            {interaction.is_flagged && interaction.status === 'PENDING' && (
              <button className="imod-btn imod-btn-primary"
                onClick={() => act(() => interactionService.markReviewed(interaction.id), 'Marked as reviewed.')}>
                <Icon name="check_circle" size={14} />Mark Reviewed
              </button>
            )}
            <button className="imod-btn imod-btn-ghost"
              onClick={() => act(
                () => interaction.is_hidden
                  ? interactionService.unhide(interaction.id)
                  : interactionService.hide(interaction.id),
                interaction.is_hidden ? 'Made visible.' : 'Hidden from public.'
              )}>
              <Icon name={interaction.is_hidden ? 'visibility' : 'visibility_off'} size={14} />
              {interaction.is_hidden ? 'Unhide' : 'Hide'}
            </button>
          </>
        )}

        {interaction.can_respond && interaction.status === 'OPEN' && (
          <button className="imod-btn imod-btn-dark"
            onClick={() => act(() => interactionService.close(interaction.id), 'Interaction closed.')}>
            <Icon name="lock" size={14} />Close
          </button>
        )}

        <button className="imod-btn imod-btn-danger"
          onClick={() => act(() => interactionService.delete(interaction.id), 'Deleted.').then(onClose)}>
          <Icon name="delete_forever" size={14} />Delete
        </button>
      </div>
    </>
  );
});
DrawerContent.displayName = 'DrawerContent';

// ─── Main component ───────────────────────────────────────────────────────────

const InteractionModeration: React.FC = () => {
  injectCSS();

  const [rows,          setRows]          = useState<Interaction[]>([]);
  const [stats,         setStats]         = useState<InteractionStats | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState<Tab>('questions');
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('');
  const [search,        setSearch]        = useState('');
  const [sortKey,       setSortKey]       = useState<SortKey>('created_at');
  const [sortDir,       setSortDir]       = useState<SortDir>('desc');
  // Drawer
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [drawerDetail,  setDrawerDetail]  = useState<InteractionDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [activeRow,     setActiveRow]     = useState<string | null>(null);

  // Load list
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, listData] = await Promise.all([
        interactionService.getStats(),
        interactionService.getAll({
          ...(activeTab === 'questions' ? { is_question: true } : activeTab === 'flagged' ? { is_flagged: true } : { type: 'COMMENT' }),
          ...(statusFilter ? { status: statusFilter } : {}),
        }),
      ]);
      setStats(statsData);
      setRows(listData.results || []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [activeTab, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Open drawer
  const openDrawer = useCallback(async (item: Interaction) => {
    if (activeRow === item.id && drawerOpen) {
      setDrawerOpen(false); setActiveRow(null); return;
    }
    setActiveRow(item.id);
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerDetail(null);
    try { setDrawerDetail(await interactionService.getById(item.id)); }
    catch { setDrawerDetail(null); }
    finally { setDrawerLoading(false); }
  }, [activeRow, drawerOpen]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false); setActiveRow(null);
  }, []);

  const handleUpdate = useCallback(() => {
    loadData();
    if (activeRow) interactionService.getById(activeRow).then(setDrawerDetail).catch(() => {});
  }, [loadData, activeRow]);

  // Sort
  const handleSort = (k: SortKey) => {
    setSortDir(d => sortKey === k ? (d === 'asc' ? 'desc' : 'asc') : 'desc');
    setSortKey(k);
  };

  // Processed rows
  const processed = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = q
      ? rows.filter(i =>
          i.content?.toLowerCase().includes(q) ||
          `${i.user.first_name} ${i.user.last_name}`.toLowerCase().includes(q) ||
          i.user.email?.toLowerCase().includes(q) ||
          i.post?.title?.toLowerCase().includes(q))
      : rows;
    return [...list].sort((a, b) => {
      const va = sortKey === 'created_at' ? a.created_at
               : sortKey === 'user'       ? a.user.first_name
               : sortKey === 'type'       ? a.type : a.status;
      const vb = sortKey === 'created_at' ? b.created_at
               : sortKey === 'user'       ? b.user.first_name
               : sortKey === 'type'       ? b.type : b.status;
      const c = String(va ?? '').localeCompare(String(vb ?? ''), undefined, { numeric: true });
      return sortDir === 'asc' ? c : -c;
    });
  }, [rows, search, sortKey, sortDir]);

  const tabStats = useMemo(() => ({
    questions: (stats?.unanswered_questions ?? 0) + (stats?.answered_questions ?? 0),
    comments:  stats?.total_comments ?? 0,
    flagged:   (stats?.flagged_pending ?? 0) + (stats?.flagged_reviewed ?? 0),
  }), [stats]);

  const SortIcon = ({ k }: { k: SortKey }) => (
    <Icon
      className="imod-sort-icon"
      name={sortKey === k ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
      size={11}
      ariaHidden
    />
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="imod">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="imod-page-header">
        <div>
          <h1 className="imod-page-title">Interaction Moderation</h1>
          <div className="imod-page-crumb">
            <span>Admin</span>
            <Icon name="chevron_right" size={14} />
            Community
            <Icon name="chevron_right" size={14} />
            Moderation
          </div>
        </div>
        <div className="imod-header-btns">
          <button className="imod-btn imod-btn-ghost" onClick={loadData}>
            <Icon name="refresh" size={15} />Refresh
          </button>
          <button className="imod-btn imod-btn-ghost">
            <Icon name="download" size={15} />Export
          </button>
          <button className="imod-btn imod-btn-primary">
            <Icon name="add" size={15} />New Entry
          </button>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="imod-stats">
        {[
          { tab: 'questions' as Tab, icon: 'help_outline',         label: 'Unanswered',  val: stats?.unanswered_questions ?? 0, sub: 'questions',       ic: '#2563eb', ib: '#dbeafe' },
          { tab: 'questions' as Tab, icon: 'check_circle_outline', label: 'Answered',    val: stats?.answered_questions   ?? 0, sub: 'resolved',        ic: '#10b981', ib: '#d1fae5' },
          { tab: 'flagged'   as Tab, icon: 'flag',                 label: 'Flagged',     val: stats?.flagged_pending      ?? 0, sub: 'need review',     ic: '#ef4444', ib: '#fee2e2' },
          { tab: 'comments'  as Tab, icon: 'chat_bubble_outline',  label: 'Comments',    val: stats?.total_comments       ?? 0, sub: 'total',           ic: '#6b7280', ib: '#f3f4f6' },
        ].map((s, i) => (
          <div key={i}
            className={`imod-stat-card ${activeTab === s.tab ? 'active' : ''}`}
            onClick={() => setActiveTab(s.tab)}>
            <div className="imod-stat-icon" style={{ background: s.ib }}>
              <Icon name={s.icon} size={20} style={{ color: s.ic }} />
            </div>
            <div className="imod-stat-body">
              <div className="imod-stat-val">{s.val}</div>
              <div className="imod-stat-label">{s.label}</div>
              <div className="imod-stat-sub">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main card: tabs + filter + table ────────────────────────────── */}
      <div className="imod-card">

        {/* Tab bar */}
        <div className="imod-tabbar">
          {([
            { k: 'questions' as Tab, label: 'Questions', count: tabStats.questions },
            { k: 'comments'  as Tab, label: 'Comments',  count: tabStats.comments  },
            { k: 'flagged'   as Tab, label: 'Flagged',   count: tabStats.flagged   },
          ]).map(t => (
            <button key={t.k}
              className={`imod-tab ${activeTab === t.k ? 'active' : ''}`}
              onClick={() => setActiveTab(t.k)}>
              {t.label}
              <span className="imod-tab-pill">{t.count}</span>
            </button>
          ))}
          <span className="imod-tabbar-sep" />
        </div>

        {/* Filter bar */}
        <div className="imod-filterbar">
          <div className="imod-search-wrap">
            <Icon className="imod-search-icon" name="search" size={16} ariaHidden />
            <input
              className="imod-search"
              placeholder="Search by content, user, or post…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="imod-select" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ANSWERED">Answered</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="CLOSED">Closed</option>
          </select>
          {search && (
            <button className="imod-btn imod-btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setSearch('')}>
              <Icon name="close" size={13} />Clear
            </button>
          )}
          <span className="imod-result-count">{processed.length} result{processed.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="imod-table-wrap">
          <table className="imod-table">
            <thead className="imod-thead">
              <tr>
                <th style={{ width: '4%', paddingLeft: 20 }}>#</th>
                <th className={sortKey === 'type' ? 'sorted' : ''} style={{ width: '9%' }}
                  onClick={() => handleSort('type')}>
                  Type <SortIcon k="type" />
                </th>
                <th style={{ width: '26%' }}>Content</th>
                <th className={sortKey === 'user' ? 'sorted' : ''} style={{ width: '15%' }}
                  onClick={() => handleSort('user')}>
                  User <SortIcon k="user" />
                </th>
                <th style={{ width: '17%' }}>Post</th>
                <th className={sortKey === 'status' ? 'sorted' : ''} style={{ width: '10%' }}
                  onClick={() => handleSort('status')}>
                  Status <SortIcon k="status" />
                </th>
                <th className={sortKey === 'created_at' ? 'sorted' : ''} style={{ width: '9%' }}
                  onClick={() => handleSort('created_at')}>
                  Date <SortIcon k="created_at" />
                </th>
                <th style={{ width: '10%', textAlign: 'right', paddingRight: 20 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkelRow key={i} />)
                : processed.length === 0
                  ? (
                    <tr><td colSpan={8}>
                      <div className="imod-empty">
                        <div className="imod-empty-icon"><Icon name="forum" size={24} /></div>
                        <h3>No interactions found</h3>
                        <p>Try adjusting your filters or clearing the search.</p>
                      </div>
                    </td></tr>
                  )
                  : processed.map((item, idx) => {
                    const tCfg = TYPE[item.type]    ?? TYPE.COMMENT;
                    const sCfg = STATUS[item.status] ?? STATUS.CLOSED;
                    const isActive = activeRow === item.id;
                    return (
                      <tr key={item.id}
                        className={`imod-tr ${isActive ? 'active-row' : ''}`}
                        onClick={() => openDrawer(item)}>
                        <td className="imod-td" style={{ paddingLeft: 20 }}>
                          <span className="imod-row-no">{String(idx + 1).padStart(2, '0')}</span>
                        </td>
                        <td className="imod-td">
                          <Badge cfg={tCfg} />
                        </td>
                        <td className="imod-td">
                          <div className="imod-content-preview">{item.content}</div>
                          {item.is_hidden && (
                            <span className="imod-hidden-tag">
                              <Icon name="visibility_off" size={8} />Hidden
                            </span>
                          )}
                        </td>
                        <td className="imod-td">
                          <div className="imod-user-name">{item.user.first_name} {item.user.last_name}</div>
                          <div className="imod-user-email">{item.user.email}</div>
                        </td>
                        <td className="imod-td">
                          <div className="imod-post-title">{item.post?.title}</div>
                          <div className="imod-post-auth">by {item.post?.author_name}</div>
                        </td>
                        <td className="imod-td"><Badge cfg={sCfg} /></td>
                        <td className="imod-td"><span className="imod-ago">{fmtAgo(item.created_at)}</span></td>
                        <td className="imod-td" style={{ textAlign: 'right', paddingRight: 20 }}>
                          <button
                            className={`imod-manage ${isActive ? 'open' : ''}`}
                            onClick={e => { e.stopPropagation(); openDrawer(item); }}>
                            {isActive ? 'Viewing' : 'Manage →'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Slide-over drawer ───────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="imod-backdrop" onClick={closeDrawer} />
          <div className="imod-drawer">
            {drawerLoading ? (
              <div className="imod-loading-state">
                <div className="imod-spinner" />
                <span>Loading interaction…</span>
              </div>
            ) : drawerDetail ? (
              <DrawerContent
                interaction={drawerDetail}
                onClose={closeDrawer}
                onUpdate={handleUpdate}
              />
            ) : (
              <div className="imod-loading-state">
                <Icon name="error_outline" size={28} style={{ color: '#dc2626' }} />
                <span>Failed to load.</span>
                <button className="imod-btn imod-btn-ghost" onClick={closeDrawer}>Close</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default InteractionModeration;
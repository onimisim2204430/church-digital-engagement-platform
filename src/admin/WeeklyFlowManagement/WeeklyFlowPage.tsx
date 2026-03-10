/**
 * WeeklyFlowPage — v4
 *
 * TRUE two-column layout:
 *   ROOT = flex row, fills viewport, overflow hidden
 *   LEFT  = flex-1  → the ENTIRE left side: header + nav + calendar, ALL shrink together
 *   RIGHT = panel   → slides in from right, pushes entire left column
 *
 * No overlay. No modal. The whole left side compresses as one block.
 * Mobile (< 768px): panel slides up as bottom sheet, left stays full width.
 */

import React, {
  useState, useEffect, useCallback, useMemo, useRef, memo,
} from 'react';
import Icon from '../../components/common/Icon';
import { dailyWordService } from '../../services/dailyWord.service';
import { DailyWord } from '../../types/dailyWord.types';

// ─── Types ────────────────────────────────────────────────────────────────────

type WordStatus = 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
type DetailTab  = 'read' | 'write';

interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  word: DailyWord | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS   = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];

const PANEL_W = 420; // px — right panel width on desktop

const STATUS: Record<WordStatus, { label: string; icon: string; color: string; bg: string; border: string; glow: string }> = {
  PUBLISHED: { label:'Published', icon:'auto_stories', color:'#059669', bg:'rgba(16,185,129,0.1)', border:'rgba(16,185,129,0.35)', glow:'0 0 16px rgba(16,185,129,0.18)' },
  SCHEDULED: { label:'Scheduled', icon:'schedule',     color:'#3f88aa', bg:'rgba(100,170,210,0.12)', border:'rgba(100,170,210,0.35)', glow:'0 0 12px rgba(100,170,210,0.18)' },
  DRAFT:     { label:'Draft',     icon:'edit_note',    color:'#8c7c72', bg:'rgba(160,148,140,0.10)', border:'rgba(160,148,140,0.26)', glow:'none' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pad   = (n: number) => String(n).padStart(2, '0');
const dstr  = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const today = () => { const n = new Date(); return dstr(n.getFullYear(), n.getMonth()+1, n.getDate()); };
const fmt   = (s: string | null) => s ? new Date(s).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' }) : '—';

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&display=swap');

/* ══ ROOT ══════════════════════════════════════════════════════════════════ */
.wf {
  --ink:   #0f172a; --ink2: #1e293b; --ink3: #334155;
  --ink4:  #94a3b8; --ink5: #e2e8f0;
  --cream: #f8fafc; --cr2:  #e2e8f0; --paper: #ffffff;
  --gold:  #10b981; --gld2: #059669;
  --bar-bg: #ffffff; --bar-fg: #0f172a;
  --bar-muted: #64748b; --bar-border: #e2e8f0;
  --bar-btn: rgba(100,116,139,.08);
  --nav-bg: #f8fafc;
  --r: 9px;
  font-family: 'Crimson Pro', Georgia, serif;
  color: var(--ink);
  /* ROOT IS THE FLEX ROW */
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background: var(--cream);
}
.wf *, .wf *::before, .wf *::after { box-sizing: border-box; }

/* ══ LEFT COLUMN — the entire left side ══════════════════════════════════ */
.wf-left {
  flex: 1;
  min-width: 0;          /* allows shrinking below natural size */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: flex 0.34s cubic-bezier(.4,0,.2,1);
}

/* ── Top bar (inside left) ── */
.wf-bar {
  background: var(--bar-bg);
  color: var(--bar-fg);
  border-bottom: 1px solid var(--bar-border);
  padding: 0 20px;
  height: 54px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 10px;
  position: relative;
  z-index: 1;
}
.wf-bar::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:2px;
  background: linear-gradient(90deg,transparent,var(--gold) 35%,var(--gold) 65%,transparent);
  opacity:.55;
}
.wf-brand {
  font-family: 'Playfair Display', serif;
  font-size: 16px; font-weight: 900; letter-spacing:.05em;
  color: var(--bar-fg); flex:1; display:flex; align-items:center; gap:8px;
}
.wf-brand em { font-style:italic; color:var(--gold); font-weight:400; }
.wf-brand-div { width:1px; height:16px; background:var(--bar-border); }
.wf-brand-sub {
  font-family:'Crimson Pro',serif; font-size:10px; font-weight:400;
  letter-spacing:.12em; text-transform:uppercase; color:var(--bar-muted);
}
.wf-btn {
  display:inline-flex; align-items:center; gap:5px;
  padding:6px 12px; border-radius:6px; font-family:'Crimson Pro',serif;
  font-size:12px; font-weight:600; cursor:pointer; border:none;
  transition:all .14s; white-space:nowrap; flex-shrink:0;
}
.wf-btn-ghost { background:transparent; color:var(--bar-muted); border:1px solid var(--bar-border); }
.wf-btn-ghost:hover { background:var(--bar-btn); color:var(--bar-fg); }
.wf-btn-gold  { background:var(--gold); color:#fff; font-weight:800; }
.wf-btn-gold:hover { background:var(--gld2); box-shadow:0 4px 16px rgba(16,185,129,.4); }

/* ── Month nav strip (inside left) ── */
.wf-nav {
  background: var(--nav-bg); padding:0 20px; height:44px;
  display:flex; align-items:center; flex-shrink:0; gap:8px;
  border-bottom: 1px solid var(--bar-border);
}
.wf-nav-arrow {
  width:28px; height:28px; border-radius:50%; display:flex;
  align-items:center; justify-content:center; background:transparent;
  border:1px solid var(--bar-border); color:var(--bar-muted);
  cursor:pointer; transition:all .14s;
}
.wf-nav-arrow:hover { background:var(--bar-btn); color:var(--bar-fg); }
.wf-nav-month {
  font-family:'Playfair Display',serif; font-size:15px; font-weight:700;
  color:var(--bar-fg); letter-spacing:.03em; flex:1; text-align:center;
}
.wf-legend { display:flex; align-items:center; gap:12px; }
.wf-legend-item {
  display:flex; align-items:center; gap:4px;
  font-size:10px; font-weight:600; letter-spacing:.08em; text-transform:uppercase;
}
.wf-legend-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

/* ── Calendar scroll area (inside left) ── */
.wf-cal {
  flex:1; overflow-y:auto; overflow-x:hidden;
  padding:12px 14px 24px;
  scrollbar-width:thin; scrollbar-color:var(--ink5) transparent;
}

/* DOW row */
.wf-dow { display:grid; grid-template-columns:repeat(7,1fr); gap:5px; margin-bottom:5px; }
.wf-dow-lbl {
  text-align:center; font-family:'Playfair Display',serif;
  font-size:9.5px; font-weight:700; letter-spacing:.18em;
  text-transform:uppercase; color:var(--ink4); padding:3px 0;
}

/* Calendar grid */
.wf-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:5px; }

/* Cell */
.wf-cell {
  position:relative; background:var(--paper); border:1px solid var(--cr2);
  border-radius:var(--r); padding:8px 7px 7px;
  min-height:90px; cursor:pointer; display:flex; flex-direction:column; gap:3px;
  transition:transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .18s, border-color .14s, background .14s;
  animation:cIn .36s ease both;
}
@keyframes cIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
.wf-cell:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(26,22,20,.12); border-color:var(--ink5); z-index:2; }
.wf-cell.dim   { background:transparent; border-color:transparent; opacity:.28; cursor:default; }
.wf-cell.dim:hover { transform:none; box-shadow:none; }
.wf-cell.today { border-color:var(--gold)!important; box-shadow:inset 0 0 0 1px var(--gold),0 0 14px rgba(16,185,129,.16)!important; }
.wf-cell.sel   { background:var(--ink); border-color:var(--ink); box-shadow:0 12px 32px rgba(26,22,20,.3); transform:scale(1.02) translateY(-2px); z-index:5; }
.wf-cell.sel .wf-cday   { color:var(--gold); }
.wf-cell.sel .wf-ctitle { color:var(--paper); }
.wf-cell.sel .wf-cref   { color:var(--ink4); }
.wf-cell.sel .wf-cadd   { border-color:rgba(255,255,255,.12); color:rgba(255,255,255,.25); }

.wf-today-dot {
  position:absolute; top:7px; right:7px; width:5px; height:5px;
  border-radius:50%; background:var(--gold);
  animation:tdot 2s ease-in-out infinite;
}
@keyframes tdot { 0%,100%{box-shadow:0 0 4px rgba(16,185,129,.7)} 50%{box-shadow:0 0 12px rgba(16,185,129,1)} }

.wf-cday {
  font-family:'Playfair Display',serif; font-size:18px; font-weight:900;
  line-height:1; color:var(--ink3); letter-spacing:-.02em;
}
.wf-cell.today .wf-cday { color:var(--gold); }

.wf-ctitle {
  font-size:10px; font-weight:600; color:var(--ink2); line-height:1.3;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
}
.wf-cref {
  font-size:9px; font-style:italic; color:var(--ink4);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.wf-chip {
  display:inline-flex; align-items:center; gap:2px; padding:2px 5px;
  border-radius:20px; font-size:8px; font-weight:700;
  letter-spacing:.1em; text-transform:uppercase; border:1px solid; width:fit-content;
}
.wf-cadd {
  flex:1; display:flex; flex-direction:column; align-items:center;
  justify-content:center; border:1.5px dashed var(--cr2); border-radius:6px;
  color:var(--ink5); font-size:9px; font-style:italic; gap:3px;
  transition:all .14s; padding:4px;
}
.wf-cell:hover .wf-cadd { border-color:var(--ink4); color:var(--ink4); background:rgba(148,163,184,.05); }

/* Skeleton */
.wf-skel {
  border-radius:var(--r); min-height:90px;
  background-image:linear-gradient(90deg,var(--paper) 25%,var(--cr2) 50%,var(--paper) 75%);
  background-size:200% 100%; animation:shimmer 1.5s infinite;
}
@keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }

/* ══ RIGHT PANEL ════════════════════════════════════════════════════════════ */
.wf-right {
  flex-shrink: 0;
  width: 0;
  min-width: 0;
  overflow: hidden;
  background: var(--paper);
  border-left: 0px solid var(--cr2);
  display: flex;
  flex-direction: column;
  transition:
    width          0.34s cubic-bezier(.4,0,.2,1),
    min-width      0.34s cubic-bezier(.4,0,.2,1),
    border-width   0.34s cubic-bezier(.4,0,.2,1);
  position: relative;
}
.wf-right.open {
  width: ${PANEL_W}px;
  min-width: ${PANEL_W}px;
  border-left-width: 1px;
}
/* Gold accent line when open */
.wf-right::before {
  content:''; position:absolute; top:0; left:0; bottom:0; width:2px;
  background:linear-gradient(180deg,transparent,var(--gold) 25%,var(--gold) 75%,transparent);
  opacity:0; transition:opacity .4s ease .15s; pointer-events:none;
}
.wf-right.open::before { opacity:.3; }

/* Inner keeps full width so content never squishes during slide */
.wf-right-inner {
  width: ${PANEL_W}px;
  min-width: ${PANEL_W}px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Panel header ── */
.wf-ph {
  background: var(--bar-bg);
  flex-shrink: 0;
  position: relative;
}
.wf-ph::after {
  content:''; position:absolute; bottom:0; left:0; right:0; height:1px;
  background: var(--bar-border);
}

/* Top row: date box | info | close — all on one baseline */
.wf-ph-top {
  display: grid;
  grid-template-columns: 56px 1fr 32px;
  align-items: start;
  gap: 14px;
  padding: 14px 16px 12px;
}

.wf-ph-datebox {
  background: var(--nav-bg);
  border: 1px solid var(--bar-border);
  border-radius: 8px;
  padding: 5px 0;
  text-align: center;
  width: 56px;
}
.wf-ph-mon {
  font-family: 'Crimson Pro', serif;
  font-size: 9px; font-weight: 700;
  letter-spacing: .2em; text-transform: uppercase;
  color: var(--gold); line-height: 1;
  background: var(--gold);
  color: var(--ink);
  border-radius: 5px 5px 0 0;
  padding: 3px 0 2px;
  margin: -5px 0 4px;
  display: block;
}
.wf-ph-num {
  font-family: 'Playfair Display', serif;
  font-size: 28px; font-weight: 900;
  color: var(--bar-fg); line-height: 1;
  display: block; padding-bottom: 3px;
}

.wf-ph-info {
  min-width: 0;
  padding-top: 1px;
}
.wf-ph-dow {
  font-family: 'Crimson Pro', serif;
  font-size: 10px; font-weight: 600;
  letter-spacing: .18em; text-transform: uppercase;
  color: var(--ink4); line-height: 1; margin-bottom: 5px;
}
.wf-ph-title {
  font-family: 'Playfair Display', serif;
  font-size: 17px; font-weight: 700;
  color: var(--bar-fg); line-height: 1.25;
  margin-bottom: 4px;
}
.wf-ph-ref {
  font-family: 'Crimson Pro', serif;
  font-size: 12px; font-style: italic;
  color: var(--gold); line-height: 1;
}
.wf-ph-empty {
  font-family: 'Playfair Display', serif;
  font-size: 14px; font-style: italic; color: var(--ink4);
}

.wf-close {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--bar-btn);
  border: 1px solid var(--bar-border);
  color: var(--bar-muted);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .14s; flex-shrink: 0;
  margin-top: 2px;
}
.wf-close:hover { background: rgba(100,116,139,.18); color: var(--bar-fg); }

/* ── Tab bar ── */
.wf-pnav {
  display: flex;
  background: var(--bar-bg);
  padding: 0 18px;
  flex-shrink: 0;
  border-bottom: 2px solid var(--bar-border);
}
.wf-ptab {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 11px 8px 9px;
  font-family: 'Crimson Pro', serif;
  font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
  color: var(--bar-muted); background: none; border: none;
  border-bottom: 2px solid transparent; margin-bottom: -2px;
  cursor: pointer; transition: all .15s;
}
.wf-ptab:hover { color: var(--bar-fg); }
.wf-ptab.on { color: var(--bar-fg); border-bottom-color: var(--gold); }

/* ── Panel body ── */
.wf-pbody {
  flex:1; overflow-y:auto; overflow-x:hidden;
  padding:20px 20px 12px;
  scrollbar-width:thin; scrollbar-color:var(--ink4) transparent;
  background: var(--paper);
}

/* Read content */
.wf-read-body {
  font-family:'Crimson Pro',serif; font-size:16px; line-height:1.8;
  color:var(--ink2); white-space:pre-line;
}
.wf-prayer {
  margin-top:20px; padding:16px 18px;
  background:linear-gradient(135deg,rgba(212,168,83,.09),rgba(212,168,83,.03));
  border-left:3px solid var(--gold); border-radius:0 8px 8px 0;
}
.wf-prayer-lbl {
  font-family:'Playfair Display',serif; font-size:9px; font-weight:700;
  letter-spacing:.18em; text-transform:uppercase; color:var(--gld2); margin-bottom:8px;
}
.wf-prayer-txt {
  font-family:'Crimson Pro',serif; font-size:14.5px; font-style:italic;
  line-height:1.72; color:var(--ink3);
}
.wf-meta {
  display:flex; flex-wrap:wrap; gap:14px; margin-top:20px;
  padding-top:16px; border-top:1px solid var(--cr2);
}
.wf-meta-i { display:flex; align-items:center; gap:5px; }
.wf-meta-k { font-size:9px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--ink5); }
.wf-meta-v { font-size:11px; color:var(--ink3); }

/* No entry */
.wf-noentry {
  display:flex; flex-direction:column; align-items:center;
  justify-content:center; padding:40px 0 20px; text-align:center;
}
.wf-noentry-ring {
  width:60px; height:60px; border-radius:50%;
  border:2px dashed var(--cr2); display:flex; align-items:center;
  justify-content:center; color:var(--ink5); margin-bottom:14px;
}
.wf-noentry-h { font-family:'Playfair Display',serif; font-size:17px; font-weight:700; color:var(--ink3); margin-bottom:5px; }
.wf-noentry-p { font-size:14px; color:var(--ink4); margin-bottom:20px; }
.wf-noentry-btn {
  display:inline-flex; align-items:center; gap:6px;
  padding:10px 20px; border-radius:7px; background:var(--gold);
  border:none; color:var(--ink); font-family:'Crimson Pro',serif;
  font-size:13px; font-weight:800; cursor:pointer; transition:all .14s;
}
.wf-noentry-btn:hover { background:var(--gld2); box-shadow:0 4px 16px rgba(16,185,129,.4); }

/* Edit form */
.wf-field { margin-bottom:14px; }
.wf-label {
  display:block; font-size:10px; font-weight:600;
  letter-spacing:.1em; text-transform:uppercase; color:var(--ink4); margin-bottom:5px;
}
.wf-input, .wf-ta {
  width:100%; background:white; border:1.5px solid var(--cr2); border-radius:7px;
  padding:9px 12px; font-family:'Crimson Pro',serif; font-size:14px;
  color:var(--ink); outline:none; resize:none;
  transition:border-color .14s,box-shadow .14s;
}
.wf-input:focus, .wf-ta:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(16,185,129,.13); }
.wf-input::placeholder,.wf-ta::placeholder { color:var(--ink5); font-style:italic; }

/* Alerts */
.wf-ok  { display:flex; align-items:center; gap:7px; padding:9px 13px; border-radius:7px; font-size:12px; font-weight:500; margin-bottom:14px; background:rgba(80,160,110,.1); border:1px solid rgba(80,160,110,.28); color:#2d6b48; }
.wf-err { display:flex; align-items:center; gap:7px; padding:9px 13px; border-radius:7px; font-size:12px; font-weight:500; margin-bottom:14px; background:rgba(190,60,50,.07); border:1px solid rgba(190,60,50,.23); color:#8c2a20; }

/* ── Panel footer actions ── */
.wf-pfoot {
  display:flex; gap:7px; padding:12px 20px 18px;
  border-top:1px solid var(--cr2); flex-shrink:0; background:var(--paper);
}
.wf-pfbtn {
  flex:1; display:flex; align-items:center; justify-content:center; gap:6px;
  padding:10px 10px; border-radius:7px; font-family:'Crimson Pro',serif;
  font-size:12px; font-weight:700; letter-spacing:.04em; cursor:pointer;
  border:none; transition:all .15s;
}
.wf-pfbtn:disabled { opacity:.4; cursor:not-allowed; }
.wf-pfbtn-draft   { background:white; border:1.5px solid var(--cr2); color:var(--ink3); }
.wf-pfbtn-draft:not(:disabled):hover   { border-color:var(--ink3); }
.wf-pfbtn-sched   { background:rgba(100,170,210,.11); border:1.5px solid rgba(100,170,210,.32); color:#3a7ea0; }
.wf-pfbtn-sched:not(:disabled):hover   { background:rgba(100,170,210,.2); }
.wf-pfbtn-pub     { background:var(--gold); border:1.5px solid var(--gold); color:#fff; font-weight:800; }
.wf-pfbtn-pub:not(:disabled):hover     { background:var(--gld2); box-shadow:0 4px 16px rgba(16,185,129,.4); }

/* ══ MOBILE ═════════════════════════════════════════════════════════════════ */
/* On small screens, right panel hides; bottom sheet appears instead */
@media (max-width: 767px) {
  .wf-right { display:none !important; }
  .wf-mob-back {
    position:fixed; inset:0; background:rgba(26,22,20,.55);
    backdrop-filter:blur(4px); z-index:40; transition:opacity .25s ease;
  }
  .wf-mob-sheet {
    position:fixed; bottom:0; left:0; right:0; max-height:88dvh;
    background:var(--paper); border-top-left-radius:20px; border-top-right-radius:20px;
    box-shadow:0 -16px 60px rgba(26,22,20,.42); z-index:50;
    display:flex; flex-direction:column;
    transition:transform .36s cubic-bezier(.32,1,.56,1);
  }
  .wf-mob-sheet.open { transform:translateY(0); }
  .wf-mob-sheet.shut { transform:translateY(105%); }
  .wf-mob-handle {
    width:36px; height:4px; border-radius:2px;
    background:var(--cr2); margin:12px auto 0; flex-shrink:0;
  }
}
@media (min-width: 768px) {
  .wf-mob-back,.wf-mob-sheet { display:none !important; }
}

/* Responsive cell scaling */
@media (max-width:1100px) { .wf-cday { font-size:15px; } .wf-cell { min-height:80px; } }
@media (max-width:900px)  { .wf-cday { font-size:13px; } .wf-ctitle { font-size:9px; } .wf-cref { display:none; } .wf-chip { display:none; } }
@media (max-width:767px)  { .wf-cal { padding:10px 10px 22px; } .wf-legend { display:none; } .wf-brand-div,.wf-brand-sub { display:none; } }

/* ══ DARK MODE ══════════════════════════════════════════════════════════════ */
.dark .wf {
  --cream: #0f172a;
  --cr2:   #334155;
  --paper: #1e293b;
  --ink3:  #cbd5e1;
  --ink4:  #64748b;
  --ink5:  #334155;
  --bar-bg:     #0f172a;
  --bar-fg:     #f1f5f9;
  --bar-muted:  #475569;
  --bar-border: rgba(255,255,255,.1);
  --bar-btn:    rgba(255,255,255,.07);
  --nav-bg:     #1e293b;
}
/* Calendar area */
.dark .wf-cal { scrollbar-color: #334155 transparent; }
/* Cells */
.dark .wf-cell { background: #1e293b; border-color: #334155; }
.dark .wf-cell:hover { box-shadow: 0 8px 22px rgba(0,0,0,.45); border-color: #475569; }
.dark .wf-cell.dim { background: transparent !important; border-color: transparent !important; }
.dark .wf-cell.sel { background: #0f172a !important; border-color: var(--gold) !important; }
.dark .wf-cadd { border-color: #334155; color: #475569; }
.dark .wf-cell:hover .wf-cadd { border-color: #64748b; color: #94a3b8; background: rgba(148,163,184,.06); }
/* Skeleton */
.dark .wf-skel { background-image: linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%); }
/* Right panel body + footer */
.dark .wf-pbody { background: #1e293b; scrollbar-color: #334155 transparent; }
.dark .wf-pfoot { background: #1e293b; border-top-color: #334155; }
.dark .wf-pfbtn-draft { background: #1e293b; border-color: #334155; color: #cbd5e1; }
.dark .wf-pfbtn-draft:not(:disabled):hover { border-color: #64748b; }
/* Read tab */
.dark .wf-read-body { color: #cbd5e1; }
.dark .wf-prayer { background: linear-gradient(135deg,rgba(16,185,129,.08),rgba(16,185,129,.03)); }
.dark .wf-prayer-txt { color: #cbd5e1; }
.dark .wf-meta { border-top-color: #334155; }
.dark .wf-meta-v { color: #cbd5e1; }
.dark .wf-meta-k { color: #475569; }
/* No entry */
.dark .wf-noentry-ring { border-color: #334155; color: #475569; }
.dark .wf-noentry-h { color: #e2e8f0; }
.dark .wf-noentry-p { color: #64748b; }
/* Write form */
.dark .wf-label { color: #64748b; }
.dark .wf-input, .dark .wf-ta { background: #0f172a; border-color: #334155; color: #f1f5f9; }
.dark .wf-input:focus, .dark .wf-ta:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(16,185,129,.18); }
.dark .wf-input::placeholder, .dark .wf-ta::placeholder { color: #475569; }
/* Alerts */
.dark .wf-ok  { background: rgba(5,150,105,.12); border-color: rgba(5,150,105,.35); color: #34d399; }
.dark .wf-err { background: rgba(220,38,38,.1);  border-color: rgba(220,38,38,.3);  color: #f87171; }
/* Mobile sheet */
.dark .wf-mob-back  { background: rgba(0,0,0,.65); }
.dark .wf-mob-sheet { background: #1e293b; }
.dark .wf-mob-handle { background: #334155; }
`;

let _css = false;
const injectCSS = () => {
  if (_css || typeof document === 'undefined') return;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
  _css = true;
};

// ─── Detail panel (shared between desktop panel + mobile sheet) ───────────────

const Detail = memo(({ cell, onClose, onSaved, isMobile }: {
  cell: CalendarDay; onClose: () => void; onSaved: () => void; isMobile?: boolean;
}) => {
  const [tab,    setTab]    = useState<DetailTab>(cell.word ? 'read' : 'write');
  const [title,  setTitle]  = useState(cell.word?.title     || '');
  const [body,   setBody]   = useState(cell.word?.content   || '');
  const [ref,    setRef]    = useState(cell.word?.scripture || '');
  const [prayer, setPrayer] = useState(cell.word?.prayer    || '');
  const [saving, setSaving] = useState(false);
  const [ok,     setOk]     = useState(false);
  const [err,    setErr]    = useState('');

  useEffect(() => {
    setTitle(cell.word?.title     || '');
    setBody(cell.word?.content    || '');
    setRef(cell.word?.scripture   || '');
    setPrayer(cell.word?.prayer   || '');
    setTab(cell.word ? 'read' : 'write');
    setOk(false); setErr('');
  }, [cell.date]);

  const save = async (status: WordStatus) => {
    setSaving(true); setErr(''); setOk(false);
    try {
      const p = { title, content: body, scripture: ref, prayer, scheduled_date: cell.date, status };
      cell.word?.id ? await dailyWordService.update(cell.word.id, p) : await dailyWordService.create(p);
      setOk(true); setTimeout(() => setOk(false), 3000); onSaved();
    } catch (e: any) { setErr(e?.response?.data?.detail || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const dt     = new Date(cell.date + 'T00:00:00');
  const mon    = dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dow    = dt.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const word   = cell.word;
  const status = word?.status as WordStatus | undefined;
  const scfg   = status ? STATUS[status] : null;

  return (
    <>
      {/* Panel header */}
      <div className="wf-ph">
        <div className="wf-ph-top">
          <div className="wf-ph-datebox">
            <div className="wf-ph-mon">{mon}</div>
            <div className="wf-ph-num">{cell.day}</div>
          </div>
          <div className="wf-ph-info">
            <div className="wf-ph-dow">{dow}</div>
            {word
              ? <>
                  <div className="wf-ph-title">{word.title || 'Untitled'}</div>
                  {word.scripture && <div className="wf-ph-ref">{word.scripture}</div>}
                </>
              : <div className="wf-ph-empty">No entry yet</div>
            }
          </div>
          <button className="wf-close" onClick={onClose}><Icon name="close" size={14} /></button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="wf-pnav">
        <button className={`wf-ptab ${tab==='read'?'on':''}`} onClick={() => setTab('read')}>
          <Icon name="auto_stories" size={12} />Read
        </button>
        <button className={`wf-ptab ${tab==='write'?'on':''}`} onClick={() => setTab('write')}>
          <Icon name="edit" size={12} />{word ? 'Edit' : 'Create'}
        </button>
      </div>

      {/* Body */}
      <div className="wf-pbody">
        {ok  && <div className="wf-ok"><Icon name="check_circle" size={13} />Saved successfully.</div>}
        {err && <div className="wf-err"><Icon name="error_outline" size={13} />{err}</div>}

        {tab === 'read' && (
          word ? (
            <>
              {scfg && (
                <span className="wf-chip" style={{ color:scfg.color, borderColor:scfg.border, background:scfg.bg, marginBottom:14, display:'inline-flex' }}>
                  <Icon name={scfg.icon} size={9} />{scfg.label}
                </span>
              )}
              {word.content && <p className="wf-read-body">{word.content}</p>}
              {word.prayer && (
                <div className="wf-prayer">
                  <div className="wf-prayer-lbl">Prayer</div>
                  <p className="wf-prayer-txt">{word.prayer}</p>
                </div>
              )}
              <div className="wf-meta">
                {[
                  { icon:'person',         k:'Author',  v: word.author || '—' },
                  { icon:'calendar_today', k:'Date',    v: fmt(word.scheduled_date) },
                  { icon:'update',         k:'Updated', v: fmt(word.updated_at) },
                ].map(r => (
                  <div key={r.k} className="wf-meta-i">
                    <Icon name={r.icon} size={11} style={{ color:'var(--ink5)' }} />
                    <span className="wf-meta-k">{r.k}</span>
                    <span className="wf-meta-v">{r.v}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="wf-noentry">
              <div className="wf-noentry-ring"><Icon name="book" size={24} /></div>
              <div className="wf-noentry-h">Nothing written yet</div>
              <div className="wf-noentry-p">This day awaits its word.</div>
              <button className="wf-noentry-btn" onClick={() => setTab('write')}>
                <Icon name="edit" size={13} />Begin Writing
              </button>
            </div>
          )
        )}

        {tab === 'write' && (
          <>
            {[
              { lbl:'Title',      val:title,  set:setTitle,  rows:1, ph:"Today's title…"              },
              { lbl:'Scripture',  val:ref,    set:setRef,    rows:1, ph:'e.g. Psalm 46:10'            },
              { lbl:'Daily Word', val:body,   set:setBody,   rows:6, ph:'Write today\'s message…'     },
              { lbl:'Prayer',     val:prayer, set:setPrayer, rows:3, ph:'A closing prayer…'           },
            ].map(f => (
              <div key={f.lbl} className="wf-field">
                <label className="wf-label">{f.lbl}</label>
                {f.rows === 1
                  ? <input  className="wf-input" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} />
                  : <textarea className="wf-ta" value={f.val} onChange={e => f.set(e.target.value)} rows={f.rows} placeholder={f.ph} />
                }
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      {tab === 'write' && (
        <div className="wf-pfoot">
          <button className="wf-pfbtn wf-pfbtn-draft" onClick={() => save('DRAFT')} disabled={saving}>
            <Icon name="save" size={12} />Draft
          </button>
          <button className="wf-pfbtn wf-pfbtn-sched" onClick={() => save('SCHEDULED')} disabled={saving}>
            <Icon name="schedule" size={12} />Schedule
          </button>
          <button className="wf-pfbtn wf-pfbtn-pub" onClick={() => save('PUBLISHED')} disabled={saving}>
            <Icon name={saving ? 'hourglass_empty' : 'publish'} size={12} />
            {saving ? 'Saving…' : 'Publish'}
          </button>
        </div>
      )}
    </>
  );
});
Detail.displayName = 'Detail';

// ─── CalendarCell — Memoized for performance ───────────────────────────────────

const CalendarCell = memo(({ cell, index, isToday, isSelected, onPick }: {
  cell: CalendarDay;
  index: number;
  isToday: boolean;
  isSelected: boolean;
  onPick: (cell: CalendarDay) => void;
}) => {
  const st  = cell.word?.status as WordStatus | undefined;
  const cfg = st ? STATUS[st] : null;

  return (
    <div
      className={['wf-cell',!cell.isCurrentMonth?'dim':'',isToday?'today':'',isSelected?'sel':''].filter(Boolean).join(' ')}
      style={{ animationDelay:`${index*.011}s`, ...(cfg&&!isSelected?{borderColor:cfg.border,boxShadow:cfg.glow}:{}) }}
      onClick={() => onPick(cell)}
    >
      {isToday && <span className="wf-today-dot" />}
      <div className="wf-cday">{cell.day}</div>
      {cell.word ? (
        <>
          <div className="wf-ctitle">{cell.word.title||'Untitled'}</div>
          <div className="wf-cref">{cell.word.scripture}</div>
          {cfg && (
            <span className="wf-chip" style={{ color:cfg.color, borderColor:cfg.border, background:cfg.bg }}>
              <Icon name={cfg.icon} size={8} />{cfg.label}
            </span>
          )}
        </>
      ) : cell.isCurrentMonth ? (
        <div className="wf-cadd"><Icon name="add" size={12} /><span>add entry</span></div>
      ) : null}
    </div>
  );
});
CalendarCell.displayName = 'CalendarCell';

// ─── Main ─────────────────────────────────────────────────────────────────────

const WeeklyFlowPage: React.FC = () => {
  injectCSS();

  const [date,     setDate]     = useState(() => new Date());
  const [cells,    setCells]    = useState<CalendarDay[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState('');
  const [selected, setSelected] = useState<CalendarDay | null>(null);
  const [mobOpen,  setMobOpen]  = useState(false);  // mobile sheet animation
  const selectedDateRef = useRef<string | null>(null);

  useEffect(() => {
    selectedDateRef.current = selected?.date ?? null;
  }, [selected?.date]);

  // ── Load ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    const y = date.getFullYear(), m = date.getMonth() + 1;
    setLoading(true);
    setLoadErr('');
    try {
      const data = await dailyWordService.getCalendarAdmin(m, y);
      const wmap = new Map<string, DailyWord>();
      (data.days || []).forEach((d: any) => {
        if (d.has_post && d.id) {
          const ds = dstr(y, m, d.day);
          wmap.set(ds, {
            id:d.id, title:d.title||'', content:d.content||'',
            scripture:d.scripture||'', prayer:d.prayer||'',
            author:d.author||'Admin', scheduled_date:ds,
            status:d.status||'DRAFT', is_deleted:false,
            created_at:d.created_at||new Date().toISOString(),
            updated_at:d.updated_at||new Date().toISOString(),
          } as DailyWord);
        }
      });

      const fdow = new Date(y,m-1,1).getDay();
      const dim  = new Date(y,m,0).getDate();
      const pl   = new Date(y,m-1,0).getDate();
      const grid: CalendarDay[] = [];

      for (let i = fdow-1; i >= 0; i--) {
        const pm=m===1?12:m-1, py=m===1?y-1:y;
        grid.push({ date:dstr(py,pm,pl-i), day:pl-i, isCurrentMonth:false, word:null });
      }
      for (let d=1; d<=dim; d++) {
        const ds = dstr(y,m,d);
        grid.push({ date:ds, day:d, isCurrentMonth:true, word:wmap.get(ds)??null });
      }
      const rem = 42 - grid.length;
      for (let d=1; d<=rem; d++) {
        const nm=m===12?1:m+1, ny=m===12?y+1:y;
        grid.push({ date:dstr(ny,nm,d), day:d, isCurrentMonth:false, word:null });
      }
      setCells(grid);
      if (selected) {
        const fresh = grid.find(c => c.date === selected.date);
        if (fresh) setSelected(fresh);
      }
    } catch (e: any) {
      setCells([]);
      const msg = e?.response?.data?.detail || e?.response?.statusText || e?.message || 'Failed to load calendar.';
      setLoadErr(`${msg} (${e?.response?.status ?? 'network error'})`);
    }
    finally  { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  // ── Select/close ─────────────────────────────────────────────────────────

  const pick = useCallback((cell: CalendarDay) => {
    if (!cell.isCurrentMonth) return;
    if (selectedDateRef.current === cell.date) {
      // Deselect
      setMobOpen(false);
      setTimeout(() => setSelected(null), 360);
      return;
    }
    setSelected(cell);
    setMobOpen(true);
  }, []);

  const close = useCallback(() => {
    setMobOpen(false);
    // Desktop: immediately clear (panel width transition is visual enough)
    // Mobile: wait for slide-down animation
    setTimeout(() => setSelected(null), 360);
  }, []);

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const c = cells.filter(x => x.isCurrentMonth);
    return {
      pub: c.filter(x => x.word?.status==='PUBLISHED').length,
      sch: c.filter(x => x.word?.status==='SCHEDULED').length,
      drf: c.filter(x => x.word?.status==='DRAFT').length,
    };
  }, [cells]);

  const td        = today();
  const panelOpen = !!selected;
  const mLabel    = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

  return (
    // ════════════════════════════════════════════════════════════════════════
    // ROOT — flex ROW, fills parent, clips overflow
    // LEFT  (wf-left)  = flex:1  → header + nav + calendar, shrinks as one
    // RIGHT (wf-right) = 0→420px → panel slides in, pushes left
    // ════════════════════════════════════════════════════════════════════════
    <div className="wf">

      {/* ════ LEFT COLUMN — entire left side ════════════════════════════ */}
      <div className="wf-left">

        {/* Top bar */}
        <div className="wf-bar">
          <div className="wf-brand">
            Weekly <em>Flow</em>
            <span className="wf-brand-div" />
            <span className="wf-brand-sub">Planner</span>
          </div>
          <button className="wf-btn wf-btn-ghost" onClick={load}>
            <Icon name="refresh" size={12} />Sync
          </button>
          <button className="wf-btn wf-btn-ghost" onClick={() => {
            setDate(new Date());
            const t = cells.find(c => c.date === td && c.isCurrentMonth);
            if (t) pick(t);
          }}>
            <Icon name="today" size={12} />Today
          </button>
          <button className="wf-btn wf-btn-gold" onClick={() => {
            const t = cells.find(c => c.date === td && c.isCurrentMonth)
                   || cells.find(c => c.isCurrentMonth && !c.word);
            if (t) pick(t);
          }}>
            <Icon name="add" size={13} />New Entry
          </button>
        </div>

        {/* Month nav */}
        <div className="wf-nav">
          <div style={{ display:'flex', gap:2 }}>
            <button className="wf-nav-arrow" onClick={() => setDate(d => new Date(d.getFullYear(),d.getMonth()-1,1))}>
              <Icon name="chevron_left" size={15} />
            </button>
            <button className="wf-nav-arrow" onClick={() => setDate(d => new Date(d.getFullYear(),d.getMonth()+1,1))}>
              <Icon name="chevron_right" size={15} />
            </button>
          </div>
          <h2 className="wf-nav-month">{mLabel}</h2>
          <div className="wf-legend">
            {([['PUBLISHED',stats.pub],['SCHEDULED',stats.sch],['DRAFT',stats.drf]] as const).map(([s,n]) => (
              <div key={s} className="wf-legend-item" style={{ color:STATUS[s].color }}>
                <span className="wf-legend-dot" style={{ background:STATUS[s].color }} />
                {n} {STATUS[s].label}
              </div>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="wf-cal">
          <div className="wf-dow">
            {WEEKDAYS.map(d => <div key={d} className="wf-dow-lbl">{d}</div>)}
          </div>
          {loadErr && !loading && (
            <div style={{ padding:'32px 16px', textAlign:'center' }}>
              <div className="wf-err" style={{ justifyContent:'center' }}>
                <Icon name="error_outline" size={15} />
                {loadErr}
                <button
                  onClick={load}
                  style={{ marginLeft:10, background:'transparent', border:'none', cursor:'pointer', textDecoration:'underline', color:'inherit', fontFamily:'inherit', fontSize:'inherit' }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          <div className="wf-grid">
            {loading
              ? Array.from({length:42}).map((_,i) => (
                  <div key={i} className="wf-skel" style={{ animationDelay:`${i*.016}s` }} />
                ))
              : cells.map((cell,i) => (
                  <CalendarCell
                    key={cell.date+i}
                    cell={cell}
                    index={i}
                    isToday={cell.date === td}
                    isSelected={selected?.date === cell.date}
                    onPick={pick}
                  />
                ))
            }
          </div>
        </div>

      </div>{/* end wf-left */}

      {/* ════ RIGHT PANEL — slides in, pushes entire left ═══════════════ */}
      <div className={`wf-right ${panelOpen ? 'open' : ''}`}>
        <div className="wf-right-inner">
          {selected && (
            <Detail cell={selected} onClose={close} onSaved={load} />
          )}
        </div>
      </div>

      {/* ════ MOBILE — bottom sheet (hidden on desktop via CSS) ══════════ */}
      {selected && (
        <>
          <div
            className="wf-mob-back"
            style={{ opacity:mobOpen?1:0, pointerEvents:mobOpen?'auto':'none' }}
            onClick={close}
          />
          <div className={`wf-mob-sheet ${mobOpen?'open':'shut'}`}>
            <div className="wf-mob-handle" />
            <Detail cell={selected} onClose={close} onSaved={load} isMobile />
          </div>
        </>
      )}

    </div>
  );
};

export default WeeklyFlowPage;
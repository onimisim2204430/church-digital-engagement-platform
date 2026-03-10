// FinancialDashboard.tsx
// "THE OBSERVATORY" — Church Financial Command Center
// Emerald × Obsidian | 6 Sections | Dark/Light | Beyond Imagination
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState, useEffect, useRef, useContext, useCallback, useMemo, memo
} from 'react';
import { useAdminTheme } from './layouts/AdminLayout';

// ─── THEME CTX ────────────────────────────────────────────────────────────────
// Theme is now controlled by AdminLayout

// ─── CSS INJECTION ────────────────────────────────────────────────────────────
let _css = false;
function injectObservatoryCSS() {
  if (_css) return; _css = true;
  const s = document.createElement('style');
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

    .obs { font-family:'JetBrains Mono',monospace; }
    .obs.dark {
      --bg0:#020617;--bg1:#0a1628;--bg2:#0f172a;--bg3:#1e293b;--bg4:#334155;
      --em:#10b981;--em2:#34d399;--em3:#6ee7b7;--emd:rgba(16,185,129,0.12);--emg:rgba(16,185,129,0.28);
      --t1:#f1f5f9;--t2:#94a3b8;--t3:#475569;--t4:#1e293b;
      --border:rgba(16,185,129,0.2);--b2:rgba(51,65,85,0.5);
      --red:#f43f5e;--amber:#f59e0b;--blue:#3b82f6;--purple:#a855f7;--cyan:#06b6d4;
      --card:rgba(10,22,40,0.85);--shadow:0 4px 24px rgba(0,0,0,0.5);--shadowem:0 0 24px rgba(16,185,129,0.18);
    }
    .obs.light {
      --bg0:#edfdf6;--bg1:#f0fdf4;--bg2:#ffffff;--bg3:#dcfce7;--bg4:#bbf7d0;
      --em:#059669;--em2:#10b981;--em3:#34d399;--emd:rgba(5,150,105,0.09);--emg:rgba(5,150,105,0.2);
      --t1:#0f172a;--t2:#374151;--t3:#6b7280;--t4:#d1fae5;
      --border:rgba(5,150,105,0.28);--b2:rgba(209,250,229,0.6);
      --red:#e11d48;--amber:#d97706;--blue:#2563eb;--purple:#9333ea;--cyan:#0891b2;
      --card:rgba(255,255,255,0.92);--shadow:0 4px 20px rgba(0,0,0,0.06);--shadowem:0 0 20px rgba(5,150,105,0.12);
    }

    /* ROOT LAYOUT */
    .obs-root{display:flex;flex-direction:column;height:100vh;overflow:hidden;background:var(--bg0);color:var(--t1);}
    .obs-ticker-bar{height:32px;display:flex;align-items:center;background:var(--bg1);border-bottom:1px solid var(--border);overflow:hidden;flex-shrink:0;position:relative;}
    .obs-ticker-fade-l{position:absolute;left:80px;top:0;bottom:0;width:40px;background:linear-gradient(90deg,var(--bg1),transparent);z-index:2;pointer-events:none;}
    .obs-ticker-fade-r{position:absolute;right:0;top:0;bottom:0;width:60px;background:linear-gradient(270deg,var(--bg1),transparent);z-index:2;pointer-events:none;}
    .obs-ticker-label{flex-shrink:0;padding:0 14px;font-size:10px;font-weight:700;letter-spacing:0.15em;color:var(--em);text-transform:uppercase;border-right:1px solid var(--border);}
    .obs-ticker-scroll{flex:1;overflow:hidden;white-space:nowrap;}
    .obs-ticker-inner{display:inline-flex;gap:36px;animation:obs-ticker 40s linear infinite;padding-left:20px;}
    @keyframes obs-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    .obs-ticker-item{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--t3);}
    .obs-ticker-item b{color:var(--t1);font-weight:600;}
    .obs-ticker-item .up{color:var(--em);}
    .obs-ticker-item .dn{color:var(--red);}

    .obs-topbar{height:52px;display:flex;align-items:center;gap:12px;padding:0 18px;background:var(--bg1);border-bottom:1px solid var(--border);flex-shrink:0;z-index:90;}
    .obs-logo{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;letter-spacing:-0.02em;white-space:nowrap;background:linear-gradient(135deg,var(--em),var(--em2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
    .obs-logo-sub{font-size:10px;font-weight:400;color:var(--t3);-webkit-text-fill-color:var(--t3);margin-left:2px;}
    .obs-divv{width:1px;height:22px;background:var(--b2);margin:0 4px;}
    .obs-search-wrap{flex:1;max-width:380px;display:flex;align-items:center;gap:8px;background:var(--bg2);border:1px solid var(--b2);border-radius:8px;padding:0 12px;height:34px;transition:border-color .2s;}
    .obs-search-wrap:focus-within{border-color:var(--em);}
    .obs-search-wrap input{background:none;border:none;outline:none;color:var(--t1);font-family:inherit;font-size:12px;width:100%;}
    .obs-search-wrap input::placeholder{color:var(--t3);}
    .obs-search-icon{color:var(--t3);font-size:13px;flex-shrink:0;}
    .obs-topbar-right{margin-left:auto;display:flex;align-items:center;gap:8px;}
    .obs-ibtn{width:34px;height:34px;border-radius:8px;border:1px solid var(--b2);background:var(--bg2);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--t2);transition:all .15s;font-size:15px;position:relative;}
    .obs-ibtn:hover{background:var(--emd);color:var(--em);border-color:var(--border);}
    .obs-ibtn .dot{position:absolute;top:5px;right:5px;width:7px;height:7px;border-radius:50%;background:var(--red);border:2px solid var(--bg1);}
    .obs-theme-btn{display:flex;align-items:center;gap:6px;padding:0 12px;height:34px;border-radius:8px;border:1px solid var(--border);background:var(--emd);cursor:pointer;color:var(--em);font-size:11px;font-family:inherit;font-weight:700;transition:all .15s;white-space:nowrap;letter-spacing:0.05em;}
    .obs-theme-btn:hover{background:var(--em);color:#fff;}
    .obs-live-chip{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:700;color:var(--em);letter-spacing:0.1em;text-transform:uppercase;}
    .obs-live-dot{width:7px;height:7px;border-radius:50%;background:var(--em);animation:obs-livepulse 1.4s ease-out infinite;}
    @keyframes obs-livepulse{0%{box-shadow:0 0 0 0 rgba(16,185,129,.5)}70%{box-shadow:0 0 0 8px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}}
    .obs-clock{font-size:11px;color:var(--t3);font-variant-numeric:tabular-nums;white-space:nowrap;}

    /* BODY */
    .obs-body{display:flex;flex:1;overflow:hidden;}
    .obs-sidebar{width:210px;flex-shrink:0;background:var(--bg1);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto;padding:12px 0 20px;}
    .obs-sidebar::-webkit-scrollbar{width:3px;}
    .obs-sidebar::-webkit-scrollbar-thumb{background:var(--em);border-radius:2px;}
    .obs-main{flex:1;overflow-y:auto;background:var(--bg0);padding:20px 22px;}
    .obs-main::-webkit-scrollbar{width:4px;}
    .obs-main::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
    .obs-rpanel{width:268px;flex-shrink:0;background:var(--bg1);border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;}

    /* SIDEBAR NAV */
    .obs-nav-group{padding:0 10px 6px;margin-bottom:2px;}
    .obs-nav-sect-label{font-size:9.5px;font-weight:700;letter-spacing:0.16em;color:var(--t3);text-transform:uppercase;padding:6px 10px 4px;}
    .obs-nav-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:12.5px;color:var(--t2);transition:all .15s;margin-bottom:1px;border:1px solid transparent;user-select:none;}
    .obs-nav-item:hover{background:var(--emd);color:var(--t1);}
    .obs-nav-item.act{background:var(--emd);color:var(--em);border-color:var(--border);font-weight:600;}
    .obs-nav-icon{font-size:15px;width:20px;text-align:center;flex-shrink:0;}
    .obs-nav-label{flex:1;}
    .obs-nav-badge{font-size:9px;padding:1px 6px;border-radius:10px;font-weight:800;background:var(--red);color:#fff;}
    .obs-nav-badge.g{background:var(--em);}
    .obs-nav-score{font-size:11px;font-weight:700;color:var(--em);}

    .obs-sidebar-bottom{margin-top:auto;padding:10px 10px 0;border-top:1px solid var(--b2);margin-top:12px;}
    .obs-mini-stat{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;font-size:11px;}
    .obs-mini-stat-label{color:var(--t3);}
    .obs-mini-stat-val{color:var(--t1);font-weight:700;}

    /* MAIN CARDS */
    .obs-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;box-shadow:var(--shadow);backdrop-filter:blur(8px);position:relative;overflow:hidden;}
    .obs-card:hover{border-color:var(--em);box-shadow:var(--shadowem);}
    .obs-card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
    .obs-card-title{font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:0.09em;}
    .obs-card-badge{font-size:10px;padding:2px 8px;border-radius:20px;background:var(--emd);color:var(--em);border:1px solid var(--border);}
    .obs-card-badge.red{background:rgba(244,63,94,.12);color:var(--red);border-color:rgba(244,63,94,.3);}
    .obs-card-badge.amber{background:rgba(245,158,11,.12);color:var(--amber);border-color:rgba(245,158,11,.3);}
    .obs-card-badge.blue{background:rgba(59,130,246,.12);color:var(--blue);border-color:rgba(59,130,246,.3);}
    .obs-card-badge.purple{background:rgba(168,85,247,.12);color:var(--purple);border-color:rgba(168,85,247,.3);}
    .obs-card-stripe{position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--em),var(--em2));}

    /* KPI GRID */
    .obs-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;}
    .obs-kpi{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;position:relative;overflow:hidden;cursor:pointer;transition:all .2s;box-shadow:var(--shadow);}
    .obs-kpi:hover{transform:translateY(-2px);border-color:var(--em);box-shadow:var(--shadowem);}
    .obs-kpi-accent{position:absolute;top:0;left:0;right:0;height:3px;}
    .obs-kpi-icon{position:absolute;right:12px;top:12px;font-size:22px;opacity:.12;}
    .obs-kpi-label{font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;}
    .obs-kpi-value{font-family:'Syne',sans-serif;font-size:21px;font-weight:800;color:var(--t1);margin-bottom:5px;font-variant-numeric:tabular-nums;line-height:1.1;}
    .obs-kpi-sub{font-size:11px;display:flex;align-items:center;gap:5px;}
    .obs-up{color:var(--em);}
    .obs-dn{color:var(--red);}
    .obs-neu{color:var(--t3);}
    .obs-kpi-spark{margin-top:8px;}

    /* GRIDS */
    .obs-g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}
    .obs-g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px;}
    .obs-g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:14px;}
    .obs-g21{display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:14px;}
    .obs-g12{display:grid;grid-template-columns:1fr 2fr;gap:14px;margin-bottom:14px;}
    .obs-g31{display:grid;grid-template-columns:3fr 1fr;gap:14px;margin-bottom:14px;}
    .obs-g13{display:grid;grid-template-columns:1fr 3fr;gap:14px;margin-bottom:14px;}
    .obs-gmb{margin-bottom:14px;}

    /* SECTION */
    .obs-section-hd{display:flex;align-items:center;gap:10px;margin-bottom:18px;}
    .obs-section-accent{width:4px;height:22px;background:linear-gradient(180deg,var(--em),transparent);border-radius:2px;}
    .obs-section-title{font-family:'Syne',sans-serif;font-size:19px;font-weight:800;color:var(--t1);letter-spacing:-.02em;}
    .obs-section-desc{font-size:11px;color:var(--t3);margin-left:2px;}
    .obs-section-right{margin-left:auto;display:flex;align-items:center;gap:8px;}
    .obs-tab-group{display:flex;gap:4px;background:var(--bg2);border-radius:8px;padding:3px;}
    .obs-tab-btn{padding:4px 12px;border-radius:6px;font-size:11px;font-family:inherit;cursor:pointer;border:none;background:none;color:var(--t3);font-weight:600;transition:all .15s;}
    .obs-tab-btn.act{background:var(--emd);color:var(--em);}

    /* TABLES */
    .obs-tbl{width:100%;border-collapse:collapse;font-size:12px;}
    .obs-tbl th{text-align:left;padding:7px 10px;color:var(--t3);border-bottom:1px solid var(--b2);font-weight:700;text-transform:uppercase;font-size:9.5px;letter-spacing:.1em;white-space:nowrap;}
    .obs-tbl td{padding:8px 10px;border-bottom:1px solid var(--b2);color:var(--t2);vertical-align:middle;}
    .obs-tbl tr:last-child td{border-bottom:none;}
    .obs-tbl tr:hover td{background:var(--emd);color:var(--t1);}
    .obs-td-em{color:var(--em)!important;font-weight:700;}
    .obs-td-red{color:var(--red)!important;}
    .obs-td-amber{color:var(--amber)!important;}
    .obs-td-blue{color:var(--blue)!important;}

    /* PILLS */
    .obs-pill{display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;}
    .obs-pill.g{background:rgba(16,185,129,.14);color:var(--em);border:1px solid rgba(16,185,129,.3);}
    .obs-pill.r{background:rgba(244,63,94,.14);color:var(--red);border:1px solid rgba(244,63,94,.3);}
    .obs-pill.a{background:rgba(245,158,11,.14);color:var(--amber);border:1px solid rgba(245,158,11,.3);}
    .obs-pill.b{background:rgba(59,130,246,.14);color:var(--blue);border:1px solid rgba(59,130,246,.3);}
    .obs-pill.p{background:rgba(168,85,247,.14);color:var(--purple);border:1px solid rgba(168,85,247,.3);}
    .obs-pill.c{background:rgba(6,182,212,.14);color:var(--cyan);border:1px solid rgba(6,182,212,.3);}

    /* PROGRESS */
    .obs-prog-track{height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;}
    .obs-prog-fill{height:100%;border-radius:3px;transition:width .7s ease;}
    .obs-prog-fill.g{background:linear-gradient(90deg,var(--em),var(--em2));}
    .obs-prog-fill.r{background:linear-gradient(90deg,var(--red),#fb7185);}
    .obs-prog-fill.a{background:linear-gradient(90deg,var(--amber),#fcd34d);}
    .obs-prog-fill.b{background:linear-gradient(90deg,var(--blue),#60a5fa);}
    .obs-prog-fill.p{background:linear-gradient(90deg,var(--purple),#d8b4fe);}

    /* STAT ROW */
    .obs-stat-row{display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--b2);}
    .obs-stat-row:last-child{border-bottom:none;}
    .obs-stat-label{font-size:12px;color:var(--t2);}
    .obs-stat-val{font-size:12px;font-weight:700;color:var(--t1);font-variant-numeric:tabular-nums;}

    /* RIGHT PANEL */
    .obs-rp-hd{padding:12px 14px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--t2);text-transform:uppercase;letter-spacing:.1em;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
    .obs-rp-scroll{overflow-y:auto;flex:1;}
    .obs-rp-scroll::-webkit-scrollbar{width:3px;}
    .obs-rp-scroll::-webkit-scrollbar-thumb{background:var(--em);}
    .obs-alert-item{padding:9px 14px;border-bottom:1px solid var(--b2);display:flex;align-items:flex-start;gap:9px;cursor:pointer;transition:background .15s;}
    .obs-alert-item:hover{background:var(--emd);}
    .obs-alert-dot{width:7px;height:7px;border-radius:50%;margin-top:4px;flex-shrink:0;}
    .obs-alert-text{font-size:11px;color:var(--t2);line-height:1.45;}
    .obs-alert-time{font-size:10px;color:var(--t3);margin-top:2px;}

    /* INSIGHTS */
    .obs-insight{padding:11px 12px;border-radius:10px;margin-bottom:7px;border:1px solid;display:flex;gap:9px;align-items:flex-start;cursor:pointer;transition:all .15s;}
    .obs-insight:hover{transform:translateX(2px);}
    .obs-insight.pos{background:rgba(16,185,129,.07);border-color:rgba(16,185,129,.25);}
    .obs-insight.warn{background:rgba(245,158,11,.07);border-color:rgba(245,158,11,.25);}
    .obs-insight.alert{background:rgba(244,63,94,.07);border-color:rgba(244,63,94,.25);}
    .obs-insight.info{background:rgba(59,130,246,.07);border-color:rgba(59,130,246,.25);}
    .obs-insight-icon{font-size:17px;flex-shrink:0;margin-top:1px;}
    .obs-insight-title{font-size:12px;font-weight:700;color:var(--t1);margin-bottom:2px;}
    .obs-insight-text{font-size:11px;color:var(--t2);line-height:1.45;}
    .obs-insight-meta{font-size:10px;color:var(--t3);margin-top:3px;}

    /* SCORE RING */
    .obs-score-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;}
    .obs-score-center{position:absolute;text-align:center;}
    .obs-score-num{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;color:var(--t1);line-height:1;}
    .obs-score-lbl{font-size:10px;color:var(--t3);}

    /* HEATMAP */
    .obs-hm-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:2.5px;}
    .obs-hm-cell{aspect-ratio:1;border-radius:3px;cursor:pointer;transition:transform .15s;}
    .obs-hm-cell:hover{transform:scale(1.4);z-index:10;position:relative;}

    /* SEGMENT BAR */
    .obs-seg-bar{height:10px;border-radius:5px;overflow:hidden;display:flex;}
    .obs-seg-piece{height:100%;transition:flex .5s ease;}

    /* COMP ROWS */
    .obs-comp-row{display:flex;align-items:center;gap:10px;margin-bottom:9px;font-size:12px;}
    .obs-comp-label{width:120px;color:var(--t2);flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .obs-comp-track{flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden;}
    .obs-comp-fill{height:100%;border-radius:4px;transition:width .7s ease;}
    .obs-comp-val{width:70px;text-align:right;font-weight:700;color:var(--t1);flex-shrink:0;}

    /* GOAL CARD */
    .obs-goal{padding:11px 13px;border-radius:10px;background:var(--bg2);border:1px solid var(--b2);margin-bottom:7px;transition:border-color .2s;}
    .obs-goal:hover{border-color:var(--em);}
    .obs-goal-hd{display:flex;justify-content:space-between;margin-bottom:7px;align-items:center;}
    .obs-goal-name{font-size:12px;font-weight:700;color:var(--t1);}
    .obs-goal-pct{font-size:13px;font-weight:800;color:var(--em);}
    .obs-goal-meta{display:flex;justify-content:space-between;font-size:10px;color:var(--t3);margin-top:5px;}

    /* FEED */
    .obs-feed-item{padding:9px 14px;border-bottom:1px solid var(--b2);display:flex;gap:9px;cursor:pointer;transition:background .15s;}
    .obs-feed-item:hover{background:var(--emd);}
    .obs-feed-icon{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;background:var(--bg2);}
    .obs-feed-text{font-size:11px;color:var(--t2);line-height:1.4;flex:1;}
    .obs-feed-time{font-size:10px;color:var(--t3);margin-top:2px;}
    .obs-feed-amount{font-size:12px;font-weight:700;color:var(--em);white-space:nowrap;align-self:flex-start;}

    /* RISK */
    .obs-risk-cell{border-radius:8px;padding:9px 6px;text-align:center;font-size:10px;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid transparent;}
    .obs-risk-cell:hover{transform:scale(1.05);}
    .obs-risk-cell.L{background:rgba(16,185,129,.13);color:var(--em);border-color:rgba(16,185,129,.3);}
    .obs-risk-cell.M{background:rgba(245,158,11,.13);color:var(--amber);border-color:rgba(245,158,11,.3);}
    .obs-risk-cell.H{background:rgba(244,63,94,.13);color:var(--red);border-color:rgba(244,63,94,.3);}
    .obs-risk-cell.C{background:rgba(244,63,94,.28);color:var(--red);border-color:var(--red);animation:obs-pulse 1.8s infinite;}
    @keyframes obs-pulse{0%,100%{opacity:1}50%{opacity:.55}}

    /* WATCHLIST */
    .obs-watch-item{padding:9px 14px;border-bottom:1px solid var(--b2);display:flex;align-items:center;gap:8px;cursor:pointer;transition:background .15s;}
    .obs-watch-item:hover{background:var(--emd);}
    .obs-watch-label{font-size:11px;color:var(--t2);flex:1;}
    .obs-watch-val{font-size:12px;font-weight:700;color:var(--t1);}
    .obs-watch-chg{font-size:10px;}

    /* MATRIX CELL */
    .obs-mat-cell{aspect-ratio:1;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;cursor:pointer;transition:transform .15s;}
    .obs-mat-cell:hover{transform:scale(1.15);}

    /* CALENDAR */
    .obs-cal-event{padding:7px 10px;border-radius:8px;margin-bottom:5px;border-left:3px solid;font-size:11px;}
    .obs-cal-event.payroll{border-color:var(--blue);background:rgba(59,130,246,.08);}
    .obs-cal-event.tax{border-color:var(--amber);background:rgba(245,158,11,.08);}
    .obs-cal-event.audit{border-color:var(--purple);background:rgba(168,85,247,.08);}
    .obs-cal-event.board{border-color:var(--em);background:rgba(16,185,129,.08);}
    .obs-cal-event.maturity{border-color:var(--red);background:rgba(244,63,94,.08);}
    .obs-cal-title{font-weight:700;color:var(--t1);margin-bottom:2px;}
    .obs-cal-meta{color:var(--t3);font-size:10px;}

    /* DONUT LEGEND */
    .obs-legend-item{display:flex;align-items:center;gap:8px;font-size:11px;padding:4px 0;}
    .obs-legend-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;}
    .obs-legend-label{color:var(--t2);flex:1;}
    .obs-legend-val{color:var(--t1);font-weight:700;}
    .obs-legend-pct{color:var(--t3);font-size:10px;width:30px;text-align:right;}

    /* SCENARIO */
    .obs-scenario-btn{padding:5px 12px;border-radius:20px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid var(--b2);background:var(--bg2);color:var(--t3);transition:all .15s;font-family:inherit;letter-spacing:.04em;}
    .obs-scenario-btn.act{background:var(--emd);color:var(--em);border-color:var(--em);}

    /* COHORT */
    .obs-cohort-cell{border-radius:4px;padding:5px 3px;text-align:center;font-size:9.5px;font-weight:700;cursor:pointer;transition:transform .15s;}
    .obs-cohort-cell:hover{transform:scale(1.2);z-index:5;position:relative;}

    /* RADAR LABELS */
    .obs-radar-wrap{position:relative;}

    /* ANIMATIONS */
    @keyframes obs-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .obs-fadein{animation:obs-fadein .35s ease forwards;}
    @keyframes obs-slideright{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
    .obs-slideright{animation:obs-slideright .3s ease forwards;}

    /* DIVIDER */
    .obs-div{height:1px;background:var(--b2);margin:10px 0;}

    /* SCROLL AREA */
    .obs-scroll-x{overflow-x:auto;padding-bottom:4px;}
    .obs-scroll-x::-webkit-scrollbar{height:3px;}
    .obs-scroll-x::-webkit-scrollbar-thumb{background:var(--em);}

    /* FX CHIP */
    .obs-fx-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:6px;font-size:11px;background:var(--bg2);border:1px solid var(--b2);color:var(--t2);}

    /* RESPONSIVE */
    @media(max-width:1200px){.obs-rpanel{display:none;}}
    @media(max-width:960px){.obs-kpi-grid{grid-template-columns:repeat(2,1fr);}.obs-g2,.obs-g3,.obs-g21,.obs-g12,.obs-g31,.obs-g13{grid-template-columns:1fr;}}
    @media(max-width:680px){.obs-sidebar{display:none;}}
  `;
  document.head.appendChild(s);
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
type NavSection = 'overview'|'intelligence'|'forecast'|'analytics'|'pulse'|'risk';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const fmt = (n:number, decimals=0) =>
  new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(n);
const fmtK = (n:number) => n>=1e9?`₦${(n/1e9).toFixed(1)}B`:n>=1e6?`₦${(n/1e6).toFixed(1)}M`:n>=1e3?`₦${(n/1e3).toFixed(0)}K`:`₦${n}`;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const MONTHLY_DATA = [
  {m:'Jan',income:4800000,expense:3200000,giving:2100000,members:1420,attendance:890},
  {m:'Feb',income:5100000,expense:3400000,giving:2400000,members:1438,attendance:920},
  {m:'Mar',income:4700000,expense:3600000,giving:2050000,members:1445,attendance:860},
  {m:'Apr',income:6200000,expense:3100000,giving:3100000,members:1460,attendance:1050},
  {m:'May',income:5800000,expense:3500000,giving:2900000,members:1472,attendance:980},
  {m:'Jun',income:5200000,expense:3800000,giving:2500000,members:1488,attendance:930},
  {m:'Jul',income:4600000,expense:3200000,giving:2200000,members:1495,attendance:870},
  {m:'Aug',income:5500000,expense:3400000,giving:2700000,members:1510,attendance:960},
  {m:'Sep',income:6800000,expense:3700000,giving:3400000,members:1528,attendance:1120},
  {m:'Oct',income:7200000,expense:4100000,giving:3800000,members:1542,attendance:1180},
  {m:'Nov',income:6500000,expense:3900000,giving:3200000,members:1558,attendance:1090},
  {m:'Dec',income:8900000,expense:4200000,giving:5100000,members:1575,attendance:1380},
];

const WEEKLY_HEATMAP = Array.from({length:52},(_,w)=>
  Array.from({length:7},(_,d)=>{
    const base = [2,3,2,2,3,8,6][d];
    const easter = w===13?3:1;
    const dec = w>=48?2:1;
    return Math.max(0, Math.round((base + (Math.random()-0.4)*2)*easter*dec));
  })
);

const DEPT_SPENDING = [
  {name:'Worship & Music',budget:1800000,actual:1650000,color:'var(--em)'},
  {name:'Children Ministry',budget:1200000,actual:1380000,color:'var(--amber)'},
  {name:'Outreach & Missions',budget:2400000,actual:2210000,color:'var(--blue)'},
  {name:'Admin & Operations',budget:3600000,actual:3410000,color:'var(--purple)'},
  {name:'Youth Ministry',budget:900000,actual:870000,color:'var(--cyan)'},
  {name:'Media & Comms',budget:600000,actual:720000,color:'var(--red)'},
  {name:'Facilities',budget:2000000,actual:1890000,color:'var(--em2)'},
];

const FUND_ALLOCATION = [
  {name:'General Operations',pct:42,color:'var(--em)',val:23100000},
  {name:'Building Fund',pct:18,color:'var(--blue)',val:9900000},
  {name:'Mission Reserve',pct:15,color:'var(--purple)',val:8250000},
  {name:'Emergency Reserve',pct:12,color:'var(--amber)',val:6600000},
  {name:'Youth Programs',pct:8,color:'var(--cyan)',val:4400000},
  {name:'Media & Events',pct:5,color:'var(--red)',val:2750000},
];

const FORECAST_SCENARIOS = {
  optimistic: [9200000,9600000,10100000,11200000,10800000,10500000,9800000,10200000,11500000,12100000,11400000,14500000],
  base:        [8400000,8700000,9000000,10200000,9700000,9300000,8600000,9100000,10300000,10800000,10100000,12800000],
  pessimistic: [7200000,7400000,7800000,8600000,8100000,7700000,7100000,7500000,8400000,8900000,8300000,10200000],
};

const GOALS = [
  {name:'Annual Giving Target',target:85000000,raised:55200000,deadline:'Dec 2025',icon:'🎯'},
  {name:'Building Fund',target:120000000,raised:48600000,deadline:'Mar 2026',icon:'🏛️'},
  {name:'Mission 2025 Fund',target:30000000,raised:24100000,deadline:'Jun 2025',icon:'✈️'},
  {name:'Equipment Upgrade',target:8000000,raised:6400000,deadline:'Aug 2025',icon:'🎸'},
  {name:'Scholarship Fund',target:5000000,raised:2100000,deadline:'Sep 2025',icon:'🎓'},
];

const INSIGHTS = [
  {type:'pos',icon:'📈',title:'Giving Velocity Up 23%',text:'Donations accelerated this week compared to the 30-day average. Peak times: Sunday 9–11 AM and Thursday evenings.',meta:'Updated 2h ago · High confidence'},
  {type:'warn',icon:'⚠️',title:'Children Ministry Over Budget',text:'Spending is 15% above budget (₦180K over). Q4 projections suggest ₦340K overage if unaddressed.',meta:'Budget alert · Action recommended'},
  {type:'info',icon:'🔍',title:'Attendance-Giving Correlation',text:'Strong positive correlation (r=0.84) detected between service attendance and weekly giving. Each +100 attendees ≈ +₦420K.',meta:'Statistical insight · 12-month data'},
  {type:'pos',icon:'💡',title:'New Member Surge',text:'35 new members joined this month — the highest in 18 months. Historically, new members become regular givers within 4–6 weeks.',meta:'Membership analytics · Growing trend'},
  {type:'alert',icon:'🚨',title:'Top Donor Concentration Risk',text:'Top 3 donors represent 28% of monthly income. Industry best practice is <15%. Risk of significant shortfall if any one departs.',meta:'Concentration risk · Review needed'},
  {type:'info',icon:'📅',title:'Seasonal Pattern Detected',text:'April and December consistently outperform baseline by 30–45%. Pre-loading October campaigns could amplify Q4 performance.',meta:'Seasonality model · 4-year pattern'},
  {type:'pos',icon:'🌱',title:'Digital Giving Adoption +41%',text:'Online/mobile giving now represents 68% of total donations, up from 48% last year. Mobile payments driving growth.',meta:'Digital transformation · Positive trend'},
  {type:'warn',icon:'📉',title:'Mid-Week Giving Trough',text:'Tuesday–Wednesday giving averages just 4% of weekly total. Simple mid-week campaign could capture estimated ₦180K/month.',meta:'Opportunity gap · Low effort'},
];

const ALERTS = [
  {color:'var(--red)',text:'Media & Comms dept exceeded budget by ₦120,000',time:'10 min ago'},
  {color:'var(--em)',text:'Large donation ₦2,500,000 received — Mr. Adeyemi Folake',time:'1h ago'},
  {color:'var(--amber)',text:'Payroll run due in 3 days — ₦4.2M pending approval',time:'2h ago'},
  {color:'var(--blue)',text:'Q4 Board Report ready for review',time:'5h ago'},
  {color:'var(--purple)',text:'New member batch: 12 members from Lekki Zone',time:'8h ago'},
  {color:'var(--em)',text:'Building Fund milestone: 40% of target reached',time:'1d ago'},
  {color:'var(--amber)',text:'VAT filing deadline: 21 days remaining',time:'1d ago'},
  {color:'var(--red)',text:'Investment bond mature in 14 days — ₦5M FGN Bond',time:'2d ago'},
];

const WATCHLIST = [
  {label:'Total Church Assets',val:'₦55.2M',chg:'+4.2%',up:true},
  {label:'Cash & Bank Balance',val:'₦12.8M',chg:'+1.1%',up:true},
  {label:'Monthly Burn Rate',val:'₦3.9M',chg:'+8.4%',up:false},
  {label:'Cash Runway',val:'3.2 mo',chg:'-0.4',up:false},
  {label:'Net Giving YTD',val:'₦55.2M',chg:'+18.3%',up:true},
  {label:'Member Count',val:'1,575',chg:'+35',up:true},
  {label:'Avg Gift / Member',val:'₦35,047',chg:'+6.2%',up:true},
  {label:'Debt-to-Asset',val:'0.12',chg:'-0.02',up:true},
];

const ACTIVITY_FEED = [
  {icon:'💚',text:'Online tithe — Olamide Adeyemi',amount:'₦150,000',time:'2 min ago',type:'giving'},
  {icon:'🏦',text:'Paystack transfer received — 42 transactions',amount:'₦890,000',time:'8 min ago',type:'batch'},
  {icon:'📤',text:'Vendor payment — Faithhouse AV Services',amount:'-₦240,000',time:'15 min ago',type:'expense'},
  {icon:'💚',text:'Sunday offertory (digital) counted',amount:'₦1,420,000',time:'32 min ago',type:'giving'},
  {icon:'👤',text:'New member registered — Covenant Zone',amount:'',time:'1h ago',type:'member'},
  {icon:'📤',text:'Salary advance approved — Music Director',amount:'-₦80,000',time:'2h ago',type:'expense'},
  {icon:'💚',text:'Building fund pledge — Adaeze Okonkwo',amount:'₦500,000',time:'3h ago',type:'giving'},
  {icon:'📋',text:'Budget reallocation approved by board',amount:'',time:'4h ago',type:'admin'},
  {icon:'💚',text:'Bank transfer — Folake Emmanuel',amount:'₦2,500,000',time:'5h ago',type:'giving'},
  {icon:'📤',text:'Utility bills — Electricity IKEDC',amount:'-₦185,000',time:'6h ago',type:'expense'},
];

const RISK_MATRIX = [
  {risk:'Donor Concentration',likelihood:4,impact:4,level:'C',owner:'Finance Team'},
  {risk:'Cash Flow Shortfall',likelihood:3,impact:4,level:'H',owner:'Treasurer'},
  {risk:'Cyber/Fraud Exposure',likelihood:2,impact:5,level:'H',owner:'IT & Finance'},
  {risk:'Regulatory Non-Compliance',likelihood:2,impact:4,level:'M',owner:'Legal'},
  {risk:'Staff Turnover',likelihood:3,impact:3,level:'M',owner:'HR'},
  {risk:'Venue/Infrastructure',likelihood:2,impact:3,level:'M',owner:'Operations'},
  {risk:'Investment Loss',likelihood:2,impact:3,level:'M',owner:'Treasury'},
  {risk:'Currency Devaluation',likelihood:3,impact:2,level:'M',owner:'Finance'},
  {risk:'Data Loss',likelihood:1,impact:4,level:'L',owner:'IT'},
  {risk:'Minor Budget Overrun',likelihood:4,impact:2,level:'M',owner:'Finance'},
];

const RADAR_SCORES = [
  {label:'Liquidity',score:72},
  {label:'Giving Growth',score:88},
  {label:'Compliance',score:94},
  {label:'Reserves',score:61},
  {label:'Transparency',score:89},
  {label:'Digital',score:84},
  {label:'Budget Mgmt',score:76},
  {label:'Risk Ctrl',score:68},
];

const COHORT_DATA = [
  {year:'2020',Jan:100,Feb:92,Mar:88,Apr:85,May:82,Jun:79,Jul:78,Aug:76,Sep:74,Oct:72,Nov:71,Dec:70},
  {year:'2021',Jan:100,Feb:94,Mar:90,Apr:87,May:85,Jun:83,Jul:80,Aug:79,Sep:77,Oct:75,Nov:73,Dec:72},
  {year:'2022',Jan:100,Feb:95,Mar:91,Apr:88,May:87,Jun:85,Jul:83,Aug:82,Sep:80,Oct:78,Nov:76,Dec:74},
  {year:'2023',Jan:100,Feb:96,Mar:92,Apr:91,May:89,Jun:88,Jul:86,Aug:85,Sep:83,Oct:81,Nov:80,Dec:79},
  {year:'2024',Jan:100,Feb:97,Mar:94,Apr:93,May:92,Jun:90,Jul:89,Aug:88,Sep:87,Oct:85,Nov:84,Dec:83},
];

const UPCOMING_EVENTS = [
  {type:'payroll',title:'Staff Payroll Run',date:'Mar 28, 2025',amount:'₦4.2M',days:3},
  {type:'tax',title:'VAT Filing Deadline',date:'Apr 21, 2025',amount:'₦380K',days:27},
  {type:'maturity',title:'FGN Bond Maturity',date:'Apr 5, 2025',amount:'₦5M',days:11},
  {type:'board',title:'Q1 Board Meeting',date:'Apr 2, 2025',amount:'',days:8},
  {type:'audit',title:'Internal Audit Review',date:'Apr 15, 2025',amount:'',days:21},
  {type:'tax',title:'PAYE Remittance',date:'Mar 31, 2025',amount:'₦920K',days:6},
];

const BENCHMARK_DATA = [
  {metric:'Giving per Member',church:35047,peer:28200,unit:'₦'},
  {metric:'Admin Expense %',church:18,peer:22,unit:'%'},
  {metric:'Program Expense %',church:62,peer:58,unit:'%'},
  {metric:'Reserve Months',church:3.2,peer:4.1,unit:'mo'},
  {metric:'Digital Giving %',church:68,peer:51,unit:'%'},
  {metric:'New Member Retention',church:74,peer:62,unit:'%'},
];

const TOP_DONORS = [
  {rank:1,name:'Adeyemi Holdings',ytd:8500000,pct:15.4,mom:'+12%',type:'Corporate'},
  {rank:2,name:'Folake Emmanuel Trust',ytd:5200000,pct:9.4,mom:'+8%',type:'Individual'},
  {rank:3,name:'Okonkwo Foundation',ytd:3800000,pct:6.9,mom:'+0%',type:'Foundation'},
  {rank:4,name:'Dr. Chukwuemeka Obi',ytd:2100000,pct:3.8,mom:'+22%',type:'Individual'},
  {rank:5,name:'Covenant Biz Network',ytd:1900000,pct:3.4,mom:'+5%',type:'Corporate'},
  {rank:6,name:'Mama Bisi Legacy Fund',ytd:1600000,pct:2.9,mom:'-4%',type:'Memorial'},
  {rank:7,name:'Adaeze & Kelechi Okonkwo',ytd:1400000,pct:2.5,mom:'+15%',type:'Individual'},
  {rank:8,name:'Lekki Zone Council',ytd:1100000,pct:2.0,mom:'+0%',type:'Zone'},
];

// ─── UTILITY COMPONENTS ───────────────────────────────────────────────────────

/** Inline sparkline SVG */
const Spark = memo(({data,color='var(--em)',w=80,h=28}:{data:number[];color?:string;w?:number;h?:number}) => {
  if(!data||data.length<2) return null;
  const mn=Math.min(...data),mx=Math.max(...data);
  const range=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/range)*h}`).join(' ');
  const area=`M0,${h} L${pts.split(' ').join(' L')} L${w},${h} Z`;
  return (
    <svg width={w} height={h} style={{display:'block',overflow:'visible'}}>
      <defs>
        <linearGradient id={`sg-${w}-${h}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${w}-${h})`}/>
      <polyline fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" points={pts}/>
      <circle cx={(data.length-1)/(data.length-1)*w} cy={h-((data[data.length-1]-mn)/range)*h} r="2.5" fill={color}/>
    </svg>
  );
});

/** Area chart full */
const AreaChart = memo(({data,keys,colors,width=500,height=160}:{
  data:{[k:string]:number}[];keys:string[];colors:string[];width?:number;height?:number;
}) => {
  const pad={l:8,r:8,t:8,b:24};
  const cw=width-pad.l-pad.r, ch=height-pad.t-pad.b;
  const allVals=data.flatMap(d=>keys.map(k=>d[k]||0));
  const mx=Math.max(...allVals)||1;
  const x=(i:number)=>pad.l+(i/(data.length-1))*cw;
  const y=(v:number)=>pad.t+ch-(v/mx)*ch;
  const gradId=(k:string)=>`acg-${k.replace(/\s/g,'')}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{width:'100%',height:'auto',display:'block'}}>
      <defs>
        {colors.map((c,i)=>(
          <linearGradient key={i} id={gradId(keys[i])} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={c} stopOpacity="0"/>
          </linearGradient>
        ))}
      </defs>
      {/* grid lines */}
      {[0,0.25,0.5,0.75,1].map(t=>(
        <line key={t} x1={pad.l} y1={pad.t+ch*t} x2={pad.l+cw} y2={pad.t+ch*t}
          stroke="var(--b2)" strokeWidth="0.8" strokeDasharray="3,4"/>
      ))}
      {/* areas */}
      {keys.map((k,ki)=>{
        const pts=data.map((d,i)=>`${x(i)},${y(d[k]||0)}`);
        const area=`M${x(0)},${y(0)+ch+pad.t} L${pts.join(' L')} L${x(data.length-1)},${y(0)+ch+pad.t} Z`;
        return <path key={k} d={area} fill={`url(#${gradId(k)})`}/>;
      })}
      {/* lines */}
      {keys.map((k,ki)=>{
        const pts=data.map((d,i)=>`${x(i)},${y(d[k]||0)}`).join(' ');
        return <polyline key={k} fill="none" stroke={colors[ki]} strokeWidth="1.8"
          strokeLinejoin="round" strokeLinecap="round" points={pts}/>;
      })}
      {/* x labels */}
      {data.map((d,i)=>(
        <text key={i} x={x(i)} y={height-4} textAnchor="middle"
          style={{fontSize:9,fill:'var(--t3)',fontFamily:'JetBrains Mono,monospace'}}>
          {d.m||MONTHS[i]}
        </text>
      ))}
    </svg>
  );
});

/** Bar chart */
const BarChart = memo(({data,colors,width=500,height=120}:{
  data:{label:string;value:number}[];colors:string[];width?:number;height?:number;
}) => {
  const pad={l:6,r:6,t:6,b:20};
  const mx=Math.max(...data.map(d=>d.value))||1;
  const bw=(width-pad.l-pad.r)/data.length;
  const bpad=bw*0.2;
  const ch=height-pad.t-pad.b;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{width:'100%',height:'auto',display:'block'}}>
      <defs>
        {colors.map((c,i)=>(
          <linearGradient key={i} id={`bcg-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={c} stopOpacity="0.4"/>
          </linearGradient>
        ))}
      </defs>
      {data.map((d,i)=>{
        const bh=(d.value/mx)*ch;
        const bx=pad.l+i*bw+bpad/2;
        const by=pad.t+ch-bh;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={bw-bpad} height={bh}
              fill={`url(#bcg-${i%colors.length})`} rx="2"/>
            <text x={bx+(bw-bpad)/2} y={height-4} textAnchor="middle"
              style={{fontSize:8,fill:'var(--t3)',fontFamily:'JetBrains Mono,monospace'}}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
});

/** Donut chart */
const Donut = memo(({segments,r=60,stroke=14}:{
  segments:{color:string;pct:number}[];r?:number;stroke?:number;
}) => {
  const size=(r+stroke)*2;
  const circ=2*Math.PI*r;
  let cumPct=0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r+stroke} cy={r+stroke} r={r} fill="none"
        stroke="var(--bg3)" strokeWidth={stroke}/>
      {segments.map((s,i)=>{
        const dash=s.pct/100*circ;
        const gap=circ-dash;
        const offset=circ*0.25-cumPct/100*circ;
        cumPct+=s.pct;
        return (
          <circle key={i} cx={r+stroke} cy={r+stroke} r={r} fill="none"
            stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{transition:'stroke-dasharray .6s ease'}}/>
        );
      })}
    </svg>
  );
});

/** Gauge arc */
const Gauge = memo(({value,max=100,color='var(--em)',size=120}:{value:number;max?:number;color?:string;size?:number}) => {
  const pct=Math.min(value/max,1);
  const r=size*0.38;
  const cx=size/2, cy=size*0.55;
  const startAngle=-Math.PI*0.8;
  const endAngle=Math.PI*0.8;
  const totalAngle=endAngle-startAngle;
  const angle=startAngle+pct*totalAngle;
  const arcPath=(sa:number,ea:number)=>{
    const x1=cx+r*Math.cos(sa), y1=cy+r*Math.sin(sa);
    const x2=cx+r*Math.cos(ea), y2=cy+r*Math.sin(ea);
    const large=(ea-sa)>Math.PI?1:0;
    return `M${x1},${y1} A${r},${r},0,${large},1,${x2},${y2}`;
  };
  const nx=cx+r*Math.cos(angle), ny=cy+r*Math.sin(angle);
  return (
    <svg width={size} height={size*0.7} viewBox={`0 0 ${size} ${size*0.7}`}>
      <path d={arcPath(startAngle,endAngle)} fill="none" stroke="var(--bg3)" strokeWidth="8" strokeLinecap="round"/>
      {pct>0&&<path d={arcPath(startAngle,angle)} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        style={{transition:'all .6s ease'}}/>}
      <circle cx={nx} cy={ny} r="5" fill={color} style={{transition:'all .6s ease'}}/>
    </svg>
  );
});

/** Radar chart */
const Radar = memo(({scores,size=200}:{scores:{label:string;score:number}[];size?:number}) => {
  const cx=size/2, cy=size/2;
  const r=size*0.36;
  const n=scores.length;
  const angle=(i:number)=>-Math.PI/2+(2*Math.PI/n)*i;
  const pt=(i:number,scale:number)=>({
    x:cx+r*scale*Math.cos(angle(i)),
    y:cy+r*scale*Math.sin(angle(i))
  });
  const polyPts=(scale:number)=>scores.map((_,i)=>{const p=pt(i,scale);return `${p.x},${p.y}`;}).join(' ');
  const dataPts=scores.map((s,i)=>pt(i,s.score/100));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[0.25,0.5,0.75,1].map(s=>(
        <polygon key={s} points={polyPts(s)} fill="none" stroke="var(--b2)" strokeWidth="0.8"/>
      ))}
      {scores.map((_,i)=>{const p=pt(i,1);return(
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--b2)" strokeWidth="0.8"/>
      )})}
      <polygon points={dataPts.map(p=>`${p.x},${p.y}`).join(' ')}
        fill="var(--emg)" stroke="var(--em)" strokeWidth="1.8" strokeLinejoin="round"/>
      {dataPts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--em)"/>)}
      {scores.map((s,i)=>{
        const p=pt(i,1.2);
        return(
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            style={{fontSize:9,fill:'var(--t3)',fontFamily:'JetBrains Mono,monospace'}}>
            {s.label}
          </text>
        );
      })}
    </svg>
  );
});

/** Animated counter */
function useCounter(target:number, duration=800) {
  const [val,setVal]=useState(0);
  useEffect(()=>{
    let start=Date.now();
    const tick=()=>{
      const elapsed=Date.now()-start;
      const pct=Math.min(elapsed/duration,1);
      const ease=1-Math.pow(1-pct,3);
      setVal(Math.round(target*ease));
      if(pct<1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },[target,duration]);
  return val;
}

/** Clock */
function Clock() {
  const [t,setT]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(id);},[]);
  return <span className="obs-clock">{t.toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>;
}

// ─── KPI CARD ──────────────────────────────────────────────────────────────────
const KPICard = memo(({label,value,sub,up,icon,color='var(--em)',sparkData}:{
  label:string;value:string;sub:string;up?:boolean;icon:string;color?:string;sparkData?:number[];
}) => (
  <div className="obs-kpi">
    <div className="obs-kpi-accent" style={{background:`linear-gradient(90deg,${color},${color}88)`}}/>
    <div className="obs-kpi-icon">{icon}</div>
    <div className="obs-kpi-label">{label}</div>
    <div className="obs-kpi-value">{value}</div>
    <div className="obs-kpi-sub">
      {up!==undefined&&<span className={up?'obs-up':'obs-dn'}>{up?'▲':'▼'}</span>}
      <span className={up===undefined?'obs-neu':up?'obs-up':'obs-dn'}>{sub}</span>
    </div>
    {sparkData&&<div className="obs-kpi-spark"><Spark data={sparkData} color={color} w={100} h={24}/></div>}
  </div>
));

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
const SectionHeader = memo(({title,desc,right}:{title:string;desc?:string;right?:React.ReactNode}) => (
  <div className="obs-section-hd">
    <div className="obs-section-accent"/>
    <div>
      <div className="obs-section-title">{title}</div>
      {desc&&<div className="obs-section-desc">{desc}</div>}
    </div>
    {right&&<div className="obs-section-right">{right}</div>}
  </div>
));

// ─══════════════════════════════════════════════════════════════════════════════
//  SECTION: OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════════
const OverviewSection = memo(() => {
  const [period,setPeriod]=useState<'1M'|'3M'|'6M'|'1Y'>('1Y');
  const data = period==='1M'?MONTHLY_DATA.slice(-1):period==='3M'?MONTHLY_DATA.slice(-3):period==='6M'?MONTHLY_DATA.slice(-6):MONTHLY_DATA;

  const totalIncome = MONTHLY_DATA.reduce((a,d)=>a+d.income,0);
  const totalGiving = MONTHLY_DATA.reduce((a,d)=>a+d.giving,0);
  const totalExpense = MONTHLY_DATA.reduce((a,d)=>a+d.expense,0);
  const netSurplus = totalIncome - totalExpense;
  const avIncome = useCounter(Math.round(totalIncome/1e6*10)/10);

  return (
    <div className="obs-fadein">
      <SectionHeader title="Command Overview"
        desc="Real-time financial pulse of the church"
        right={
          <div className="obs-tab-group">
            {(['1M','3M','6M','1Y'] as const).map(p=>(
              <button key={p} className={`obs-tab-btn${period===p?' act':''}`} onClick={()=>setPeriod(p)}>{p}</button>
            ))}
          </div>
        }/>

      {/* KPI Row */}
      <div className="obs-kpi-grid">
        <KPICard label="Annual Income" value={`₦${avIncome}M`} sub="+18.3% vs last year" up={true}
          icon="💰" sparkData={MONTHLY_DATA.map(d=>d.income/1e6)}/>
        <KPICard label="Total Giving YTD" value={fmtK(totalGiving)} sub="+24.1% vs last year" up={true}
          icon="🙏" color="var(--blue)" sparkData={MONTHLY_DATA.map(d=>d.giving/1e6)}/>
        <KPICard label="Net Surplus" value={fmtK(netSurplus)} sub="23.4% surplus margin" up={true}
          icon="📊" color="var(--purple)" sparkData={MONTHLY_DATA.map(d=>(d.income-d.expense)/1e6)}/>
        <KPICard label="Avg Monthly Expense" value={fmtK(totalExpense/12)} sub="+6.2% vs last year" up={false}
          icon="📤" color="var(--amber)" sparkData={MONTHLY_DATA.map(d=>d.expense/1e6)}/>
      </div>

      {/* Main area chart + Fund donut */}
      <div className="obs-g21">
        <div className="obs-card">
          <div className="obs-card-stripe"/>
          <div className="obs-card-hd">
            <span className="obs-card-title">Income vs Expense vs Giving</span>
            <div style={{display:'flex',gap:12,fontSize:10,alignItems:'center'}}>
              {[{label:'Income',color:'var(--em)'},{label:'Expense',color:'var(--red)'},{label:'Giving',color:'var(--blue)'}].map(l=>(
                <span key={l.label} style={{display:'flex',alignItems:'center',gap:4,color:'var(--t3)'}}>
                  <span style={{width:12,height:3,background:l.color,borderRadius:2,display:'inline-block'}}/>
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          <AreaChart
            data={data.map((d, i) => ({ ...d, m: i }))}
            keys={['income','expense','giving']}
            colors={['var(--em)','var(--red)','var(--blue)']}
            height={180}/>
        </div>
        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--blue),var(--purple))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">Fund Allocation</span>
            <span className="obs-card-badge">₦55.0M</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
            <Donut segments={FUND_ALLOCATION.map(f=>({color:f.color,pct:f.pct}))} r={52} stroke={12}/>
            <div style={{width:'100%'}}>
              {FUND_ALLOCATION.map(f=>(
                <div key={f.name} className="obs-legend-item">
                  <div className="obs-legend-dot" style={{background:f.color}}/>
                  <span className="obs-legend-label">{f.name}</span>
                  <span className="obs-legend-val">{fmtK(f.val)}</span>
                  <span className="obs-legend-pct">{f.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dept spending + membership */}
      <div className="obs-g21">
        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--purple),var(--cyan))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">Department Budget vs Actual</span>
            <span className="obs-card-badge">2025 YTD</span>
          </div>
          {DEPT_SPENDING.map(d=>{
            const pct=Math.round(d.actual/d.budget*100);
            const over=pct>100;
            return (
              <div key={d.name} className="obs-comp-row">
                <div className="obs-comp-label">{d.name}</div>
                <div className="obs-comp-track">
                  <div className="obs-comp-fill" style={{
                    width:`${Math.min(pct,100)}%`,
                    background:over?'linear-gradient(90deg,var(--red),#fb7185)':d.color
                  }}/>
                </div>
                <div className="obs-comp-val" style={{color:over?'var(--red)':'var(--t1)'}}>
                  {fmtK(d.actual)}<span style={{fontSize:9,color:'var(--t3)',marginLeft:3}}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--amber),var(--em2))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">Membership & Attendance</span>
          </div>
          <BarChart
            data={MONTHLY_DATA.map(d=>({label:d.m,value:d.attendance}))}
            colors={['var(--em)','var(--em2)','var(--em3)','var(--blue)','var(--purple)','var(--cyan)','var(--amber)','var(--em)','var(--em2)','var(--em3)','var(--blue)','var(--purple)']}
            height={100}/>
          <div className="obs-div" style={{margin:'10px 0 8px'}}/>
          <div className="obs-g2" style={{margin:0,gap:8}}>
            {[
              {label:'Total Members',val:'1,575',chg:'+35 this mo'},
              {label:'Avg Attendance',val:'1,023',chg:'+4.2%'},
              {label:'New Members',val:'35',chg:'This month'},
              {label:'Retention Rate',val:'94.2%',chg:'+1.1%'},
            ].map(s=>(
              <div key={s.label} style={{background:'var(--bg2)',borderRadius:8,padding:'8px 10px',border:'1px solid var(--b2)'}}>
                <div style={{fontSize:10,color:'var(--t3)',marginBottom:3}}>{s.label}</div>
                <div style={{fontSize:15,fontWeight:800,color:'var(--t1)',fontFamily:'Syne,sans-serif'}}>{s.val}</div>
                <div style={{fontSize:10,color:'var(--em)'}}>{s.chg}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly giving segment + Top stats */}
      <div className="obs-g2">
        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--cyan),var(--blue))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">Giving Channel Breakdown</span>
            <span className="obs-card-badge blue">This Month</span>
          </div>
          {[
            {label:'Mobile/USSD',pct:38,color:'var(--em)',val:2090000},
            {label:'Online Banking',pct:30,color:'var(--blue)',val:1650000},
            {label:'Cash Offertory',pct:18,color:'var(--amber)',val:990000},
            {label:'POS Terminal',pct:9,color:'var(--purple)',val:495000},
            {label:'Crypto/Other',pct:5,color:'var(--cyan)',val:275000},
          ].map(c=>(
            <div key={c.label} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
                <span style={{color:'var(--t2)'}}>{c.label}</span>
                <span style={{color:'var(--t1)',fontWeight:700}}>{fmtK(c.val)} <span style={{color:'var(--t3)',fontWeight:400}}>({c.pct}%)</span></span>
              </div>
              <div className="obs-prog-track">
                <div className="obs-prog-fill" style={{width:`${c.pct}%`,background:c.color}}/>
              </div>
            </div>
          ))}
        </div>

        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--em),var(--cyan))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">Financial Health Snapshot</span>
          </div>
          {[
            {label:'Cash & Equivalents',val:'₦12,800,000',sub:'3.2 months runway'},
            {label:'Total Assets',val:'₦55,200,000',sub:'+4.2% MoM'},
            {label:'Total Liabilities',val:'₦6,600,000',sub:'Debt ratio: 12%'},
            {label:'Net Worth (Equity)',val:'₦48,600,000',sub:'+₦2.1M this quarter'},
            {label:'Monthly Cash Flow',val:'₦+2,300,000',sub:'Positive surplus'},
            {label:'Investment Portfolio',val:'₦18,400,000',sub:'FGN Bonds + T-Bills'},
            {label:'Designated Reserves',val:'₦9,200,000',sub:'Building + Mission'},
            {label:'Undesignated Surplus',val:'₦3,600,000',sub:'Available for use'},
          ].map(s=>(
            <div key={s.label} className="obs-stat-row">
              <div>
                <div className="obs-stat-label">{s.label}</div>
                <div style={{fontSize:10,color:'var(--t3)'}}>{s.sub}</div>
              </div>
              <div className="obs-stat-val">{s.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ─══════════════════════════════════════════════════════════════════════════════
//  SECTION: INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════════
const IntelligenceSection = memo(() => {
  const [activeInsight,setActiveInsight]=useState<number|null>(null);

  // Correlation matrix: attendance, giving, events, new members, expenses
  const corrLabels=['Attendance','Giving','Events','New Members','Expenses'];
  const corrMatrix=[
    [1.00,0.84,0.62,0.71,0.45],
    [0.84,1.00,0.58,0.63,0.31],
    [0.62,0.58,1.00,0.49,0.52],
    [0.71,0.63,0.49,1.00,0.22],
    [0.45,0.31,0.52,0.22,1.00],
  ];

  const corrColor=(v:number)=>{
    if(v>=0.8) return {bg:'rgba(16,185,129,0.7)',text:'#fff'};
    if(v>=0.6) return {bg:'rgba(16,185,129,0.4)',text:'var(--em)'};
    if(v>=0.4) return {bg:'rgba(245,158,11,0.35)',text:'var(--amber)'};
    if(v>=0.2) return {bg:'rgba(245,158,11,0.15)',text:'var(--amber)'};
    return {bg:'var(--bg3)',text:'var(--t3)'};
  };

  return (
    <div className="obs-fadein">
      <SectionHeader title="AI Intelligence" desc="Pattern detection, correlations & predictive signals"/>

      {/* AI Insights grid */}
      <div className="obs-g2 obs-gmb">
        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--purple),var(--blue))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">🧠 Smart Insights</span>
            <span className="obs-card-badge purple">8 Signals</span>
          </div>
          <div style={{maxHeight:380,overflowY:'auto'}}>
            {INSIGHTS.map((ins,i)=>(
              <div key={i} className={`obs-insight ${ins.type}`} onClick={()=>setActiveInsight(i===activeInsight?null:i)}>
                <div className="obs-insight-icon">{ins.icon}</div>
                <div>
                  <div className="obs-insight-title">{ins.title}</div>
                  <div className="obs-insight-text">{ins.text}</div>
                  <div className="obs-insight-meta">{ins.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Correlation matrix */}
          <div className="obs-card">
            <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--cyan),var(--blue))'}}/>
            <div className="obs-card-hd">
              <span className="obs-card-title">📐 Correlation Matrix</span>
              <span className="obs-card-badge blue">Pearson r</span>
            </div>
            <div className="obs-scroll-x">
              <table style={{borderCollapse:'collapse',minWidth:300}}>
                <thead>
                  <tr>
                    <th style={{width:90,fontSize:9,color:'var(--t3)',padding:'4px 6px',textAlign:'left'}}/>
                    {corrLabels.map(l=>(
                      <th key={l} style={{fontSize:8.5,color:'var(--t3)',padding:'4px 5px',textAlign:'center',fontWeight:700,whiteSpace:'nowrap'}}>{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {corrMatrix.map((row,ri)=>(
                    <tr key={ri}>
                      <td style={{fontSize:9,color:'var(--t2)',padding:'4px 6px',whiteSpace:'nowrap',fontWeight:700}}>{corrLabels[ri]}</td>
                      {row.map((v,ci)=>{
                        const {bg,text}=corrColor(Math.abs(v));
                        return (
                          <td key={ci} style={{padding:'3px 4px',textAlign:'center'}}>
                            <div className="obs-mat-cell" style={{background:bg,color:text,minWidth:36,height:28,borderRadius:5,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700}}>
                              {v.toFixed(2)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seasonal pattern */}
          <div className="obs-card">
            <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--amber),var(--red))'}}/>
            <div className="obs-card-hd">
              <span className="obs-card-title">🌊 Seasonal Giving Index</span>
              <span className="obs-card-badge amber">4-Year Avg</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(12,1fr)',gap:3}}>
              {MONTHLY_DATA.map((d,i)=>{
                const normalized=d.giving/Math.max(...MONTHLY_DATA.map(x=>x.giving));
                const opacity=0.15+normalized*0.85;
                return (
                  <div key={i} style={{textAlign:'center'}}>
                    <div style={{
                      height:60,background:`rgba(16,185,129,${opacity})`,
                      borderRadius:4,marginBottom:4,
                      display:'flex',alignItems:'flex-end',justifyContent:'center',
                      paddingBottom:4,fontSize:8,fontWeight:700,
                      color:normalized>0.6?'#fff':'var(--em)',
                      border:'1px solid var(--border)'
                    }}>
                      {Math.round(normalized*100)}
                    </div>
                    <div style={{fontSize:8,color:'var(--t3)'}}>{d.m}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly giving heatmap */}
      <div className="obs-card obs-gmb">
        <div className="obs-card-stripe"/>
        <div className="obs-card-hd">
          <span className="obs-card-title">📅 52-Week Giving Heatmap</span>
          <div style={{display:'flex',gap:6,alignItems:'center',fontSize:10,color:'var(--t3)'}}>
            <span>Less</span>
            {[0.1,0.3,0.5,0.7,0.9].map(o=>(
              <div key={o} style={{width:12,height:12,borderRadius:2,background:`rgba(16,185,129,${o})`}}/>
            ))}
            <span>More</span>
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          <div style={{display:'flex',flexDirection:'column',gap:3,paddingTop:16}}>
            {['S','M','T','W','T','F','S'].map((d,i)=>(
              <div key={i} style={{height:18,fontSize:8,color:'var(--t3)',lineHeight:'18px'}}>{d}</div>
            ))}
          </div>
          <div style={{flex:1,display:'grid',gridTemplateColumns:'repeat(52,1fr)',gap:2}}>
            {WEEKLY_HEATMAP.map((week,wi)=>
              week.map((val,di)=>{
                const mx=10, opacity=0.1+(val/mx)*0.9;
                return (
                  <div key={`${wi}-${di}`} className="obs-hm-cell"
                    style={{height:18,background:`rgba(16,185,129,${opacity})`,borderRadius:2,
                      border:'1px solid var(--border)',minWidth:0}}
                    title={`Week ${wi+1} ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][di]}: ${val} gifts`}/>
                );
              })
            )}
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:9,color:'var(--t3)'}}>
          {MONTHS.map(m=><span key={m}>{m}</span>)}
        </div>
      </div>

      {/* Top donors table + Giving by zone */}
      <div className="obs-g21">
        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--em),var(--blue))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">👑 Top Donor Intelligence</span>
            <span className="obs-card-badge">Top 8 · {fmtK(TOP_DONORS.reduce((a,d)=>a+d.ytd,0))} YTD</span>
          </div>
          <div className="obs-scroll-x">
            <table className="obs-tbl">
              <thead>
                <tr>
                  <th>#</th><th>Donor / Entity</th><th>Type</th><th>YTD Giving</th><th>% of Total</th><th>MoM</th>
                </tr>
              </thead>
              <tbody>
                {TOP_DONORS.map(d=>(
                  <tr key={d.rank}>
                    <td style={{color:'var(--t3)',fontWeight:700}}>{d.rank}</td>
                    <td style={{fontWeight:700,color:'var(--t1)'}}>{d.name}</td>
                    <td><span className={`obs-pill ${d.type==='Corporate'?'b':d.type==='Foundation'?'p':d.type==='Memorial'?'a':'g'}`}>{d.type}</span></td>
                    <td className="obs-td-em">{fmtK(d.ytd)}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div className="obs-prog-track" style={{width:60}}>
                          <div className="obs-prog-fill g" style={{width:`${Math.min(d.pct*3,100)}%`}}/>
                        </div>
                        <span style={{fontSize:11,color:'var(--t2)'}}>{d.pct}%</span>
                      </div>
                    </td>
                    <td className={d.mom.startsWith('+')?'obs-td-em':'obs-td-red'}>{d.mom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--purple),var(--em))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">📍 Giving by Zone</span>
          </div>
          {[
            {zone:'Lekki',giving:12400000,members:320,color:'var(--em)'},
            {zone:'Victoria Island',giving:9800000,members:210,color:'var(--blue)'},
            {zone:'Ajah',giving:8200000,members:290,color:'var(--purple)'},
            {zone:'Ikoyi',giving:7600000,members:180,color:'var(--cyan)'},
            {zone:'Surulere',giving:6400000,members:260,color:'var(--amber)'},
            {zone:'Yaba',giving:5800000,members:200,color:'var(--red)'},
            {zone:'Mainland',giving:4800000,members:115,color:'var(--em2)'},
          ].map(z=>{
            const max=12400000;
            return (
              <div key={z.zone} className="obs-comp-row">
                <div className="obs-comp-label">{z.zone}</div>
                <div className="obs-comp-track">
                  <div className="obs-comp-fill" style={{width:`${z.giving/max*100}%`,background:z.color}}/>
                </div>
                <div className="obs-comp-val">{fmtK(z.giving)}</div>
              </div>
            );
          })}
          <div className="obs-div"/>
          <div style={{fontSize:11,color:'var(--t3)',textAlign:'center'}}>
            Per-capita giving highest in: <span style={{color:'var(--em)',fontWeight:700}}>Victoria Island (₦46,667/member)</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// ─══════════════════════════════════════════════════════════════════════════════
//  SECTION: FORECAST
// ═══════════════════════════════════════════════════════════════════════════════
const ForecastSection = memo(() => {
  const [scenario,setScenario]=useState<'optimistic'|'base'|'pessimistic'>('base');
  const scenarioColors:{[k:string]:string}={optimistic:'var(--em)',base:'var(--blue)',pessimistic:'var(--red)'};

  const fcData=FORECAST_SCENARIOS[scenario];
  const fcMax=Math.max(...Object.values(FORECAST_SCENARIOS).flat());
  const fcMin=Math.min(...Object.values(FORECAST_SCENARIOS).flat());
  const totalForecast=fcData.reduce((a,v)=>a+v,0);

  return (
    <div className="obs-fadein">
      <SectionHeader title="Forecast Engine"
        desc="12-month projections, scenario modeling & goal tracking"
        right={
          <div style={{display:'flex',gap:6}}>
            {(['optimistic','base','pessimistic'] as const).map(s=>(
              <button key={s} className={`obs-scenario-btn${scenario===s?' act':''}`}
                onClick={()=>setScenario(s)} style={{
                  color:scenario===s?scenarioColors[s]:'var(--t3)',
                  borderColor:scenario===s?scenarioColors[s]:'var(--b2)'
                }}>
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
          </div>
        }/>

      {/* Forecast KPIs */}
      <div className="obs-kpi-grid" style={{marginBottom:14}}>
        {[
          {label:'Projected Annual Income',val:fmtK(totalForecast),sub:'12-month forecast',icon:'📈',color:scenarioColors[scenario]},
          {label:'vs Last Year',val:'+14.2%',sub:'Year-over-year growth',icon:'📊',up:true,color:'var(--em)'},
          {label:'Projected Surplus',val:fmtK(totalForecast*0.22),sub:'22% surplus margin',icon:'💹',up:true,color:'var(--purple)'},
          {label:'Break-Even Month',val:'Mar 2025',sub:'Revenue covers all costs',icon:'⚖️',color:'var(--cyan)'},
        ].map((k,i)=>(
          <KPICard key={i} label={k.label} value={k.val} sub={k.sub} icon={k.icon} color={k.color} up={k.up}/>
        ))}
      </div>

      {/* Forecast chart */}
      <div className="obs-card obs-gmb">
        <div className="obs-card-stripe" style={{background:`linear-gradient(90deg,${scenarioColors[scenario]},${scenarioColors[scenario]}88)`}}/>
        <div className="obs-card-hd">
          <span className="obs-card-title">📈 12-Month Income Projection — {scenario.charAt(0).toUpperCase()+scenario.slice(1)} Scenario</span>
          <span className="obs-card-badge" style={{
            background:`rgba(${scenario==='optimistic'?'16,185,129':scenario==='base'?'59,130,246':'244,63,94'},.12)`,
            color:scenarioColors[scenario],borderColor:`${scenarioColors[scenario]}44`
          }}>{fmtK(totalForecast)} Total</span>
        </div>
        <div style={{position:'relative'}}>
          <svg viewBox="0 0 600 160" style={{width:'100%',height:'auto',display:'block'}}>
            <defs>
              <linearGradient id="fcg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={scenarioColors[scenario]} stopOpacity="0.3"/>
                <stop offset="100%" stopColor={scenarioColors[scenario]} stopOpacity="0"/>
              </linearGradient>
            </defs>
            {/* All scenario lines faded */}
            {(['optimistic','base','pessimistic'] as const).filter(s=>s!==scenario).map(s=>{
              const pts=FORECAST_SCENARIOS[s].map((v,i)=>`${40+i*(560/11)},${140-((v-fcMin)/(fcMax-fcMin))*120}`).join(' ');
              return <polyline key={s} fill="none" stroke={scenarioColors[s]} strokeWidth="1" strokeDasharray="4,4" opacity="0.25" points={pts}/>;
            })}
            {/* Active area */}
            {(()=>{
              const pts=fcData.map((v,i)=>`${40+i*(560/11)},${140-((v-fcMin)/(fcMax-fcMin))*120}`);
              const area=`M40,140 L${pts.join(' L')} L${40+11*(560/11)},140 Z`;
              const line=pts.join(' ');
              return (
                <>
                  <path d={area} fill="url(#fcg)"/>
                  <polyline fill="none" stroke={scenarioColors[scenario]} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={line}/>
                  {fcData.map((v,i)=>(
                    <circle key={i} cx={40+i*(560/11)} cy={140-((v-fcMin)/(fcMax-fcMin))*120} r="3.5" fill={scenarioColors[scenario]}/>
                  ))}
                </>
              );
            })()}
            {/* Grid */}
            {[0,0.25,0.5,0.75,1].map(t=>(
              <line key={t} x1={40} y1={140-t*120} x2={600} y2={140-t*120} stroke="var(--b2)" strokeWidth="0.8" strokeDasharray="3,4"/>
            ))}
            {/* X labels */}
            {MONTHS.map((m,i)=>(
              <text key={i} x={40+i*(560/11)} y={158} textAnchor="middle" style={{fontSize:9,fill:'var(--t3)',fontFamily:'JetBrains Mono'}}>
                {m}
              </text>
            ))}
            {/* Y labels */}
            {[fcMin,fcMin+(fcMax-fcMin)*0.5,fcMax].map((v,i)=>(
              <text key={i} x={36} y={140-(i*0.5)*120+3} textAnchor="end" style={{fontSize:8,fill:'var(--t3)',fontFamily:'JetBrains Mono'}}>
                {fmtK(v)}
              </text>
            ))}
          </svg>
        </div>
        <div style={{display:'flex',gap:16,justifyContent:'center',marginTop:8,flexWrap:'wrap'}}>
          {(['optimistic','base','pessimistic'] as const).map(s=>(
            <div key={s} style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:s===scenario?'var(--t1)':'var(--t3)'}}>
              <div style={{width:16,height:2,background:scenarioColors[s],borderRadius:1,opacity:s===scenario?1:0.3}}/>
              <span>{s.charAt(0).toUpperCase()+s.slice(1)}: {fmtK(FORECAST_SCENARIOS[s].reduce((a,v)=>a+v,0))}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Goals + Calendar */}
      <div className="obs-g21">
        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--em),var(--em3))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">🎯 Goal Tracker</span>
            <span className="obs-card-badge">5 Active Goals</span>
          </div>
          {GOALS.map(g=>{
            const pct=Math.round(g.raised/g.target*100);
            return (
              <div key={g.name} className="obs-goal">
                <div className="obs-goal-hd">
                  <div className="obs-goal-name">{g.icon} {g.name}</div>
                  <div className="obs-goal-pct">{pct}%</div>
                </div>
                <div className="obs-prog-track" style={{height:8,marginBottom:6}}>
                  <div className="obs-prog-fill g" style={{width:`${pct}%`}}/>
                </div>
                <div className="obs-goal-meta">
                  <span>{fmtK(g.raised)} of {fmtK(g.target)}</span>
                  <span>Deadline: {g.deadline}</span>
                  <span style={{color:'var(--em)',fontWeight:700}}>+{fmtK(g.target-g.raised)} needed</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="obs-card">
            <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--amber),var(--red))'}}/>
            <div className="obs-card-hd">
              <span className="obs-card-title">📆 Financial Calendar</span>
              <span className="obs-card-badge amber">6 Upcoming</span>
            </div>
            {UPCOMING_EVENTS.map((e,i)=>(
              <div key={i} className={`obs-cal-event ${e.type}`}>
                <div className="obs-cal-title">{e.title}</div>
                <div className="obs-cal-meta">{e.date} · {e.days} days away {e.amount&&`· ${e.amount}`}</div>
              </div>
            ))}
          </div>

          <div className="obs-card">
            <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--blue),var(--purple))'}}/>
            <div className="obs-card-hd">
              <span className="obs-card-title">💧 Cash Runway Model</span>
            </div>
            <div style={{textAlign:'center',padding:'8px 0'}}>
              <Gauge value={32} max={100} color="var(--blue)" size={130}/>
              <div style={{marginTop:-10}}>
                <div style={{fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:800,color:'var(--t1)'}}>3.2</div>
                <div style={{fontSize:11,color:'var(--t3)'}}>Months Cash Runway</div>
              </div>
            </div>
            <div className="obs-div"/>
            {[
              {label:'Current Cash',val:'₦12.8M'},
              {label:'Monthly Burn',val:'₦3.9M'},
              {label:'Target Runway',val:'6.0 months'},
              {label:'Cash Needed',val:'₦10.6M'},
            ].map(s=>(
              <div key={s.label} className="obs-stat-row">
                <span className="obs-stat-label">{s.label}</span>
                <span className="obs-stat-val">{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

// ─══════════════════════════════════════════════════════════════════════════════
//  SECTION: ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════
const AnalyticsSection = memo(() => {
  const [cohortMetric,setCohortMetric]=useState<'retention'|'giving'>('retention');
  const gradMap=['rgba(16,185,129,','rgba(52,211,153,','rgba(110,231,183,'];

  return (
    <div className="obs-fadein">
      <SectionHeader title="Deep Analytics"
        desc="Cohort analysis, benchmarks, YoY comparison & ministry effectiveness"/>

      {/* YoY comparison */}
      <div className="obs-card obs-gmb">
        <div className="obs-card-stripe"/>
        <div className="obs-card-hd">
          <span className="obs-card-title">📊 Year-over-Year Giving Comparison</span>
          <div style={{display:'flex',gap:12,fontSize:10,alignItems:'center'}}>
            {[{y:'2023',c:'var(--t3)'},{y:'2024',c:'var(--blue)'},{y:'2025',c:'var(--em)'}].map(l=>(
              <span key={l.y} style={{display:'flex',alignItems:'center',gap:4,color:'var(--t3)'}}>
                <span style={{width:12,height:3,background:l.c,borderRadius:2,display:'inline-block'}}/>
                {l.y}
              </span>
            ))}
          </div>
        </div>
        <svg viewBox="0 0 600 160" style={{width:'100%',height:'auto',display:'block'}}>
          {[
            {year:'2023',data:[1600000,1700000,1500000,2200000,1900000,1800000,1600000,2000000,2500000,2700000,2400000,3600000],color:'var(--t3)'},
            {year:'2024',data:[1900000,2000000,1800000,2600000,2300000,2200000,2000000,2500000,3100000,3400000,2900000,4200000],color:'var(--blue)'},
            {year:'2025',data:[2100000,2400000,2050000,3100000,2900000,2500000,2200000,2700000,3400000,3800000,3200000,5100000],color:'var(--em)'},
          ].map(({data,color},si)=>{
            const mx=6000000;
            const pts=data.map((v,i)=>`${40+i*(520/11)},${130-((v)/mx)*110}`).join(' ');
            return (
              <g key={si}>
                <polyline fill="none" stroke={color} strokeWidth={si===2?2.2:1.4} strokeLinejoin="round" opacity={si===2?1:si===1?0.6:0.35} points={pts}/>
                {si===2&&data.map((v,i)=>(
                  <circle key={i} cx={40+i*(520/11)} cy={130-((v)/mx)*110} r="3" fill={color}/>
                ))}
              </g>
            );
          })}
          {[0,0.25,0.5,0.75,1].map(t=>(
            <line key={t} x1={40} y1={130-t*110} x2={580} y2={130-t*110} stroke="var(--b2)" strokeWidth="0.8" strokeDasharray="3,4"/>
          ))}
          {MONTHS.map((m,i)=>(
            <text key={i} x={40+i*(520/11)} y={152} textAnchor="middle" style={{fontSize:9,fill:'var(--t3)',fontFamily:'JetBrains Mono'}}>
              {m}
            </text>
          ))}
        </svg>
      </div>

      {/* Cohort + Benchmark */}
      <div className="obs-g21">
        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--purple),var(--pink,#ec4899))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">🔬 Member Giving Cohort Retention</span>
            <div className="obs-tab-group">
              <button className={`obs-tab-btn${cohortMetric==='retention'?' act':''}`} onClick={()=>setCohortMetric('retention')}>Retention %</button>
              <button className={`obs-tab-btn${cohortMetric==='giving'?' act':''}`} onClick={()=>setCohortMetric('giving')}>Giving</button>
            </div>
          </div>
          <div className="obs-scroll-x">
            <table style={{borderCollapse:'collapse',minWidth:460}}>
              <thead>
                <tr>
                  <th style={{fontSize:9,color:'var(--t3)',padding:'4px 8px',textAlign:'left',fontWeight:700}}>Cohort</th>
                  {MONTHS_FULL.slice(0,12).map(m=>(
                    <th key={m} style={{fontSize:8,color:'var(--t3)',padding:'3px 3px',textAlign:'center',fontWeight:700}}>{m.slice(0,3)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COHORT_DATA.map((row,ri)=>(
                  <tr key={row.year}>
                    <td style={{fontSize:11,fontWeight:700,color:'var(--t1)',padding:'3px 8px',whiteSpace:'nowrap'}}>{row.year}</td>
                    {MONTHS.map(m=>{
                      const val=(row as any)[m]||0;
                      const opacity=0.1+(val/100)*0.9;
                      return (
                        <td key={m} style={{padding:'2px 2px',textAlign:'center'}}>
                          <div className="obs-cohort-cell"
                            style={{background:`rgba(16,185,129,${opacity})`,color:val>70?'#fff':'var(--em)',minWidth:30,height:26,display:'flex',alignItems:'center',justifyContent:'center'}}>
                            {val}%
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{fontSize:10,color:'var(--t3)',marginTop:8,textAlign:'center'}}>
            Darker green = higher retention. 2024 cohort shows best 12-month retention (83%) in 5 years.
          </div>
        </div>

        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--cyan),var(--em))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">🏆 Peer Benchmark</span>
            <span className="obs-card-badge">vs Similar Churches</span>
          </div>
          {BENCHMARK_DATA.map(b=>{
            const churchWider=b.unit==='%'||b.unit==='mo';
            const churchBetter=(b.metric.includes('Admin'))?b.church<b.peer:b.church>b.peer;
            const mx=Math.max(b.church,b.peer)*1.2;
            return (
              <div key={b.metric} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:5}}>
                  <span style={{color:'var(--t2)'}}>{b.metric}</span>
                  <span style={{color:churchBetter?'var(--em)':'var(--amber)',fontWeight:700}}>
                    {churchBetter?'▲ Above peer':'▼ Below peer'}
                  </span>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <span style={{fontSize:10,color:'var(--t3)',width:32}}>Ours</span>
                  <div className="obs-prog-track" style={{flex:1}}>
                    <div className="obs-prog-fill g" style={{width:`${(b.church/mx)*100}%`}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--em)',width:60,textAlign:'right'}}>
                    {b.unit==='₦'?`₦${b.church.toLocaleString()}`:b.church}{b.unit!=='₦'?b.unit:''}
                  </span>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center',marginTop:3}}>
                  <span style={{fontSize:10,color:'var(--t3)',width:32}}>Peer</span>
                  <div className="obs-prog-track" style={{flex:1}}>
                    <div className="obs-prog-fill b" style={{width:`${(b.peer/mx)*100}%`}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--blue)',width:60,textAlign:'right'}}>
                    {b.unit==='₦'?`₦${b.peer.toLocaleString()}`:b.peer}{b.unit!=='₦'?b.unit:''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ministry ROI + Revenue concentration */}
      <div className="obs-g2">
        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--em),var(--amber))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">⚡ Ministry ROI Matrix</span>
            <span className="obs-card-badge amber">Cost Per Impact</span>
          </div>
          <table className="obs-tbl">
            <thead>
              <tr>
                <th>Ministry</th><th>Budget</th><th>Lives Reached</th><th>Cost/Person</th><th>ROI Score</th>
              </tr>
            </thead>
            <tbody>
              {[
                {name:'Outreach & Missions',budget:2210000,reach:3800,roi:92},
                {name:'Children Ministry',budget:1380000,reach:420,roi:78},
                {name:'Youth Ministry',budget:870000,reach:380,roi:85},
                {name:'Food Bank Program',budget:640000,reach:1200,roi:96},
                {name:'Counseling Center',budget:320000,reach:180,roi:88},
                {name:'Online Ministry',budget:420000,reach:12000,roi:99},
                {name:'Worship & Music',budget:1650000,reach:4500,roi:71},
              ].map(m=>{
                const cpp=Math.round(m.budget/m.reach);
                return (
                  <tr key={m.name}>
                    <td style={{fontWeight:600,color:'var(--t1)'}}>{m.name}</td>
                    <td>{fmtK(m.budget)}</td>
                    <td style={{color:'var(--blue)',fontWeight:600}}>{m.reach.toLocaleString()}</td>
                    <td style={{color:'var(--amber)',fontWeight:600}}>₦{cpp.toLocaleString()}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div className="obs-prog-track" style={{width:50}}>
                          <div className="obs-prog-fill g" style={{width:`${m.roi}%`}}/>
                        </div>
                        <span className="obs-td-em">{m.roi}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--red),var(--amber))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">🎪 Revenue Concentration</span>
            <span className="obs-card-badge red">Concentration Risk</span>
          </div>
          <div style={{textAlign:'center',padding:'8px 0 4px'}}>
            <Donut segments={[
              {color:'var(--red)',pct:15.4},
              {color:'var(--amber)',pct:9.4},
              {color:'var(--purple)',pct:6.9},
              {color:'var(--blue)',pct:12.7},
              {color:'var(--em)',pct:55.6},
            ]} r={55} stroke={14}/>
          </div>
          {[
            {label:'Top 1 Donor',pct:15.4,color:'var(--red)'},
            {label:'Top 2–3 Donors',pct:16.3,color:'var(--amber)'},
            {label:'Top 4–8 Donors',pct:12.7,color:'var(--purple)'},
            {label:'Corporate Giving',pct:0,color:'var(--blue)',val:'(included above)'},
            {label:'Congregational (rest)',pct:55.6,color:'var(--em)'},
          ].filter(s=>s.pct>0).map(s=>(
            <div key={s.label} className="obs-legend-item">
              <div className="obs-legend-dot" style={{background:s.color}}/>
              <span className="obs-legend-label">{s.label}</span>
              <span className="obs-legend-val">{s.pct}%</span>
            </div>
          ))}
          <div style={{background:'rgba(244,63,94,.08)',border:'1px solid rgba(244,63,94,.25)',borderRadius:8,padding:'8px 10px',marginTop:8,fontSize:11,color:'var(--red)'}}>
            ⚠️ Top 3 donors = 28.5% of income. Best practice: &lt;15%. Diversification recommended.
          </div>
        </div>
      </div>
    </div>
  );
});

// ─══════════════════════════════════════════════════════════════════════════════
//  SECTION: PULSE (LIVE)
// ═══════════════════════════════════════════════════════════════════════════════
const PulseSection = memo(() => {
  const [todayTotal,setTodayTotal]=useState(4280000);
  const [velocity,setVelocity]=useState(12);
  useEffect(()=>{
    const id=setInterval(()=>{
      setTodayTotal(p=>p+(Math.random()>0.7?Math.round(Math.random()*80000):0));
      setVelocity(Math.round(8+Math.random()*10));
    },3000);
    return()=>clearInterval(id);
  },[]);

  const hourlyGiving=[120,80,60,40,30,20,15,25,180,820,1240,960,640,380,290,220,410,680,920,1100,840,600,380,240];
  const maxHourly=Math.max(...hourlyGiving);

  return (
    <div className="obs-fadein">
      <SectionHeader title="Live Pulse"
        desc="Real-time activity stream, giving velocity & live metrics"
        right={<div className="obs-live-chip"><div className="obs-live-dot"/><span>LIVE</span></div>}/>

      {/* Live KPIs */}
      <div className="obs-kpi-grid">
        <KPICard label="Today's Giving" value={fmtK(todayTotal)} sub="Live counter" up={true} icon="⚡" color="var(--em)"/>
        <KPICard label="Gifts/Hour" value={`${velocity}`} sub="Current velocity" up={velocity>10} icon="🔥" color="var(--amber)"/>
        <KPICard label="This Week" value="₦18.4M" sub="+12% vs last week" up={true} icon="📅" color="var(--blue)"/>
        <KPICard label="Month-to-Date" value="₦28.7M" sub="On track for target" up={true} icon="📆" color="var(--purple)"/>
      </div>

      {/* Hourly giving chart + Activity feed */}
      <div className="obs-g21">
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="obs-card">
            <div className="obs-card-stripe"/>
            <div className="obs-card-hd">
              <span className="obs-card-title">⚡ Hourly Giving Distribution — Today</span>
              <span className="obs-card-badge">{fmtK(hourlyGiving.reduce((a,v)=>a+v*1000,0))}</span>
            </div>
            <div style={{display:'flex',gap:2,height:80,alignItems:'flex-end',padding:'0 0 0 4px'}}>
              {hourlyGiving.map((v,i)=>(
                <div key={i} title={`${i}:00 — ₦${(v*1000).toLocaleString()}`}
                  style={{
                    flex:1,background:`rgba(16,185,129,${0.2+(v/maxHourly)*0.8})`,
                    borderRadius:'3px 3px 0 0',height:`${(v/maxHourly)*100}%`,
                    transition:'height .4s ease',cursor:'pointer',
                    border:'1px solid rgba(16,185,129,.2)',borderBottom:'none',
                    minWidth:0
                  }}/>
              ))}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:8,color:'var(--t3)',marginTop:4,padding:'0 4px'}}>
              <span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span><span>11PM</span>
            </div>
          </div>

          {/* Segment giving pie live */}
          <div className="obs-card">
            <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--cyan),var(--blue))'}}/>
            <div className="obs-card-hd">
              <span className="obs-card-title">💳 Channel Split — Live</span>
            </div>
            <div style={{display:'flex',gap:16,alignItems:'center'}}>
              <Donut segments={[
                {color:'var(--em)',pct:42},
                {color:'var(--blue)',pct:31},
                {color:'var(--amber)',pct:15},
                {color:'var(--purple)',pct:12},
              ]} r={40} stroke={11}/>
              <div style={{flex:1}}>
                {[
                  {label:'Mobile/USSD',pct:42,color:'var(--em)'},
                  {label:'Online Banking',pct:31,color:'var(--blue)'},
                  {label:'Cash',pct:15,color:'var(--amber)'},
                  {label:'POS/Other',pct:12,color:'var(--purple)'},
                ].map(c=>(
                  <div key={c.label} className="obs-legend-item">
                    <div className="obs-legend-dot" style={{background:c.color}}/>
                    <span className="obs-legend-label">{c.label}</span>
                    <span className="obs-legend-pct">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--em),var(--purple))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">🔴 Live Activity Stream</span>
            <span className="obs-card-badge">Real-time</span>
          </div>
          <div style={{maxHeight:420,overflowY:'auto'}}>
            {ACTIVITY_FEED.map((item,i)=>(
              <div key={i} className="obs-feed-item">
                <div className="obs-feed-icon"
                  style={{background:item.type==='giving'?'rgba(16,185,129,.15)':item.type==='expense'?'rgba(244,63,94,.15)':'var(--bg2)'}}>
                  {item.icon}
                </div>
                <div style={{flex:1}}>
                  <div className="obs-feed-text">{item.text}</div>
                  <div className="obs-feed-time">{item.time}</div>
                </div>
                {item.amount&&(
                  <div className="obs-feed-amount" style={{color:item.amount.startsWith('-')?'var(--red)':'var(--em)'}}>
                    {item.amount}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Velocity gauge + Weekly trend */}
      <div className="obs-g2">
        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--amber),var(--em))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">🌡️ Giving Velocity Gauge</span>
          </div>
          <div style={{display:'flex',gap:16,alignItems:'center'}}>
            <div style={{textAlign:'center'}}>
              <Gauge value={velocity} max={25} color={velocity>18?'var(--em)':velocity>12?'var(--amber)':'var(--red)'} size={140}/>
              <div style={{marginTop:-8}}>
                <div style={{fontFamily:'Syne,sans-serif',fontSize:32,fontWeight:800,color:'var(--t1)'}}>{velocity}</div>
                <div style={{fontSize:10,color:'var(--t3)'}}>Gifts per hour</div>
              </div>
            </div>
            <div style={{flex:1}}>
              {[
                {label:'Today vs Yesterday',val:'+34%',up:true},
                {label:'Today vs Avg Sunday',val:'+12%',up:true},
                {label:'Peak hour today',val:'10 AM',sub:'₦920K in 1hr'},
                {label:'Largest single gift',val:'₦2.5M',sub:'Folake Emmanuel'},
                {label:'Avg gift size',val:'₦28,400',sub:'↑ from ₦22,100'},
                {label:'Total givers today',val:'151 people',sub:''},
              ].map(s=>(
                <div key={s.label} className="obs-stat-row">
                  <div>
                    <div className="obs-stat-label">{s.label}</div>
                    {s.sub&&<div style={{fontSize:10,color:'var(--t3)'}}>{s.sub}</div>}
                  </div>
                  <div className="obs-stat-val" style={{color:s.up===true?'var(--em)':s.up===false?'var(--red)':'var(--t1)'}}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--blue),var(--cyan))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">📲 Digital Adoption Trend</span>
            <span className="obs-card-badge blue">12-Month</span>
          </div>
          <AreaChart
            data={MONTHLY_DATA.map((d,i)=>({...d,digital:Math.round(40+i*2.3),mobile:Math.round(20+i*3.2), m: i}))}
            keys={['digital','mobile']}
            colors={['var(--blue)','var(--em)']}
            height={140}/>
          <div className="obs-div"/>
          <div className="obs-g2" style={{margin:0,gap:8}}>
            {[
              {label:'Digital Giving %',val:'68%',color:'var(--blue)'},
              {label:'Mobile Giving %',val:'42%',color:'var(--em)'},
              {label:'App Downloads',val:'2,840',color:'var(--purple)'},
              {label:'Repeat Digital Givers',val:'74%',color:'var(--cyan)'},
            ].map(s=>(
              <div key={s.label} style={{background:'var(--bg2)',borderRadius:8,padding:'7px 9px',border:'1px solid var(--b2)'}}>
                <div style={{fontSize:9,color:'var(--t3)',marginBottom:3}}>{s.label}</div>
                <div style={{fontSize:16,fontWeight:800,color:s.color,fontFamily:'Syne,sans-serif'}}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

// ─══════════════════════════════════════════════════════════════════════════════
//  SECTION: RISK
// ═══════════════════════════════════════════════════════════════════════════════
const RiskSection = memo(() => {
  const [selRisk,setSelRisk]=useState<typeof RISK_MATRIX[0]|null>(null);

  const overallScore = Math.round(RADAR_SCORES.reduce((a,s)=>a+s.score,0)/RADAR_SCORES.length);
  const scoreColor = overallScore>=80?'var(--em)':overallScore>=60?'var(--amber)':'var(--red)';

  const matrixGrid:string[][] = [
    ['L','L','M','M','H'],
    ['L','L','M','H','H'],
    ['L','M','M','H','C'],
    ['M','M','H','H','C'],
    ['M','H','H','C','C'],
  ];
  const matrixBg=(l:string)=>l==='C'?'rgba(244,63,94,.28)':l==='H'?'rgba(244,63,94,.13)':l==='M'?'rgba(245,158,11,.13)':'rgba(16,185,129,.13)';
  const matrixColor=(l:string)=>l==='C'||l==='H'?'var(--red)':l==='M'?'var(--amber)':'var(--em)';

  return (
    <div className="obs-fadein">
      <SectionHeader title="Risk Observatory"
        desc="Risk matrix, health score, compliance tracking & control assessment"/>

      {/* Risk KPIs */}
      <div className="obs-kpi-grid">
        <KPICard label="Overall Health Score" value={`${overallScore}/100`} sub="Multi-dimensional score" icon="🛡️" color={scoreColor}/>
        <KPICard label="Critical Risks" value="1" sub="Donor concentration" up={false} icon="🚨" color="var(--red)"/>
        <KPICard label="High Risks" value="2" sub="Cash flow + Cyber" up={false} icon="⚠️" color="var(--amber)"/>
        <KPICard label="Compliance Score" value="94%" sub="+2% vs last quarter" up={true} icon="✅" color="var(--em)"/>
      </div>

      <div className="obs-g21">
        {/* Risk matrix */}
        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--red),var(--amber))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">🗺️ Risk Matrix — Likelihood × Impact</span>
          </div>
          <div style={{display:'flex',gap:14}}>
            <div style={{flex:1}}>
              <div style={{marginBottom:8,fontSize:10,color:'var(--t3)',textAlign:'center'}}>← Likelihood →</div>
              <div style={{display:'grid',gridTemplateColumns:'24px repeat(5,1fr)',gap:3}}>
                <div/>
                {['Very Low','Low','Med','High','Very High'].map(l=>(
                  <div key={l} style={{textAlign:'center',fontSize:8,color:'var(--t3)',paddingBottom:4}}>{l}</div>
                ))}
                {[...matrixGrid].reverse().map((row,ri)=>[
                  <div key={`lbl-${ri}`} style={{
                    fontSize:8,color:'var(--t3)',display:'flex',alignItems:'center',justifyContent:'center',
                    writingMode:'vertical-rl',transform:'rotate(180deg)',height:'100%',
                  }}>{['V.Low','Low','Med','High','V.High'][ri]}</div>,
                  ...row.map((cell,ci)=>(
                    <div key={`${ri}-${ci}`} className="obs-risk-cell"
                      style={{background:matrixBg(cell),color:matrixColor(cell),border:`1px solid ${matrixColor(cell)}44`}}>
                      {cell}
                    </div>
                  ))
                ])}
              </div>
            </div>
            <div style={{width:200}}>
              <div style={{fontSize:10,fontWeight:700,color:'var(--t2)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.08em'}}>Active Risks</div>
              {RISK_MATRIX.slice(0,6).map((r,i)=>(
                <div key={i} className="obs-alert-item" style={{padding:'6px 0',borderBottom:'1px solid var(--b2)',cursor:'pointer'}}
                  onClick={()=>setSelRisk(r===selRisk?null:r)}>
                  <div className="obs-alert-dot" style={{background:matrixColor(r.level)}}/>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--t1)'}}>{r.risk}</div>
                    <div style={{fontSize:10,color:'var(--t3)'}}>{r.owner}</div>
                  </div>
                  <span className={`obs-pill ${r.level==='C'||r.level==='H'?'r':r.level==='M'?'a':'g'}`} style={{marginLeft:'auto'}}>{r.level}</span>
                </div>
              ))}
            </div>
          </div>
          {selRisk&&(
            <div style={{marginTop:12,background:'var(--bg2)',borderRadius:8,padding:'10px 12px',border:'1px solid var(--b2)',fontSize:12}}>
              <div style={{fontWeight:700,color:'var(--t1)',marginBottom:4}}>{selRisk.risk}</div>
              <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                <span style={{color:'var(--t3)'}}>Owner: <span style={{color:'var(--t1)'}}>{selRisk.owner}</span></span>
                <span style={{color:'var(--t3)'}}>Level: <span style={{color:matrixColor(selRisk.level)}}>{selRisk.level==='C'?'Critical':selRisk.level==='H'?'High':selRisk.level==='M'?'Medium':'Low'}</span></span>
                <span style={{color:'var(--t3)'}}>Likelihood: <span style={{color:'var(--t1)'}}>{selRisk.likelihood}/5</span></span>
                <span style={{color:'var(--t3)'}}>Impact: <span style={{color:'var(--t1)'}}>{selRisk.impact}/5</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Radar + Compliance */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="obs-card">
            <div className="obs-card-stripe" style={{background:`linear-gradient(90deg,${scoreColor},var(--blue))`}}/>
            <div className="obs-card-hd">
              <span className="obs-card-title">🕸️ Financial Health Radar</span>
              <span className="obs-card-badge" style={{color:scoreColor,borderColor:scoreColor,background:`${scoreColor}18`}}>{overallScore}/100</span>
            </div>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <Radar scores={RADAR_SCORES} size={180}/>
              <div style={{flex:1}}>
                {RADAR_SCORES.map(s=>(
                  <div key={s.label} style={{marginBottom:6}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
                      <span style={{color:'var(--t2)'}}>{s.label}</span>
                      <span style={{fontWeight:700,color:s.score>=80?'var(--em)':s.score>=60?'var(--amber)':'var(--red)'}}>{s.score}</span>
                    </div>
                    <div className="obs-prog-track">
                      <div className="obs-prog-fill" style={{
                        width:`${s.score}%`,
                        background:s.score>=80?'linear-gradient(90deg,var(--em),var(--em2))':s.score>=60?'linear-gradient(90deg,var(--amber),#fcd34d)':'linear-gradient(90deg,var(--red),#fb7185)'
                      }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="obs-card">
            <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--purple),var(--blue))'}}/>
            <div className="obs-card-hd">
              <span className="obs-card-title">✅ Compliance Scorecard</span>
              <span className="obs-card-badge purple">Q1 2025</span>
            </div>
            {[
              {item:'Annual Accounts Filed',status:'Done',icon:'✅'},
              {item:'CAMA Compliance',status:'Done',icon:'✅'},
              {item:'FIRS Tax Returns',status:'Done',icon:'✅'},
              {item:'Employee PAYE Remittance',status:'Current',icon:'✅'},
              {item:'Pension Contributions',status:'Current',icon:'✅'},
              {item:'VAT Filing',status:'Due Apr 21',icon:'⚠️'},
              {item:'NSITF Registration',status:'Pending',icon:'🔴'},
              {item:'Annual Returns (CAC)',status:'Due Jun',icon:'⚠️'},
            ].map(c=>(
              <div key={c.item} className="obs-stat-row">
                <span className="obs-stat-label">{c.icon} {c.item}</span>
                <span className="obs-stat-val" style={{
                  fontSize:11,
                  color:c.status==='Done'||c.status==='Current'?'var(--em)':c.status==='Pending'?'var(--red)':'var(--amber)'
                }}>{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Liquidity analysis */}
      <div className="obs-g2">
        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--blue),var(--cyan))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">💧 Liquidity Analysis</span>
            <span className="obs-card-badge blue">Stress Test</span>
          </div>
          {[
            {scenario:'Base Case',runway:'3.2 months',cash:'₦12.8M',color:'var(--em)'},
            {scenario:'10% Income Drop',runway:'2.8 months',cash:'₦10.9M',color:'var(--amber)'},
            {scenario:'30% Income Drop',runway:'1.8 months',cash:'₦7.0M',color:'var(--amber)'},
            {scenario:'50% Income Drop',runway:'0.7 months',cash:'₦2.7M',color:'var(--red)'},
            {scenario:'Major Emergency (₦10M)',runway:'0.7 months',cash:'₦2.8M',color:'var(--red)'},
          ].map(s=>(
            <div key={s.scenario} className="obs-stat-row">
              <div>
                <div className="obs-stat-label">{s.scenario}</div>
              </div>
              <div style={{display:'flex',gap:16}}>
                <span style={{fontSize:11,color:'var(--t3)'}}>{s.cash}</span>
                <span style={{fontSize:12,fontWeight:700,color:s.color}}>{s.runway}</span>
              </div>
            </div>
          ))}
          <div style={{background:'rgba(59,130,246,.08)',border:'1px solid rgba(59,130,246,.25)',borderRadius:8,padding:'8px 10px',marginTop:8,fontSize:11,color:'var(--blue)'}}>
            💡 Recommendation: Increase reserve to 6 months (₦23.4M needed). Current gap: ₦10.6M. Achievable in 6–9 months with systematic allocation.
          </div>
        </div>

        <div className="obs-card">
          <div className="obs-card-stripe" style={{background:'linear-gradient(90deg,var(--em),var(--cyan))'}}/>
          <div className="obs-card-hd">
            <span className="obs-card-title">🔐 Internal Control Assessment</span>
          </div>
          <table className="obs-tbl">
            <thead>
              <tr><th>Control Area</th><th>Status</th><th>Score</th></tr>
            </thead>
            <tbody>
              {[
                {area:'Dual Authorization',status:'Active',score:95},
                {area:'Segregation of Duties',status:'Active',score:88},
                {area:'Budget Approval Flow',status:'Active',score:92},
                {area:'Vendor Verification',status:'Partial',score:74},
                {area:'Digital Access Controls',status:'Active',score:90},
                {area:'Monthly Reconciliation',status:'Active',score:96},
                {area:'Petty Cash Controls',status:'Weak',score:55},
                {area:'Fraud Monitoring',status:'Active',score:82},
              ].map(c=>(
                <tr key={c.area}>
                  <td style={{fontWeight:600,color:'var(--t1)'}}>{c.area}</td>
                  <td><span className={`obs-pill ${c.status==='Active'?'g':c.status==='Partial'?'a':'r'}`}>{c.status}</span></td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div className="obs-prog-track" style={{width:50}}>
                        <div className="obs-prog-fill" style={{
                          width:`${c.score}%`,
                          background:c.score>=85?'linear-gradient(90deg,var(--em),var(--em2))':c.score>=65?'linear-gradient(90deg,var(--amber),#fcd34d)':'linear-gradient(90deg,var(--red),#fb7185)'
                        }}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:700,color:c.score>=85?'var(--em)':c.score>=65?'var(--amber)':'var(--red)'}}>{c.score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

// ─══════════════════════════════════════════════════════════════════════════════
//  TICKER DATA
// ═══════════════════════════════════════════════════════════════════════════════
// Ticker items:
const TICKER_ITEMS_REAL = [
  {label:'Net Assets',val:'₦55.2M',change:'+4.2%',up:true},
  {label:'YTD Giving',val:'₦55.2M',change:'+18.3%',up:true},
  {label:'Cash Balance',val:'₦12.8M',change:'+1.1%',up:true},
  {label:'Members',val:'1,575',change:'+35',up:true},
  {label:'Monthly Burn',val:'₦3.9M',change:'+8.4%',up:false},
  {label:'Building Fund',val:'40.5%',change:'of goal',up:true},
  {label:'Cash Runway',val:'3.2 mo',change:'-0.4',up:false},
  {label:'Investment Port.',val:'₦18.4M',change:'+2.1%',up:true},
  {label:"Today's Giving",val:'₦4.28M',change:'Live',up:true},
  {label:'Compliance',val:'94%',change:'+2%',up:true},
  {label:'Avg Gift',val:'₦35,047',change:'+6.2%',up:true},
  {label:'Risk Score',val:'78/100',change:'+3',up:true},
];

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function FinancialDashboard() {
  const { isDark } = useAdminTheme();
  const [active,setActive]=useState<NavSection>('overview');
  const [search,setSearch]=useState('');
  const [alertsOpen,setAlertsOpen]=useState(false);

  useEffect(()=>{injectObservatoryCSS();},[]);

  // Theme toggle handled by AdminLayout

  const navItems:{id:NavSection;label:string;icon:string;badge?:string;badgeColor?:string;score?:string}[] = [
    {id:'overview',icon:'🌐',label:'Command Overview'},
    {id:'intelligence',icon:'🧠',label:'AI Intelligence',badge:'8',badgeColor:'g'},
    {id:'forecast',icon:'📈',label:'Forecast Engine'},
    {id:'analytics',icon:'🔬',label:'Deep Analytics'},
    {id:'pulse',icon:'⚡',label:'Live Pulse',badge:'LIVE',badgeColor:'g'},
    {id:'risk',icon:'🛡️',label:'Risk Observatory',badge:'1',score:'78'},
  ];

  const sectionMap:{[k in NavSection]:React.ReactNode} = {
    overview:<OverviewSection/>,
    intelligence:<IntelligenceSection/>,
    forecast:<ForecastSection/>,
    analytics:<AnalyticsSection/>,
    pulse:<PulseSection/>,
    risk:<RiskSection/>,
  };

  return (
    <div className={`obs ${isDark ? 'dark' : 'light'}`} style={{height:'100%',minHeight:0}}>
      <div className="obs-root">
        {/* Ticker bar */}
        <div className="obs-ticker-bar">
          <div className="obs-ticker-label">LIVE</div>
          <div className="obs-ticker-fade-l"/>
          <div className="obs-ticker-scroll">
            <div className="obs-ticker-inner">
              {[...TICKER_ITEMS_REAL,...TICKER_ITEMS_REAL].map((item,i)=>(
                <div key={i} className="obs-ticker-item">
                  <span>{item.label}:</span>
                  <b>{item.val}</b>
                  <span className={item.up?'up':'dn'}>{item.change}</span>
                  <span style={{opacity:.3}}>•</span>
                </div>
              ))}
            </div>
          </div>
          <div className="obs-ticker-fade-r"/>
        </div>

        {/* Top bar */}
        <div className="obs-topbar">
          <div className="obs-logo">THE OBSERVATORY<span className="obs-logo-sub"> · Financial Command</span></div>
          <div className="obs-divv"/>
          <div className="obs-live-chip"><div className="obs-live-dot"/><span>LIVE</span></div>
          <div className="obs-divv"/>
          <div className="obs-search-wrap">
            <span className="obs-search-icon">⌕</span>
            <input placeholder="Search metrics, members, funds..." value={search} onChange={e=>setSearch(e.target.value)}/>
            <span style={{fontSize:10,color:'var(--t3)',flexShrink:0,background:'var(--bg3)',padding:'1px 5px',borderRadius:4}}>⌘K</span>
          </div>
          <div className="obs-topbar-right">
              <Clock/>
              <div className="obs-divv"/>
              <div className="obs-ibtn" title="Download Report">⬇</div>
              <div className="obs-ibtn" title="Print">🖨</div>
              <div className="obs-ibtn" title={`${ALERTS.length} alerts`} onClick={()=>setAlertsOpen(!alertsOpen)}>
                🔔
                <div className="dot"/>
              </div>
              <div className="obs-divv"/>
            </div>
        </div>

        {/* Body */}
        <div className="obs-body">
          {/* Sidebar */}
          <div className="obs-sidebar">
            <div className="obs-nav-sect-label">Navigation</div>
            <div className="obs-nav-group">
              {navItems.map(n=>(
                <div key={n.id} className={`obs-nav-item${active===n.id?' act':''}`} onClick={()=>setActive(n.id)}>
                  <span className="obs-nav-icon">{n.icon}</span>
                  <span className="obs-nav-label">{n.label}</span>
                  {n.badge&&<span className={`obs-nav-badge${n.badgeColor?' '+n.badgeColor:''}`}>{n.badge}</span>}
                </div>
              ))}
            </div>

            <div className="obs-nav-sect-label" style={{marginTop:8}}>Quick Stats</div>
            <div className="obs-sidebar-bottom">
              {[
                {label:'Health Score',val:'78/100'},
                {label:'Today\'s Giving',val:'₦4.28M'},
                {label:'Cash Runway',val:'3.2 mo'},
                {label:'Active Goals',val:'5 / 5'},
              ].map(s=>(
                <div key={s.label} className="obs-mini-stat">
                  <span className="obs-mini-stat-label">{s.label}</span>
                  <span className="obs-mini-stat-val">{s.val}</span>
                </div>
              ))}
              <div className="obs-div"/>
              <div style={{padding:'6px 10px',fontSize:10,color:'var(--t3)'}}>
                <div style={{marginBottom:3}}>Church of Christ, Lekki</div>
                <div style={{color:'var(--em)',fontWeight:700}}>FY 2025 · Q1</div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="obs-main">
            {sectionMap[active]}
          </div>

          {/* Right panel */}
          <div className="obs-rpanel">
            <div className="obs-rp-hd">
              <span>🔔 Alerts & Watchlist</span>
              <span className="obs-card-badge red">{ALERTS.length}</span>
            </div>
            <div className="obs-rp-scroll">
              <div style={{padding:'8px 14px 4px',fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.1em'}}>Recent Alerts</div>
              {ALERTS.map((a,i)=>(
                <div key={i} className="obs-alert-item">
                  <div className="obs-alert-dot" style={{background:a.color}}/>
                  <div>
                    <div className="obs-alert-text">{a.text}</div>
                    <div className="obs-alert-time">{a.time}</div>
                  </div>
                </div>
              ))}
              <div className="obs-div" style={{margin:'4px 14px'}}/>
              <div style={{padding:'4px 14px 4px',fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.1em'}}>Watchlist</div>
              {WATCHLIST.map((w,i)=>(
                <div key={i} className="obs-watch-item">
                  <div className="obs-watch-label">{w.label}</div>
                  <div>
                    <div className="obs-watch-val">{w.val}</div>
                    <div className="obs-watch-chg" style={{color:w.up?'var(--em)':'var(--red)',textAlign:'right',fontSize:10}}>{w.chg}</div>
                  </div>
                </div>
              ))}
              <div className="obs-div" style={{margin:'4px 14px'}}/>
              <div style={{padding:'4px 14px 4px',fontSize:10,fontWeight:700,color:'var(--t3)',textTransform:'uppercase',letterSpacing:'.1em'}}>Upcoming</div>
              {UPCOMING_EVENTS.slice(0,4).map((e,i)=>(
                <div key={i} style={{padding:'7px 14px',borderBottom:'1px solid var(--b2)'}}>
                  <div className={`obs-cal-event ${e.type}`} style={{margin:0}}>
                    <div className="obs-cal-title">{e.title}</div>
                    <div className="obs-cal-meta">{e.days} days · {e.date}{e.amount&&` · ${e.amount}`}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

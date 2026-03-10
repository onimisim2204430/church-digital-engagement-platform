/**
 * FinancialHub — v3 "Command Centre"
 *
 * Bloomberg Terminal × modern fintech aesthetic.
 * Deep slate/navy base · neon emerald precision · monospace data DNA.
 *
 * FIXED: PayoutsTab now implements the full OTP flow proven by testWithdrawals.py
 *   form → initiating (polling) → OTP INPUT → verifying → done
 */

import React, {
  useState, useEffect, useCallback, useMemo, memo, useRef,
} from 'react';
import Icon from '../components/common/Icon';
import apiService from '../services/api.service';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type Period  = '1D' | '7D' | '30D' | '90D' | 'YTD' | '1Y' | 'ALL';
type HubTab  = 'overview' | 'transactions' | 'giving' | 'budget' | 'members' | 'reports' | 'payouts';
type SortDir = 'asc' | 'desc';

interface Tx {
  id: string;
  user_email: string;
  user_name: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  status_label: string;
  payment_method?: string | null;
  amount_verified: boolean;
  paid_at?: string | null;
  created_at?: string | null;
  metadata?: Record<string, any>;
}

interface BudgetLine {
  dept: string; icon: string; color: string;
  allocated: number; spent: number;
}

interface BankAcct {
  id: string;
  account_name: string;
  account_number: string;
  bank_name: string;
  bank_code?: string;
  recipient_code?: string;
}

interface WithdrawalRecord {
  id: string;
  reference: string;
  amount: number;
  status: string;
  requested_at: string;
  updated_at?: string;
  failure_reason?: string;
  paystack_transfer_code?: string;
  transaction?: { paystack_transfer_code?: string };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const PERIODS: { key: Period; label: string }[] = [
  { key: '1D',  label: 'Today'   },
  { key: '7D',  label: '7 Days'  },
  { key: '30D', label: '30 Days' },
  { key: '90D', label: '90 Days' },
  { key: 'YTD', label: 'YTD'     },
  { key: '1Y',  label: '1 Year'  },
  { key: 'ALL', label: 'All Time'},
];

const TABS: { key: HubTab; icon: string; label: string }[] = [
  { key: 'overview',     icon: 'dashboard',          label: 'Overview'     },
  { key: 'transactions', icon: 'receipt_long',        label: 'Transactions' },
  { key: 'giving',       icon: 'volunteer_activism',  label: 'Giving'       },
  { key: 'budget',       icon: 'account_balance',     label: 'Budget'       },
  { key: 'members',      icon: 'groups',              label: 'Members'      },
  { key: 'reports',      icon: 'summarize',           label: 'Reports'      },
  { key: 'payouts',      icon: 'send',                label: 'Payouts'      },
];

const BUDGET_LINES: BudgetLine[] = [
  { dept: 'Ministry Operations', icon: 'church',               color: '#10b981', allocated: 5000000, spent: 3820000 },
  { dept: 'Media & Technology',  icon: 'cast',                 color: '#8b5cf6', allocated: 2000000, spent: 2180000 },
  { dept: 'Youth Programs',      icon: 'groups',               color: '#3b82f6', allocated: 1500000, spent: 920000  },
  { dept: 'Missions',            icon: 'flight',               color: '#f59e0b', allocated: 4800000, spent: 3150000 },
  { dept: 'Benevolence Fund',    icon: 'favorite',             color: '#ec4899', allocated: 1200000, spent: 740000  },
  { dept: 'Administration',      icon: 'admin_panel_settings', color: '#64748b', allocated: 800000,  spent: 610000  },
];

const CAT_COLORS: Record<string, { stroke: string; fill: string; badge: string; dot: string }> = {
  Tithes:      { stroke: '#10b981', fill: 'rgba(16,185,129,0.15)',  badge: 'bg-emerald-50 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700', dot: '#10b981' },
  Offerings:   { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.15)',  badge: 'bg-blue-50 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700',                  dot: '#3b82f6' },
  Projects:    { stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.15)',  badge: 'bg-violet-50 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700',        dot: '#8b5cf6' },
  Fundraising: { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.15)',  badge: 'bg-amber-50 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700',             dot: '#f59e0b' },
  General:     { stroke: '#64748b', fill: 'rgba(100,116,139,0.15)', badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600',               dot: '#64748b' },
};

const STATUS_META: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  SUCCESS:    { dot: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-900/40', border: 'border-emerald-700/60', label: 'Success'    },
  FAILED:     { dot: '#ef4444', text: 'text-red-400',     bg: 'bg-red-900/40',     border: 'border-red-700/60',     label: 'Failed'     },
  PROCESSING: { dot: '#f59e0b', text: 'text-amber-400',   bg: 'bg-amber-900/40',   border: 'border-amber-700/60',   label: 'Processing' },
  PENDING:    { dot: '#60a5fa', text: 'text-blue-400',    bg: 'bg-blue-900/40',    border: 'border-blue-700/60',    label: 'Pending'    },
};
const DEF_STATUS = { dot: '#64748b', text: 'text-slate-400', bg: 'bg-slate-800', border: 'border-slate-600', label: 'Unknown' };

const WSTATUS: Record<string, { color: string; bg: string; label: string }> = {
  pending:      { color: '#60a5fa', bg: 'bg-blue-900/40',    label: 'Pending'      },
  approved:     { color: '#a78bfa', bg: 'bg-violet-900/40',  label: 'Approved'     },
  processing:   { color: '#f59e0b', bg: 'bg-amber-900/40',   label: 'Processing'   },
  otp_required: { color: '#fb923c', bg: 'bg-orange-900/40',  label: 'OTP Required' },
  completed:    { color: '#10b981', bg: 'bg-emerald-900/40', label: 'Completed'    },
  failed:       { color: '#f87171', bg: 'bg-red-900/40',     label: 'Failed'       },
  cancelled:    { color: '#64748b', bg: 'bg-slate-800',      label: 'Cancelled'    },
  timed_out:    { color: '#f87171', bg: 'bg-red-900/40',     label: 'Timed Out'    },
};

// ── 30-min Paystack SLA — same threshold as backend STALE_MINUTES
const STALE_MS = 30 * 60 * 1000;

/** Returns the effective display status, substituting 'timed_out' when the
 *  backend hasn't yet expired a stale processing/otp_required row. */
const effectiveStatus = (w: WithdrawalRecord): string => {
  if (!['processing', 'otp_required'].includes(w.status)) return w.status;
  const lastUpdate = new Date(w.updated_at ?? w.requested_at).getTime();
  return Date.now() - lastUpdate > STALE_MS ? 'timed_out' : w.status;
};

const AVATAR_G = [
  'from-emerald-600 to-teal-500', 'from-blue-600 to-cyan-500',
  'from-violet-600 to-purple-500', 'from-amber-600 to-orange-500',
  'from-rose-600 to-pink-500', 'from-indigo-600 to-blue-500',
];

const THIN: React.CSSProperties = { scrollbarWidth: 'thin', scrollbarColor: '#1e293b transparent' };
const PANEL_W = 420;

// ─── Light-mode CSS injection ─────────────────────────────────────────────
const FH_CSS = `
:not(.dark) .fh {
  --fh-bg:        #f8fafc;
  --fh-surface:   #ffffff;
  --fh-surface2:  #f1f5f9;
  --fh-surface3:  #e2e8f0;
  --fh-border:    #e2e8f0;
  --fh-border2:   #cbd5e1;
  --fh-text1:     #0f172a;
  --fh-text2:     #334155;
  --fh-text3:     #64748b;
  --fh-text4:     #94a3b8;
  --fh-input-bg:  #f8fafc;
  --fh-row-even:  #ffffff;
  --fh-row-odd:   #f8fafc;
  --fh-row-hover: #f1f5f9;
  --fh-row-sel:   rgba(16,185,129,0.06);
  --fh-row-sel-border: rgba(16,185,129,0.2);
}
.dark .fh {
  --fh-bg:        #020617;
  --fh-surface:   #0f172a;
  --fh-surface2:  #1e293b;
  --fh-surface3:  #334155;
  --fh-border:    #1e293b;
  --fh-border2:   #334155;
  --fh-text1:     #f1f5f9;
  --fh-text2:     #cbd5e1;
  --fh-text3:     #64748b;
  --fh-text4:     #475569;
  --fh-input-bg:  rgba(30,41,59,0.8);
  --fh-row-even:  #020617;
  --fh-row-odd:   rgba(15,23,42,.3);
  --fh-row-hover: rgba(30,41,59,0.6);
  --fh-row-sel:   rgba(6,78,59,.2);
  --fh-row-sel-border: rgba(6,78,59,.4);
}
.fh { background: var(--fh-bg); }
.fh-bar { background: var(--fh-surface); border-bottom: 1px solid var(--fh-border); }
.fh-tabs { border-top: 1px solid var(--fh-border); }
.fh-card { background: var(--fh-surface) !important; border-color: var(--fh-border) !important; }
.fh-bar-track { background: var(--fh-surface2) !important; }
.fh-toolbar { background: var(--fh-surface) !important; border-bottom: 1px solid var(--fh-border) !important; }
.fh-thead { background: var(--fh-surface2) !important; border-bottom: 1px solid var(--fh-border2) !important; }
.fh-row-even { background: var(--fh-row-even) !important; border-color: var(--fh-border) !important; }
.fh-row-odd  { background: var(--fh-row-odd)  !important; border-color: var(--fh-border) !important; }
.fh-row-even:hover,.fh-row-odd:hover { background: var(--fh-row-hover) !important; }
.fh-row-sel  { background: var(--fh-row-sel)  !important; border-color: var(--fh-row-sel-border) !important; }
.fh-input {
  background: var(--fh-input-bg) !important;
  border-color: var(--fh-border2) !important;
  color: var(--fh-text2) !important;
}
.fh-input::placeholder { color: var(--fh-text4) !important; }
.fh-input:focus { border-color: #10b981 !important; }
.fh-panel { background: var(--fh-surface) !important; border-left-color: var(--fh-border) !important; }
.fh-panel-inner { background: var(--fh-surface2) !important; border-color: var(--fh-border) !important; }
:not(.dark) .fh table thead tr { background: var(--fh-surface2) !important; }
:not(.dark) .fh .fh-divider { border-color: var(--fh-border) !important; }
:not(.dark) .fh { scrollbar-color: #cbd5e1 transparent; }
@keyframes fh-spin { to { transform: rotate(360deg); } }
@keyframes fh-ping { 0%,100%{opacity:.2;transform:scale(1)} 50%{opacity:.4;transform:scale(1.15)} }
@keyframes fh-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
.fh-spin { animation: fh-spin 0.8s linear infinite; }
.fh-ping { animation: fh-ping 1.5s ease-in-out infinite; }
.fh-bounce-1 { animation: fh-bounce 1s ease-in-out infinite; animation-delay:0ms; }
.fh-bounce-2 { animation: fh-bounce 1s ease-in-out infinite; animation-delay:150ms; }
.fh-bounce-3 { animation: fh-bounce 1s ease-in-out infinite; animation-delay:300ms; }
`;

let _fhCss = false;
const injectFHCSS = () => {
  if (_fhCss || typeof document === 'undefined') return;
  const s = document.createElement('style');
  s.textContent = FH_CSS;
  document.head.appendChild(s);
  _fhCss = true;
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const naira = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n / 100);

const nairaFull = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(n / 100);

const compact = (n: number): string => {
  const v = n / 100;
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `₦${(v / 1_000).toFixed(0)}K`;
  return nairaFull(n);
};

const fmtD  = (s?: string | null) => s ? new Date(s).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
const fmtDT = (s?: string | null) => s ? new Date(s).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
const fmtShort = (s?: string | null) => s ? new Date(s).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '';

const sMeta = (s: string) => STATUS_META[s?.toUpperCase()] ?? DEF_STATUS;
const cMeta = (c: string) => CAT_COLORS[c] ?? CAT_COLORS.General;

const avatarGrad = (id: string) =>
  AVATAR_G[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_G.length];

const initials = (n: string) =>
  n.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const periodStart = (p: Period, now = new Date()): Date => {
  const d = new Date(now);
  switch (p) {
    case '1D':  d.setHours(0, 0, 0, 0); break;
    case '7D':  d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); break;
    case '30D': d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); break;
    case '90D': d.setDate(d.getDate() - 89); d.setHours(0, 0, 0, 0); break;
    case 'YTD': d.setMonth(0, 1); d.setHours(0, 0, 0, 0); break;
    case '1Y':  d.setFullYear(d.getFullYear() - 1); break;
    case 'ALL': return new Date(0);
  }
  return d;
};

const periodLabel = (p: Period): string => {
  const now = new Date();
  const start = periodStart(p, now);
  if (p === 'ALL') return 'All Time';
  if (p === '1D')  return `Today, ${now.toLocaleDateString('en-US', { month:'long', day:'numeric' })}`;
  return `${fmtD(start.toISOString())} – ${fmtD(now.toISOString())}`;
};

const exportCSV = (rows: Tx[]) => {
  const h = ['ID','Name','Email','Reference','Amount (NGN)','Currency','Status','Method','Created','Paid At'];
  const body = rows.map(t => [t.id, t.user_name, t.user_email, t.reference,
    (t.amount/100).toFixed(2), t.currency, t.status, t.payment_method||'',
    fmtDT(t.created_at), fmtDT(t.paid_at)]
    .map(v => `"${String(v).replace(/"/g,'""')}"`)
    .join(',')
  );
  const blob = new Blob([[h.join(','), ...body].join('\n')], { type:'text/csv' });
  Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob), download:`fh_export_${Date.now()}.csv`
  }).click();
};

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_NAMES = [
  'Emeka Okafor','Chioma Adeyemi','Tunde Balogun','Ngozi Eze',
  'Segun Adeleke','Amaka Obi','Kola Adesanya','Ifeoma Nwosu',
  'Rotimi Akintola','Yetunde Okonkwo','Babatunde Alabi','Chiamaka Ugwu',
  'Femi Adeola','Nkechi Obiora','Gbenga Olawale','Ada Nnamdi',
  'Sunday Adebayo','Chinwe Osei','Taiwo Fadahunsi','Blessing Onyeka',
];
const MOCK_CATS = ['Tithes','Offerings','Projects','Fundraising'];

function seed(s: number) {
  let x = s;
  return () => { x = (x * 1664525 + 1013904223) & 0xffffffff; return (x >>> 0) / 4294967296; };
}

function genMockTransactions(count = 400): Tx[] {
  const rng = seed(42);
  const now  = Date.now();
  const year = 365 * 86400000;
  return Array.from({ length: count }, (_, i) => {
    const r     = rng;
    const name  = MOCK_NAMES[Math.floor(r() * MOCK_NAMES.length)];
    const email = name.toLowerCase().replace(/ /g, '.') + '@email.com';
    const cat   = MOCK_CATS[Math.floor(r() * MOCK_CATS.length)];
    const baseAmounts = [5000, 10000, 20000, 50000, 100000, 200000, 500000];
    const amount = baseAmounts[Math.floor(r() * baseAmounts.length)] * 100;
    const createdAt = new Date(now - r() * year).toISOString();
    const statuses  = ['SUCCESS','SUCCESS','SUCCESS','SUCCESS','FAILED','PENDING','PROCESSING'];
    const status    = statuses[Math.floor(r() * statuses.length)];
    const methods   = ['card','bank_transfer','ussd','bank_transfer','card'];
    return {
      id: `tx_${(i + 1).toString().padStart(6,'0')}`,
      user_email: email,
      user_name: name,
      reference: `FHB-${Date.now().toString(36).toUpperCase()}-${i}`,
      amount,
      currency: 'NGN',
      status,
      status_label: status.charAt(0) + status.slice(1).toLowerCase(),
      payment_method: methods[Math.floor(r() * methods.length)],
      amount_verified: status === 'SUCCESS',
      paid_at: status === 'SUCCESS' ? createdAt : null,
      created_at: createdAt,
      metadata: { giving_category: cat, source: 'giving_page' },
    };
  });
}

const MOCK_TXS = genMockTransactions(400);

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATED COUNTER HOOK
// ═══════════════════════════════════════════════════════════════════════════

function useCount(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const from  = value;
    const tick  = (now: number) => {
      const t    = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * ease));
      if (t < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return value;
}

// ═══════════════════════════════════════════════════════════════════════════
// SVG CHART PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

const Spark = memo(({ pts, color = '#10b981', w = 72, h = 28 }: {
  pts: number[]; color?: string; w?: number; h?: number;
}) => {
  if (pts.length < 2) return null;
  const max = Math.max(...pts) || 1;
  const min = Math.min(...pts);
  const range = max - min || 1;
  const coords = pts.map((v, i) =>
    `${(i / (pts.length - 1)) * w},${h - ((v - min) / range) * h}`
  );
  const area = [...coords, `${w},${h}`, `0,${h}`].join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ opacity: 0.8 }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0"   />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace('#','')})`} />
      <polyline points={coords.join(' ')} stroke={color} strokeWidth="1.5"
        fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
});
Spark.displayName = 'Spark';

const AreaChart = memo(({ data, color = '#10b981', h = 160, showGrid = true }: {
  data: { label: string; value: number }[];
  color?: string; h?: number; showGrid?: boolean;
}) => {
  const W = 800;
  const PAD = { t: 10, r: 8, b: 28, l: 52 };
  const cw  = W - PAD.l - PAD.r;
  const ch  = h - PAD.t - PAD.b;
  const max = Math.max(...data.map(d => d.value)) || 1;
  const xOf = (i: number) => PAD.l + (i / (data.length - 1 || 1)) * cw;
  const yOf = (v: number) => PAD.t + ch - (v / max) * ch;
  const linePts = data.map((d, i) => `${xOf(i)},${yOf(d.value)}`).join(' ');
  const areaPts = [`${PAD.l},${PAD.t + ch}`, ...data.map((d, i) => `${xOf(i)},${yOf(d.value)}`), `${PAD.l + cw},${PAD.t + ch}`].join(' ');
  const gridLines = 4;
  const stepV = max / gridLines;
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" preserveAspectRatio="none" style={{ height: h }}>
      <defs>
        <linearGradient id={`ag-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      {showGrid && Array.from({ length: gridLines + 1 }, (_, i) => {
        const y = PAD.t + (i / gridLines) * ch;
        const v = max - i * stepV;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={PAD.l + cw} y2={y} stroke="currentColor" strokeWidth="1" style={{ color:'var(--fh-border,#1e293b)' }} />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize={9} fontFamily="monospace" style={{ fill:'var(--fh-text3,#475569)' }}>
              {compact(v)}
            </text>
          </g>
        );
      })}
      <polygon points={areaPts} fill={`url(#ag-${color.replace('#','')})`} />
      <polyline points={linePts} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={i}>
          {data.length <= 14 && <circle cx={xOf(i)} cy={yOf(d.value)} r="3" fill={color} stroke="#0f172a" strokeWidth="1.5" />}
          <text x={xOf(i)} y={PAD.t + ch + 18} textAnchor="middle" fontSize={8} fill="var(--fh-text3,#64748b)" fontFamily="monospace">{d.label}</text>
        </g>
      ))}
    </svg>
  );
});
AreaChart.displayName = 'AreaChart';

const BarViz = memo(({ data, color = '#10b981', h = 120 }: {
  data: { label: string; value: number }[]; color?: string; h?: number;
}) => {
  if (!data.length) return null;
  const W   = 600;
  const PAD = { t: 4, r: 4, b: 20, l: 4 };
  const cw  = W - PAD.l - PAD.r;
  const ch  = h - PAD.t - PAD.b;
  const max = Math.max(...data.map(d => d.value)) || 1;
  const bw  = Math.floor((cw - (data.length - 1) * 4) / data.length);
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" style={{ height: h }}>
      {data.map((d, i) => {
        const bh = Math.max(2, Math.round((d.value / max) * ch));
        const x  = PAD.l + i * (bw + 4);
        const y  = PAD.t + ch - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx={2} fill={color} opacity={0.7 + 0.3 * (d.value / max)} />
            <text x={x + bw / 2} y={PAD.t + ch + 14} textAnchor="middle" fontSize={8} fill="var(--fh-text3,#475569)" fontFamily="monospace">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
});
BarViz.displayName = 'BarViz';

const Donut = memo(({ segs, size = 140, thick = 26 }: {
  segs: { label: string; value: number; color: string }[]; size?: number; thick?: number;
}) => {
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const r     = (size - thick) / 2;
  const cx    = size / 2;
  const circ  = 2 * Math.PI * r;
  let offset  = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--fh-surface2,#1e293b)" strokeWidth={thick} />
      {segs.map((s, i) => {
        const dash = (s.value / total) * circ;
        const gap  = circ - dash;
        const el = (
          <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={s.color} strokeWidth={thick}
            strokeDasharray={`${dash - 1.5} ${gap + 1.5}`} strokeDashoffset={-offset}
            strokeLinecap="butt" style={{ transform:'rotate(-90deg)', transformOrigin:'center' }} />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cx - 4} textAnchor="middle" fontSize={13} fontWeight="700" fill="var(--fh-text1,#f1f5f9)" fontFamily="monospace">{segs.length}</text>
      <text x={cx} y={cx + 12} textAnchor="middle" fontSize={8} fill="var(--fh-text3,#475569)" fontFamily="monospace">CATEGORIES</text>
    </svg>
  );
});
Donut.displayName = 'Donut';

// ═══════════════════════════════════════════════════════════════════════════
// UI ATOMS
// ═══════════════════════════════════════════════════════════════════════════

const StatusPill = memo(({ status }: { status: string }) => {
  const m = sMeta(status);
  const lightMeta: Record<string, { bg: string; text: string; border: string }> = {
    SUCCESS:    { bg:'bg-emerald-50 dark:bg-emerald-900/40',  text:'text-emerald-700 dark:text-emerald-400', border:'border-emerald-200 dark:border-emerald-700/60' },
    FAILED:     { bg:'bg-red-50 dark:bg-red-900/40',          text:'text-red-600 dark:text-red-400',         border:'border-red-200 dark:border-red-700/60'         },
    PROCESSING: { bg:'bg-amber-50 dark:bg-amber-900/40',      text:'text-amber-700 dark:text-amber-400',     border:'border-amber-200 dark:border-amber-700/60'     },
    PENDING:    { bg:'bg-blue-50 dark:bg-blue-900/40',        text:'text-blue-700 dark:text-blue-400',       border:'border-blue-200 dark:border-blue-700/60'       },
  };
  const lm = lightMeta[status?.toUpperCase()] ?? { bg:'bg-slate-100 dark:bg-slate-800', text:'text-slate-600 dark:text-slate-400', border:'border-slate-200 dark:border-slate-600' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-sans font-semibold border ${lm.bg} ${lm.text} ${lm.border}`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.dot }} />
      {m.label.toUpperCase()}
    </span>
  );
});
StatusPill.displayName = 'StatusPill';

const Avatar = memo(({ id, name, cls = 'w-8 h-8 text-xs' }: { id: string; name: string; cls?: string }) => (
  <div className={`${cls} rounded-md bg-gradient-to-br ${avatarGrad(id)} flex items-center justify-center flex-shrink-0 font-bold text-white select-none`}>
    {initials(name)}
  </div>
));
Avatar.displayName = 'Avatar';

const TrendBadge = memo(({ delta, inverted = false }: { delta: number; inverted?: boolean }) => {
  const good = inverted ? delta <= 0 : delta >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold ${good ? 'text-emerald-400' : 'text-red-400'}`}>
      <Icon name={delta >= 0 ? 'arrow_drop_up' : 'arrow_drop_down'} size={14} />
      {Math.abs(delta)}%
    </span>
  );
});
TrendBadge.displayName = 'TrendBadge';

const Card = memo(({ children, className = '', glow = '' }: {
  children: React.ReactNode; className?: string; glow?: string;
}) => (
  <div className={`fh-card bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden ${className}`}
    style={glow ? { boxShadow: `0 0 0 1px ${glow}22, 0 4px 24px ${glow}11` } : {}}>
    {glow && <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${glow}60, transparent)` }} />}
    {children}
  </div>
));
Card.displayName = 'Card';

const Bar = memo(({ v, color = '#10b981', track = '#1e293b', h = 4 }: {
  v: number; color?: string; track?: string; h?: number;
}) => (
  <div className="fh-bar-track w-full rounded-full overflow-hidden" style={{ height: h, background: track }}>
    <div className="h-full rounded-full transition-all duration-700" style={{ width:`${clamp(v,0,100)}%`, background: color }} />
  </div>
));
Bar.displayName = 'Bar';

// ═══════════════════════════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════════════════════════

const KPICard = memo(({ label, value, sub, spark, color, icon, delta, prefix = '' }: {
  label: string; value: number; sub: string;
  spark: number[]; color: string; icon: string;
  delta?: number; prefix?: string;
}) => {
  const animated = useCount(value, 900);
  const display  = prefix === '₦' ? compact(animated * 100) : prefix === '%' ? `${animated}%` : animated.toLocaleString();
  return (
    <Card className="p-4 flex flex-col gap-3" glow={color}>
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-sans font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-widest" style={{ color:'var(--fh-text3)' }}>{label}</span>
        <div className="flex items-center gap-2">
          {delta !== undefined && <TrendBadge delta={delta} inverted={label.toLowerCase().includes('fail')} />}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}22` }}>
            <Icon name={icon} size={14} style={{ color }} />
          </div>
        </div>
      </div>
      <div>
        <p className="text-2xl font-mono font-bold tracking-tight" style={{ color:'var(--fh-text1)' }}>{display}</p>
        <p className="text-[10px] mt-0.5 font-sans" style={{ color:'var(--fh-text3)' }}>{sub}</p>
      </div>
      <Spark pts={spark} color={color} w={80} h={24} />
    </Card>
  );
});
KPICard.displayName = 'KPICard';

// ═══════════════════════════════════════════════════════════════════════════
// PERIOD SELECTOR
// ═══════════════════════════════════════════════════════════════════════════

const PeriodSelector = memo(({ value, onChange }: { value: Period; onChange: (p: Period) => void }) => (
  <div className="flex items-center gap-0 bg-slate-800/60 dark:bg-slate-800/60 border border-slate-700 dark:border-slate-700 rounded-lg overflow-hidden p-0.5" style={{ background:'var(--fh-surface2)', borderColor:'var(--fh-border2)' }}>
    {PERIODS.map(p => (
      <button key={p.key} onClick={() => onChange(p.key)}
        className={`px-2.5 py-1 text-[10px] font-sans font-semibold transition-all rounded-md whitespace-nowrap ${value === p.key ? 'bg-emerald-500 text-black' : 'text-slate-500 hover:text-slate-300'}`}
        style={value !== p.key ? { color:'var(--fh-text3)' } : {}}>
        {p.label.replace(' ','\u00a0')}
      </button>
    ))}
  </div>
));
PeriodSelector.displayName = 'PeriodSelector';

// ═══════════════════════════════════════════════════════════════════════════
// TAB: OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════

const OverviewTab = memo(({ txs, period }: { txs: Tx[]; period: Period }) => {
  const start   = useMemo(() => periodStart(period), [period]);
  const current = useMemo(() => txs.filter(t => t.created_at && new Date(t.created_at) >= start), [txs, start]);
  const success = useMemo(() => current.filter(t => t.status === 'SUCCESS'), [current]);
  const prevStart = useMemo(() => { const len = Date.now() - start.getTime(); return new Date(start.getTime() - len); }, [start]);
  const prev     = useMemo(() => txs.filter(t => t.created_at && new Date(t.created_at) >= prevStart && new Date(t.created_at) < start), [txs, prevStart, start]);
  const prevSucc = useMemo(() => prev.filter(t => t.status === 'SUCCESS'), [prev]);
  const revenue     = useMemo(() => success.reduce((s, t) => s + t.amount, 0), [success]);
  const prevRevenue = useMemo(() => prevSucc.reduce((s, t) => s + t.amount, 0), [prevSucc]);
  const revDelta    = pct(revenue - prevRevenue, prevRevenue || 1);
  const txDelta     = pct(current.length - prev.length, prev.length || 1);
  const failCount   = current.filter(t => t.status === 'FAILED').length;
  const prevFail    = prev.filter(t => t.status === 'FAILED').length;
  const failDelta   = pct(failCount - prevFail, prevFail || 1);
  const sucRate     = pct(success.length, current.length || 1);
  const prevSucRate = pct(prevSucc.length, prev.length || 1);
  const makeSpark   = useCallback((subset: Tx[]) => {
    const BUCKETS = 10;
    const len = Date.now() - start.getTime();
    return Array.from({ length: BUCKETS }, (_, i) => {
      const s = new Date(start.getTime() + (i / BUCKETS) * len);
      const e = new Date(start.getTime() + ((i + 1) / BUCKETS) * len);
      return subset.filter(t => t.created_at && new Date(t.created_at) >= s && new Date(t.created_at) < e).reduce((acc, t) => acc + t.amount, 0);
    });
  }, [start]);
  const revSpark = useMemo(() => makeSpark(success), [makeSpark, success]);
  const txnSpark = useMemo(() => makeSpark(current).map(v => v / 100), [makeSpark, current]);
  const catData  = useMemo(() => {
    const map: Record<string, number> = {};
    success.forEach(t => { const c = t.metadata?.giving_category || 'General'; map[c] = (map[c] || 0) + t.amount; });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map).map(([label, value]) => ({ label, value, pct: pct(value, total), color: cMeta(label).dot })).sort((a, b) => b.value - a.value);
  }, [success]);
  const revChart = useMemo(() => {
    const BUCKETS = period === '1D' ? 24 : period === '7D' ? 7 : period === '30D' ? 30 : 12;
    const len = Date.now() - start.getTime();
    return Array.from({ length: BUCKETS }, (_, i) => {
      const s = new Date(start.getTime() + (i / BUCKETS) * len);
      const e = new Date(start.getTime() + ((i + 1) / BUCKETS) * len);
      const v = success.filter(t => t.paid_at && new Date(t.paid_at) >= s && new Date(t.paid_at) < e).reduce((acc, t) => acc + t.amount, 0);
      let lbl = '';
      if (period === '1D') lbl = `${i}h`;
      else if (period === '7D') lbl = s.toLocaleDateString('en-US', { weekday:'short' }).slice(0,2);
      else lbl = s.toLocaleDateString('en-US', { month:'short', day:'numeric' }).split(' ')[0];
      return { label: lbl, value: v };
    });
  }, [success, start, period]);
  const recent = useMemo(() => [...current].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 8), [current]);
  const topG   = useMemo(() => {
    const m: Record<string, { name: string; total: number; count: number }> = {};
    success.forEach(t => { if (!m[t.user_email]) m[t.user_email] = { name: t.user_name || t.user_email, total: 0, count: 0 }; m[t.user_email].total += t.amount; m[t.user_email].count++; });
    return Object.values(m).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [success]);
  const maxG      = topG[0]?.total || 1;
  const avgGift   = success.length ? Math.round(revenue / success.length) : 0;
  const pendCount = current.filter(t => t.status === 'PENDING' || t.status === 'PROCESSING').length;
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard label="Total Revenue"  value={Math.round(revenue/100)}     sub={`vs ${compact(prevRevenue)} prev period`} spark={revSpark.map(v=>v/100)} color="#10b981" icon="payments"       delta={revDelta}          prefix="₦" />
        <KPICard label="Transactions"   value={current.length}              sub={`${success.length} successful`}           spark={txnSpark}               color="#3b82f6" icon="receipt_long"   delta={txDelta}                />
        <KPICard label="Success Rate"   value={sucRate}                     sub={`was ${prevSucRate}% prev period`}         spark={[prevSucRate,sucRate]}   color="#a78bfa" icon="verified"       delta={sucRate-prevSucRate} prefix="%" />
        <KPICard label="Failed"         value={failCount}                   sub="need attention"                            spark={[prevFail,failCount]}    color="#f87171" icon="cancel"         delta={failDelta}               />
        <KPICard label="Avg Gift"       value={Math.round(avgGift/100)}     sub={`${success.length} unique donors`}         spark={revSpark.map((v,i)=>v/(revChart[i]?.value||1)||0)} color="#fbbf24" icon="star" prefix="₦" />
        <KPICard label="Pending"        value={pendCount}                   sub="awaiting confirmation"                     spark={Array(10).fill(pendCount)} color="#94a3b8" icon="hourglass_top" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 p-5" glow="#10b981">
          <div className="flex items-start justify-between mb-4">
            <div><p className="text-[10px] font-sans font-semibold text-slate-500 uppercase tracking-widest">Revenue Trend</p><p className="text-2xl font-mono font-bold text-emerald-400 mt-1">{compact(revenue)}</p></div>
            <div className="flex items-center gap-2"><TrendBadge delta={revDelta} /><span className="text-[10px] font-sans text-slate-600">vs prev period</span></div>
          </div>
          <AreaChart data={revChart} color="#10b981" h={160} />
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-sans font-semibold text-slate-500 uppercase tracking-widest mb-4">Giving Breakdown</p>
          <div className="flex flex-col items-center gap-4">
            <Donut segs={catData.length > 0 ? catData : [{label:'None',value:1,color:'#1e293b'}]} size={140} thick={24} />
            <div className="w-full space-y-2">
              {catData.slice(0,5).map(c => (
                <div key={c.label} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="text-xs font-sans text-slate-400 flex-1 truncate">{c.label}</span>
                  <span className="text-xs font-mono font-bold text-slate-300">{c.pct}%</span>
                  <span className="text-[10px] font-mono text-slate-600">{compact(c.value)}</span>
                </div>
              ))}
              {catData.length === 0 && <p className="text-xs text-slate-600 text-center">No data</p>}
            </div>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-sans font-semibold text-slate-500 uppercase tracking-widest">Recent Activity</span>
            <span className="text-[10px] font-sans text-slate-600">{current.length} total this period</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {recent.length === 0 ? <p className="text-xs font-sans text-slate-600 text-center py-8">No transactions in this period</p>
              : recent.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/40 transition-colors">
                  <Avatar id={tx.id} name={tx.user_name || tx.user_email} cls="w-7 h-7 text-[10px]" />
                  <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-slate-300 truncate">{tx.user_name || tx.user_email}</p><p className="text-[10px] font-mono text-slate-600 truncate">{tx.reference}</p></div>
                  <StatusPill status={tx.status} />
                  <span className={`text-sm font-mono font-bold ml-1 flex-shrink-0 ${tx.status === 'SUCCESS' ? 'text-emerald-400' : 'text-slate-500'}`}>{compact(tx.amount)}</span>
                </div>
              ))
            }
          </div>
        </Card>
        <Card>
          <div className="px-4 py-3 border-b border-slate-800"><span className="text-[10px] font-sans font-semibold text-slate-500 uppercase tracking-widest">Top Givers</span></div>
          <div className="p-4 space-y-3">
            {topG.length === 0 ? <p className="text-xs font-sans text-slate-600 text-center py-4">No data</p>
              : topG.map((g, i) => (
                <div key={g.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-600 w-4">{i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}</span>
                      <span className="text-xs font-sans text-slate-300 truncate max-w-[100px]">{g.name.split(' ')[0]}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">{compact(g.total)}</span>
                  </div>
                  <Bar v={pct(g.total, maxG)} color="#10b981" h={3} />
                </div>
              ))
            }
          </div>
        </Card>
      </div>
      <Card className="p-5">
        <p className="text-[10px] font-sans font-semibold text-slate-500 uppercase tracking-widest mb-4">Transaction Volume by Period</p>
        <BarViz data={revChart.map(d => ({ label: d.label, value: d.value }))} color="#3b82f6" h={80} />
      </Card>
    </div>
  );
});
OverviewTab.displayName = 'OverviewTab';

// ═══════════════════════════════════════════════════════════════════════════
// TAB: TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════════════

const TransactionsTab = memo(({ txs, period }: { txs: Tx[]; period: Period }) => {
  const [detail, setDetail]       = useState<Tx | null>(null);
  const [statusF, setStatusF]     = useState('ALL');
  const [methodF, setMethodF]     = useState('ALL');
  const [search, setSearch]       = useState('');
  const [sortK, setSortK]         = useState<'user_name'|'amount'|'status'|'created_at'>('created_at');
  const [sortD, setSortD]         = useState<SortDir>('desc');
  const [page, setPage]           = useState(1);
  const PAGE                      = 25;
  const [refundMap, setRefundMap] = useState<Record<string, 'idle'|'loading'|'done'|'error'>>({});
  const [refundMsg, setRefundMsg] = useState<Record<string, string>>({});
  const start   = useMemo(() => periodStart(period), [period]);
  const current = useMemo(() => txs.filter(t => t.created_at && new Date(t.created_at) >= start), [txs, start]);
  const methods = useMemo(() => Array.from(new Set(current.map(t => t.payment_method).filter(Boolean))) as string[], [current]);
  const processed = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = current;
    if (statusF !== 'ALL') list = list.filter(t => t.status === statusF);
    if (methodF !== 'ALL') list = list.filter(t => t.payment_method === methodF);
    if (q) list = list.filter(t => t.reference.toLowerCase().includes(q) || t.user_email.toLowerCase().includes(q) || (t.user_name||'').toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      let av: any, bv: any;
      if (sortK === 'user_name') { av = a.user_name; bv = b.user_name; }
      else if (sortK === 'amount') { av = a.amount; bv = b.amount; }
      else if (sortK === 'status') { av = a.status; bv = b.status; }
      else { av = a.created_at||''; bv = b.created_at||''; }
      const c = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortD === 'asc' ? c : -c;
    });
  }, [current, statusF, methodF, search, sortK, sortD]);
  const paginated  = useMemo(() => processed.slice((page-1)*PAGE, page*PAGE), [processed, page]);
  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE));
  const panelOpen  = !!detail;
  const sortBy = (k: typeof sortK) => { setSortD(p => sortK === k ? (p==='asc'?'desc':'asc') : 'desc'); setSortK(k); setPage(1); };
  const Th = ({ label, k, cls='' }: { label: string; k: typeof sortK; cls?: string }) => (
    <th className={`px-3 py-2.5 text-left cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors ${cls}`} onClick={() => sortBy(k)}>
      <div className="flex items-center gap-1">
        <span className={`text-[9px] font-sans font-semibold uppercase tracking-widest ${sortK===k ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-600'}`}>{label}</span>
        <Icon name={sortK===k ? (sortD==='asc'?'arrow_upward':'arrow_downward') : 'unfold_more'} size={10} className={sortK===k ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-700 group-hover:text-slate-600 dark:group-hover:text-slate-500'} />
      </div>
    </th>
  );
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="fh-toolbar px-4 py-2.5 flex items-center gap-2 flex-shrink-0 overflow-x-auto" style={THIN}>
          <div className="relative w-52 flex-shrink-0">
            <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" />
            <input type="text" placeholder="Ref · email · name…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="fh-input w-full pl-8 pr-6 py-1.5 rounded-md text-xs font-sans focus:outline-none focus:ring-1 focus:ring-emerald-600/30" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400"><Icon name="close" size={11} /></button>}
          </div>
          {[
            { val: statusF, opts:[['ALL','All Status'],['SUCCESS','Success'],['FAILED','Failed'],['PROCESSING','Processing'],['PENDING','Pending']], set:(v:string)=>{setStatusF(v);setPage(1);} },
            { val: methodF, opts:[['ALL','All Methods'],...methods.map(m=>[m,m])], set:(v:string)=>{setMethodF(v);setPage(1);} },
          ].map((f,i) => (
            <select key={i} value={f.val} onChange={e => f.set(e.target.value)} className="fh-input flex-shrink-0 rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-emerald-600">
              {f.opts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          <button onClick={() => exportCSV(processed)} className="fh-input flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            <Icon name="download" size={12} />CSV
          </button>
          <span className="ml-auto flex-shrink-0 text-[10px] font-sans text-slate-500 dark:text-slate-600">{processed.length} records</span>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-auto" style={THIN}>
          <table className="w-full min-w-[480px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="fh-thead">
                <th className="pl-3 pr-2 py-2.5 w-8 text-left"><span className="text-[9px] font-sans text-slate-400 dark:text-slate-700">#</span></th>
                <Th label="USER" k="user_name" cls="px-3" />
                <th className={`px-3 py-2.5 text-left ${panelOpen ? 'hidden 2xl:table-cell' : 'hidden md:table-cell'}`}><span className="text-[9px] font-sans font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-600">REFERENCE</span></th>
                <Th label="AMOUNT" k="amount" cls="px-3" />
                <Th label="STATUS" k="status" cls={`${panelOpen ? 'hidden xl:table-cell' : 'hidden sm:table-cell'}`} />
                <th className={`px-3 py-2.5 text-left ${panelOpen ? 'hidden' : 'hidden lg:table-cell'}`}><span className="text-[9px] font-sans font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-600">METHOD</span></th>
                <Th label="DATE" k="created_at" cls={`${panelOpen ? 'hidden' : 'hidden xl:table-cell'}`} />
                <th className="px-3 py-2.5 text-right"><span className="text-[9px] font-sans font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-600">ACT.</span></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0
                ? <tr><td colSpan={8}><div className="flex flex-col items-center justify-center py-20"><Icon name="receipt_long" size={32} className="text-slate-300 dark:text-slate-700 mb-3" /><p className="text-xs font-sans text-slate-400 dark:text-slate-600">No transactions found</p></div></td></tr>
                : paginated.map((tx, i) => {
                  const sel = detail?.id === tx.id;
                  return (
                    <tr key={tx.id} onClick={() => setDetail(d => d?.id===tx.id ? null : tx)} className={`border-b cursor-pointer transition-colors ${sel ? 'fh-row-sel' : i%2===0 ? 'fh-row-even' : 'fh-row-odd'}`}>
                      <td className="pl-3 pr-2 py-2.5"><span className="text-[9px] font-mono text-slate-400 dark:text-slate-700">{(page-1)*PAGE+i+1}</span></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar id={tx.id} name={tx.user_name||tx.user_email} cls="w-7 h-7 text-[10px]" />
                          <div className="min-w-0">
                            <p className={`text-xs font-semibold truncate ${sel ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>{tx.user_name||'—'}</p>
                            <p className={`text-[10px] font-mono text-slate-500 dark:text-slate-600 truncate ${panelOpen ? 'hidden xl:block' : 'hidden sm:block'}`}>{tx.user_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 ${panelOpen ? 'hidden 2xl:table-cell' : 'hidden md:table-cell'}`}><span className="text-[10px] font-mono text-slate-500 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">{tx.reference}</span></td>
                      <td className="px-3 py-2.5"><span className={`text-sm font-mono font-bold ${tx.status==='SUCCESS' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>{compact(tx.amount)}</span></td>
                      <td className={`px-3 py-2.5 ${panelOpen ? 'hidden xl:table-cell' : 'hidden sm:table-cell'}`}><StatusPill status={tx.status} /></td>
                      <td className={`px-3 py-2.5 ${panelOpen ? 'hidden' : 'hidden lg:table-cell'}`}><span className="text-[10px] font-mono text-slate-500 dark:text-slate-600">{tx.payment_method||'—'}</span></td>
                      <td className={`px-3 py-2.5 ${panelOpen ? 'hidden' : 'hidden xl:table-cell'}`}><span className="text-[10px] font-mono text-slate-500 dark:text-slate-600">{fmtD(tx.created_at)}</span></td>
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={e=>{e.stopPropagation();setDetail(d=>d?.id===tx.id?null:tx);}} className={`px-2.5 py-1 rounded text-[10px] font-sans font-semibold transition-all border ${sel ? 'bg-emerald-500 text-black border-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-emerald-500 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400'}`}>{sel ? '▪ OPEN' : 'VIEW'}</button>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] font-sans text-slate-500 dark:text-slate-600">Page {page}/{totalPages} · {processed.length} records</span>
            <div className="flex gap-1">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="p-1.5 rounded border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"><Icon name="chevron_left" size={13} /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const p = Math.max(1, Math.min(page-2, totalPages-4)) + i; return <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded text-[10px] font-sans font-semibold transition-colors ${p===page ? 'bg-emerald-500 text-black' : 'border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{p}</button>; })}
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="p-1.5 rounded border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"><Icon name="chevron_right" size={13} /></button>
            </div>
          </div>
        )}
      </div>
      <div className="hidden md:flex flex-col flex-shrink-0 fh-panel overflow-hidden" style={{ width: panelOpen ? PANEL_W : 0, minWidth: panelOpen ? PANEL_W : 0, transition:'width 280ms ease,min-width 280ms ease' }}>
        <div className="flex flex-col h-full" style={{ width: PANEL_W, minWidth: PANEL_W }}>
          {detail && (
            <>
              <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-800">
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between mb-4">
                    <Avatar id={detail.id} name={detail.user_name||detail.user_email} cls="w-11 h-11 text-sm" />
                    <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Icon name="close" size={16} /></button>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{detail.user_name||'Unknown'}</h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">{detail.user_email}</p>
                  <div className="flex gap-2 mt-3 flex-wrap"><StatusPill status={detail.status} />{detail.amount_verified && <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700/60 px-2 py-0.5 rounded-sm"><Icon name="verified" size={10} />VERIFIED</span>}</div>
                  <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-[10px] font-sans text-slate-500">AMOUNT</span>
                    <span className={`text-2xl font-mono font-bold ${detail.status==='SUCCESS' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{naira(detail.amount)}</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={THIN}>
                <div>
                  <p className="text-[9px] font-sans font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2">TRANSACTION DETAILS</p>
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800/60 overflow-hidden">
                    {[{k:'TAG',v:detail.reference,mono:true},{k:'ID',v:detail.id,mono:true},{k:'MTD',v:detail.payment_method||'—',mono:false},{k:'CUR',v:detail.currency,mono:false},{k:'CRE',v:fmtDT(detail.created_at),mono:false},{k:'PAI',v:fmtDT(detail.paid_at),mono:false}].map(r => (
                      <div key={r.k} className="flex items-start gap-3 px-4 py-2">
                        <span className="text-[9px] font-sans font-semibold text-slate-600 w-8 flex-shrink-0 mt-0.5">{r.k}</span>
                        <span className={`text-xs font-mono text-slate-600 dark:text-slate-400 break-all flex-1 ${r.mono ? 'text-[10px] text-slate-500' : ''}`}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {detail.metadata && Object.keys(detail.metadata).length > 0 && (
                  <div>
                    <p className="text-[9px] font-sans font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2">METADATA</p>
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800/60 overflow-hidden">
                      {Object.entries(detail.metadata).map(([k,v]) => (<div key={k} className="flex items-start gap-3 px-4 py-2"><span className="text-[10px] font-mono text-slate-600 w-32 flex-shrink-0 truncate">{k}</span><span className="text-[10px] font-mono text-slate-500 break-all flex-1">{String(v)}</span></div>))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[9px] font-sans font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-3">STATUS TIMELINE</p>
                  <div className="space-y-0">
                    {[{label:'Created',time:detail.created_at,done:true},{label:'Processing',time:null,done:detail.status!=='PENDING'},{label:'Confirmed',time:detail.paid_at,done:detail.status==='SUCCESS'}].map((s,i,arr) => (
                      <div key={s.label} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${s.done ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700'}`}><Icon name={s.done ? 'check' : 'radio_button_unchecked'} size={11} className={s.done ? 'text-black' : 'text-slate-400 dark:text-slate-700'} /></div>
                          {i < arr.length-1 && <div className={`w-px h-5 ${s.done ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'}`} />}
                        </div>
                        <div className="pt-0.5 pb-4"><p className={`text-xs font-sans font-semibold ${s.done ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-700'}`}>{s.label}</p>{s.time && <p className="text-[10px] font-mono text-slate-500 dark:text-slate-600">{fmtDT(s.time)}</p>}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {[{icon:'receipt_long',label:'Download Receipt',c:'hover:border-emerald-700 hover:text-emerald-400'},{icon:'mail',label:'Resend Confirmation',c:'hover:border-blue-700 hover:text-blue-400'},{icon:'refresh',label:'Re-verify with Gateway',c:'hover:border-amber-700 hover:text-amber-400'}].map(a => (
                    <button key={a.label} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-sans text-slate-500 dark:text-slate-600 transition-all ${a.c}`}><Icon name={a.icon} size={13} />{a.label}<Icon name="chevron_right" size={11} className="ml-auto text-slate-400 dark:text-slate-700" /></button>
                  ))}
                  {detail.status === 'SUCCESS' && (() => {
                    const rs  = refundMap[detail.id] ?? 'idle';
                    const msg = refundMsg[detail.id] ?? '';
                    const handleRefund = async () => {
                      if (rs === 'done' || rs === 'loading') return;
                      setRefundMap(p => ({ ...p, [detail.id]: 'loading' }));
                      setRefundMsg(p => ({ ...p, [detail.id]: '' }));
                      try {
                        await apiService.post(`payments/admin/transactions/${detail.id}/refund/`, {});
                        setRefundMap(p => ({ ...p, [detail.id]: 'done' }));
                        setRefundMsg(p => ({ ...p, [detail.id]: 'Refund initiated successfully.' }));
                      } catch (e: any) {
                        setRefundMap(p => ({ ...p, [detail.id]: 'error' }));
                        setRefundMsg(p => ({ ...p, [detail.id]: e?.response?.data?.detail ?? e?.message ?? 'Refund failed.' }));
                      }
                    };
                    if (rs === 'done') return (<div className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-emerald-700/50 bg-emerald-900/20 text-xs font-sans text-emerald-400 cursor-default"><Icon name="check_circle" size={13} />Refund Initiated<span className="ml-auto text-[10px] text-emerald-600 font-sans">Completed</span></div>);
                    return (<><button onClick={handleRefund} disabled={rs === 'loading'} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border text-xs font-sans transition-colors ${rs === 'loading' ? 'border-slate-700 bg-slate-800/40 text-slate-500 cursor-wait' : 'border-red-900/60 bg-red-900/20 text-red-400 hover:bg-red-900/40 cursor-pointer'}`}>{rs === 'loading' ? <><div className="w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" />Processing refund…</> : <><Icon name="undo" size={13} />Initiate Refund</>}<Icon name="chevron_right" size={11} className="ml-auto opacity-50" /></button>{rs === 'error' && msg && <p className="text-[10px] font-sans text-red-400 px-1">{msg}</p>}</>);
                  })()}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
TransactionsTab.displayName = 'TransactionsTab';

// ═══════════════════════════════════════════════════════════════════════════
// TAB: GIVING
// ═══════════════════════════════════════════════════════════════════════════

const GivingTab = memo(({ txs, period }: { txs: Tx[]; period: Period }) => {
  const start   = useMemo(() => periodStart(period), [period]);
  const current = useMemo(() => txs.filter(t => t.created_at && new Date(t.created_at) >= start), [txs, start]);
  const success = useMemo(() => current.filter(t => t.status === 'SUCCESS'), [current]);
  const catBreakdown = useMemo(() => {
    const m: Record<string, { total: number; count: number; recurring: number }> = {};
    success.forEach(t => { const c = t.metadata?.giving_category || 'General'; if (!m[c]) m[c] = { total:0, count:0, recurring:0 }; m[c].total += t.amount; m[c].count++; if (t.metadata?.recurring) m[c].recurring++; });
    const grand = Object.values(m).reduce((s, v) => s + v.total, 0) || 1;
    return Object.entries(m).map(([cat, v]) => ({ cat, ...v, pctOfTotal: pct(v.total, grand) })).sort((a, b) => b.total - a.total);
  }, [success]);
  const topGivers = useMemo(() => {
    const m: Record<string, { name: string; email: string; total: number; count: number; lastDate: string|null }> = {};
    success.forEach(t => { if (!m[t.user_email]) m[t.user_email] = { name:t.user_name||t.user_email, email:t.user_email, total:0, count:0, lastDate:null }; m[t.user_email].total += t.amount; m[t.user_email].count++; if (!m[t.user_email].lastDate || (t.paid_at && t.paid_at > m[t.user_email].lastDate!)) m[t.user_email].lastDate = t.paid_at||null; });
    return Object.values(m).sort((a, b) => b.total - a.total).slice(0, 15);
  }, [success]);
  const maxG           = topGivers[0]?.total || 1;
  const recurringCount = success.filter(t => t.metadata?.recurring).length;
  const oneTimeCount   = success.length - recurringCount;
  const uniqueGivers   = new Set(success.map(t => t.user_email)).size;
  const totalRevenue   = success.reduce((s, t) => s + t.amount, 0);
  const avgGift        = success.length ? totalRevenue / success.length : 0;
  const donutSegs      = catBreakdown.map(c => ({ label: c.cat, value: c.total, color: cMeta(c.cat).dot }));
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[{label:'Total Raised',value:compact(totalRevenue),icon:'payments',color:'#10b981'},{label:'Unique Givers',value:String(uniqueGivers),icon:'people',color:'#3b82f6'},{label:'Avg Gift',value:compact(avgGift),icon:'show_chart',color:'#f59e0b'},{label:'Recurring Gifts',value:String(recurringCount),icon:'autorenew',color:'#a78bfa'}].map(s => (
          <Card key={s.label} className="p-4" glow={s.color}>
            <div className="flex items-center justify-between mb-2"><span className="text-[9px] font-sans font-semibold text-slate-600 uppercase tracking-widest">{s.label}</span><div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:`${s.color}22`}}><Icon name={s.icon} size={14} style={{color:s.color}} /></div></div>
            <p className="text-xl font-mono font-bold" style={{color:s.color}}>{s.value}</p>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <p className="text-[9px] font-sans font-semibold text-slate-600 uppercase tracking-widest mb-4">Giving by Category</p>
          <div className="space-y-4">
            {catBreakdown.map(c => { const cm = cMeta(c.cat); return (
              <div key={c.cat}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:cm.dot}} /><span className="text-sm font-sans font-semibold text-slate-300">{c.cat}</span><span className={`text-[10px] font-sans font-semibold px-2 py-0.5 rounded-sm border ${cm.badge}`}>{c.count} gifts</span>{c.recurring > 0 && <span className="text-[10px] font-sans text-slate-600">{c.recurring} recurring</span>}</div>
                  <div className="flex items-center gap-3"><span className="text-xs font-mono font-bold text-slate-400">{c.pctOfTotal}%</span><span className="text-sm font-mono font-bold" style={{color:cm.dot}}>{compact(c.total)}</span></div>
                </div>
                <Bar v={c.pctOfTotal} color={cm.dot} h={6} />
              </div>
            );})}
            {catBreakdown.length === 0 && <p className="text-xs font-sans text-slate-600 py-4 text-center">No giving data in this period</p>}
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-[9px] font-sans font-semibold text-slate-600 uppercase tracking-widest mb-4">Distribution</p>
            <div className="flex justify-center mb-4"><Donut segs={donutSegs.length > 0 ? donutSegs : [{label:'None',value:1,color:'#1e293b'}]} size={130} thick={22} /></div>
            <div className="space-y-1.5">{donutSegs.slice(0,4).map(s => (<div key={s.label} className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:s.color}} /><span className="text-[10px] font-sans text-slate-500 flex-1">{s.label}</span><span className="text-[10px] font-mono text-slate-400">{pct(s.value, totalRevenue)}%</span></div>))}</div>
          </Card>
          <Card className="p-5">
            <p className="text-[9px] font-sans font-semibold text-slate-600 uppercase tracking-widest mb-3">One-time vs Recurring</p>
            <div className="space-y-2">
              {[{label:'One-time',count:oneTimeCount,pctV:pct(oneTimeCount,success.length||1),color:'#3b82f6'},{label:'Recurring',count:recurringCount,pctV:pct(recurringCount,success.length||1),color:'#a78bfa'}].map(r => (<div key={r.label}><div className="flex justify-between mb-1"><span className="text-[10px] font-sans text-slate-500">{r.label}</span><span className="text-[10px] font-mono font-bold" style={{color:r.color}}>{r.count} · {r.pctV}%</span></div><Bar v={r.pctV} color={r.color} h={5} /></div>))}
            </div>
          </Card>
        </div>
      </div>
      <Card>
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between"><span className="text-[9px] font-sans font-semibold text-slate-600 uppercase tracking-widest">Top Givers Leaderboard</span><span className="text-[10px] font-sans text-slate-600">{topGivers.length} donors</span></div>
        <div className="overflow-x-auto" style={THIN}>
          <table className="w-full min-w-[500px] border-collapse">
            <thead><tr className="border-b border-slate-800/60">
              {['RK','DONOR','TOTAL GIVEN','GIFTS','AVG GIFT','LAST GIFT','SHARE'].map((h,hi) => (<th key={h} className={`px-3 py-2.5 text-left ${hi===0?'pl-5':''} ${hi===2?'hidden md:table-cell':''} ${hi===3?'hidden sm:table-cell':''} ${hi===4?'hidden lg:table-cell':''} ${hi===5?'hidden xl:table-cell':''} ${hi===6?'px-5':''}`}><span className="text-[9px] font-sans font-semibold uppercase tracking-widest text-slate-600">{h}</span></th>))}
            </tr></thead>
            <tbody>
              {topGivers.map((g, i) => (
                <tr key={g.email} className={`border-b border-slate-900/60 hover:bg-slate-800/30 transition-colors ${i%2===0?'bg-slate-950':'bg-slate-900/20'}`}>
                  <td className="pl-5 pr-3 py-2.5">{i < 3 ? <span className="text-base">{['🥇','🥈','🥉'][i]}</span> : <span className="text-[10px] font-mono text-slate-600">#{i+1}</span>}</td>
                  <td className="px-3 py-2.5"><div className="flex items-center gap-2"><Avatar id={g.email} name={g.name} cls="w-7 h-7 text-[10px]" /><div className="min-w-0"><p className="text-xs font-semibold text-slate-300 truncate">{g.name}</p><p className="text-[10px] font-mono text-slate-600 truncate hidden sm:block">{g.email}</p></div></div></td>
                  <td className="px-3 py-2.5 hidden md:table-cell"><span className="text-sm font-mono font-bold text-emerald-400">{compact(g.total)}</span></td>
                  <td className="px-3 py-2.5 hidden sm:table-cell"><span className="text-xs font-mono text-slate-400">{g.count}</span></td>
                  <td className="px-3 py-2.5 hidden lg:table-cell"><span className="text-xs font-mono text-slate-500">{compact(g.total / g.count)}</span></td>
                  <td className="px-3 py-2.5 hidden xl:table-cell"><span className="text-[10px] font-mono text-slate-600">{fmtD(g.lastDate)}</span></td>
                  <td className="px-5 py-2.5"><div className="flex items-center gap-2"><Bar v={pct(g.total, maxG)} color="#10b981" h={4} /><span className="text-[10px] font-mono text-slate-600 w-8 flex-shrink-0">{pct(g.total, totalRevenue||1)}%</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
});
GivingTab.displayName = 'GivingTab';

// ═══════════════════════════════════════════════════════════════════════════
// TAB: BUDGET
// ═══════════════════════════════════════════════════════════════════════════

const BudgetTab = memo(() => {
  const totalAlloc = BUDGET_LINES.reduce((s, b) => s + b.allocated, 0);
  const totalSpent = BUDGET_LINES.reduce((s, b) => s + b.spent, 0);
  const remaining  = totalAlloc - totalSpent;
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{label:'Total Budget',value:nairaFull(totalAlloc),icon:'account_balance',color:'#94a3b8'},{label:'Total Spent',value:nairaFull(totalSpent),icon:'payments',color:'#10b981'},{label:'Remaining',value:nairaFull(remaining),icon:remaining>=0?'savings':'warning',color:remaining>=0?'#3b82f6':'#ef4444'}].map(s => (
          <Card key={s.label} className="p-5" glow={s.color}>
            <div className="flex items-center justify-between mb-3"><span className="text-[9px] font-sans font-semibold text-slate-600 uppercase tracking-widest">{s.label}</span><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:`${s.color}22`}}><Icon name={s.icon} size={16} style={{color:s.color}} /></div></div>
            <p className="text-xl font-mono font-bold" style={{color:s.color}}>{s.value}</p>
            {s.label === 'Total Spent' && <div className="mt-3"><Bar v={pct(totalSpent, totalAlloc)} color="#10b981" h={5} /><p className="text-[10px] font-sans text-slate-600 mt-1.5">{pct(totalSpent,totalAlloc)}% of annual budget consumed</p></div>}
          </Card>
        ))}
      </div>
      <Card>
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between"><span className="text-[9px] font-sans font-semibold text-slate-600 uppercase tracking-widest">Budget vs Actual — Dept Breakdown</span><button className="flex items-center gap-1 text-[10px] font-sans text-slate-600 hover:text-emerald-400 transition-colors"><Icon name="edit" size={11} />EDIT</button></div>
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_80px] gap-4 px-5 py-2 border-b border-slate-800/60 bg-slate-800/20">{['DEPARTMENT','ALLOCATED','SPENT','VARIANCE','USAGE'].map(h => <span key={h} className="text-[9px] font-sans font-semibold uppercase tracking-widest text-slate-600">{h}</span>)}</div>
        {BUDGET_LINES.map(b => { const p = pct(b.spent, b.allocated); const over = b.spent > b.allocated; const rem = b.allocated - b.spent; return (
          <div key={b.dept} className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_80px] gap-4 items-center px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0"><div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:`${b.color}22`}}><Icon name={b.icon} size={16} style={{color:b.color}} /></div><div className="min-w-0"><p className="text-sm font-semibold text-slate-300 truncate">{b.dept}</p><Bar v={p} color={over?'#ef4444':b.color} h={3} /></div></div>
              <span className="text-xs font-mono text-slate-500">{nairaFull(b.allocated)}</span>
              <span className="text-xs font-mono font-bold text-slate-300">{nairaFull(b.spent)}</span>
              <span className={`text-xs font-mono font-bold ${rem<0?'text-red-400':'text-emerald-400'}`}>{rem<0?'▲':'▼'} {nairaFull(Math.abs(rem))}</span>
              <div className="flex items-center gap-1.5"><span className={`text-sm font-mono font-bold ${over?'text-red-400':p>80?'text-amber-400':'text-slate-300'}`}>{p}%</span>{over && <Icon name="warning" size={12} className="text-red-500" />}</div>
            </div>
          </div>
        );})}
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_80px] gap-4 items-center px-5 py-3.5 bg-slate-800/30 border-t border-slate-700">
          <span className="text-xs font-sans font-semibold text-slate-400">TOTALS</span><span className="text-xs font-mono font-bold text-slate-400">{nairaFull(totalAlloc)}</span><span className="text-xs font-mono font-bold text-emerald-400">{nairaFull(totalSpent)}</span><span className={`text-xs font-mono font-bold ${remaining<0?'text-red-400':'text-blue-400'}`}>{nairaFull(remaining)}</span><span className="text-sm font-mono font-bold text-slate-300">{pct(totalSpent, totalAlloc)}%</span>
        </div>
      </Card>
      <Card>
        <div className="px-5 py-3 border-b border-slate-800"><span className="text-[9px] font-sans font-semibold text-slate-600 uppercase tracking-widest">Designated Fund Reserves</span></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
          {[{label:'General Fund',amount:14500000,icon:'account_balance_wallet',color:'#94a3b8',note:'Unrestricted'},{label:'Building Fund',amount:8660000,icon:'church',color:'#8b5cf6',note:'For new sanctuary'},{label:'Missions Fund',amount:1650000,icon:'flight',color:'#f59e0b',note:'Kenya Trip FY25'}].map(f => (
            <div key={f.label} className="flex items-center gap-4 p-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:`${f.color}22`}}><Icon name={f.icon} size={22} style={{color:f.color}} /></div>
              <div><p className="text-[10px] font-sans font-semibold text-slate-600 uppercase tracking-widest">{f.label}</p><p className="text-xl font-mono font-bold mt-0.5" style={{color:f.color}}>{nairaFull(f.amount)}</p><p className="text-[10px] font-sans text-slate-600 mt-0.5">{f.note}</p></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
});
BudgetTab.displayName = 'BudgetTab';

// ═══════════════════════════════════════════════════════════════════════════
// TAB: MEMBERS
// ═══════════════════════════════════════════════════════════════════════════

const MembersTab = memo(({ txs }: { txs: Tx[] }) => {
  const [search, setSearch] = useState('');
  const [seg, setSeg]       = useState('ALL');
  const members = useMemo(() => {
    const m: Record<string, { id:string;name:string;email:string;total:number;count:number;lastDate:string|null;firstDate:string|null;cats:Set<string> }> = {};
    txs.filter(t => t.status === 'SUCCESS').forEach(t => { const k = t.user_email; if (!m[k]) m[k] = {id:t.id,name:t.user_name||t.user_email,email:t.user_email,total:0,count:0,lastDate:null,firstDate:null,cats:new Set()}; m[k].total += t.amount; m[k].count++; if (!m[k].lastDate||(t.paid_at&&t.paid_at>m[k].lastDate!)) m[k].lastDate=t.paid_at||null; if (!m[k].firstDate||(t.paid_at&&t.paid_at<m[k].firstDate!)) m[k].firstDate=t.paid_at||null; if (t.metadata?.giving_category) m[k].cats.add(t.metadata.giving_category); });
    return Object.values(m).map(m => ({...m,avg:m.total/m.count,tier:m.total>=1000000?'Major':m.total>=200000?'Regular':'Occasional',categories:Array.from(m.cats)})).sort((a,b)=>b.total-a.total);
  }, [txs]);
  const TIER_STYLE: Record<string,string> = { Major:'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/60', Regular:'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/60', Occasional:'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-500 border-slate-200 dark:border-slate-700' };
  const filtered = useMemo(() => { const q = search.toLowerCase().trim(); return members.filter(m => seg==='ALL'||m.tier===seg).filter(m => !q||m.name.toLowerCase().includes(q)||m.email.toLowerCase().includes(q)); }, [members, seg, search]);
  const maxTotal = members[0]?.total || 1;
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="fh-toolbar px-4 py-2.5 flex-shrink-0 flex items-center gap-2 overflow-x-auto" style={THIN}>
        <div className="relative w-52 flex-shrink-0">
          <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" />
          <input type="text" placeholder="Name or email…" value={search} onChange={e => setSearch(e.target.value)} className="fh-input w-full pl-8 pr-6 py-1.5 rounded-md text-xs font-sans focus:outline-none focus:border-emerald-600" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400"><Icon name="close" size={11} /></button>}
        </div>
        {['ALL','Major','Regular','Occasional'].map(s => (<button key={s} onClick={() => setSeg(s)} className={`flex-shrink-0 px-3 py-1.5 rounded-md text-[10px] font-sans font-semibold border transition-colors ${seg===s?'bg-emerald-500 text-black border-emerald-400':'fh-input'}`}>{s}</button>))}
        <span className="ml-auto text-[10px] font-sans text-slate-500 dark:text-slate-600">{filtered.length} members</span>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-auto" style={THIN}>
        <table className="w-full border-collapse min-w-[640px]">
          <thead className="sticky top-0 z-10"><tr className="fh-thead">
            {['#','MEMBER','TIER','TOTAL GIVEN','GIFTS','AVG GIFT','FIRST GIFT','LAST GIFT','LTV BAR'].map((h,hi) => (<th key={h} className={`px-3 py-2.5 text-left ${hi===0?'pl-4 pr-2 w-8':''} ${hi===2?'hidden sm:table-cell':''} ${hi===5?'hidden md:table-cell':''} ${hi===6?'hidden lg:table-cell':''} ${hi===7?'hidden xl:table-cell':''} ${hi===8?'px-4':''}`}><span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-600">{h}</span></th>))}
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={9}><div className="flex flex-col items-center justify-center py-20"><Icon name="groups" size={32} className="text-slate-300 dark:text-slate-700 mb-3" /><p className="text-xs font-sans text-slate-400 dark:text-slate-600">No members found</p></div></td></tr>
              : filtered.map((m, i) => (
                <tr key={m.email} className={`border-b cursor-pointer transition-colors ${i%2===0?'fh-row-even':'fh-row-odd'}`}>
                  <td className="pl-4 pr-2 py-2.5">{i<3?<span className="text-base">{['🥇','🥈','🥉'][i]}</span>:<span className="text-[9px] font-mono text-slate-400 dark:text-slate-700">{String(i+1).padStart(2,'0')}</span>}</td>
                  <td className="px-3 py-2.5"><div className="flex items-center gap-2.5"><Avatar id={m.email} name={m.name} cls="w-7 h-7 text-[10px]" /><div className="min-w-0"><p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{m.name}</p><p className="text-[10px] font-mono text-slate-500 dark:text-slate-600 truncate hidden sm:block">{m.email}</p></div></div></td>
                  <td className="px-3 py-2.5 hidden sm:table-cell"><span className={`text-[10px] font-sans font-semibold border px-2 py-0.5 rounded-sm ${TIER_STYLE[m.tier]}`}>{m.tier.toUpperCase()}</span></td>
                  <td className="px-3 py-2.5"><span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">{compact(m.total)}</span></td>
                  <td className="px-3 py-2.5 hidden sm:table-cell"><span className="text-xs font-mono text-slate-500">{m.count}</span></td>
                  <td className="px-3 py-2.5 hidden md:table-cell"><span className="text-xs font-mono text-slate-500">{compact(m.avg)}</span></td>
                  <td className="px-3 py-2.5 hidden lg:table-cell"><span className="text-[10px] font-mono text-slate-500 dark:text-slate-600">{fmtD(m.firstDate)}</span></td>
                  <td className="px-3 py-2.5 hidden xl:table-cell"><span className="text-[10px] font-mono text-slate-500 dark:text-slate-600">{fmtD(m.lastDate)}</span></td>
                  <td className="px-4 py-2.5"><div className="flex items-center gap-2"><div className="w-24"><Bar v={pct(m.total, maxTotal)} color="#10b981" h={4} /></div><span className="text-[9px] font-mono text-slate-500 dark:text-slate-600">{pct(m.total, maxTotal)}%</span></div></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
});
MembersTab.displayName = 'MembersTab';

// ═══════════════════════════════════════════════════════════════════════════
// TAB: REPORTS
// ═══════════════════════════════════════════════════════════════════════════

const ReportsTab = memo(({ txs }: { txs: Tx[] }) => {
  const [gen, setGen] = useState<string|null>(null);
  const go = (id: string) => { setGen(id); setTimeout(() => { setGen(null); if (id === 'transactions') exportCSV(txs); }, 1400); };
  const reports = [
    {id:'transactions',icon:'receipt_long',title:'Full Transactions',desc:'All payments with status, amounts, user data and timestamps.',tag:'CSV',color:'#10b981'},
    {id:'giving',icon:'volunteer_activism',title:'Giving Summary',desc:'Aggregated giving by category, donor and time period.',tag:'PDF',color:'#3b82f6'},
    {id:'budget',icon:'account_balance',title:'Budget vs Actual',desc:'Dept-level budget allocation, expenditure and variance analysis.',tag:'XLSX',color:'#8b5cf6'},
    {id:'members',icon:'groups',title:'Member Giving History',desc:'Individual donor records, LTV, frequency and last gift date.',tag:'CSV',color:'#f59e0b'},
    {id:'monthly',icon:'bar_chart',title:'Monthly Revenue',desc:'Month-by-month revenue for the current fiscal year.',tag:'PDF',color:'#ec4899'},
    {id:'audit',icon:'policy',title:'Audit Trail',desc:'Full immutable log of all financial mutations and admin actions.',tag:'PDF',color:'#64748b'},
    {id:'failed',icon:'cancel',title:'Failed Transactions',desc:'All failed / declined payments with error codes and retry status.',tag:'CSV',color:'#ef4444'},
    {id:'tax',icon:'receipt',title:'Tax / Donation Report',desc:'Donor receipts and donation summary for tax compliance filing.',tag:'PDF',color:'#0ea5e9'},
  ];
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-sm font-display font-semibold text-slate-800 dark:text-slate-300">Financial Reports</h2><p className="text-[10px] font-sans text-slate-600 mt-0.5">Generate, download and schedule financial reports</p></div>
        <div className="flex items-center gap-1.5 text-[10px] font-sans text-slate-600"><Icon name="schedule" size={12} /><span>Data current as of {fmtD(new Date().toISOString())}</span></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {reports.map(r => (
          <Card key={r.id} className="overflow-hidden hover:border-slate-700 transition-all group cursor-pointer" glow={r.color}>
            <div className="h-0.5 w-full" style={{background:`linear-gradient(90deg, ${r.color}80, ${r.color}20)`}} />
            <div className="p-4">
              <div className="flex items-start justify-between mb-3"><div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:`${r.color}22`}}><Icon name={r.icon} size={18} style={{color:r.color}} /></div><span className="text-[9px] font-sans font-semibold border rounded-sm px-1.5 py-0.5" style={{color:r.color,borderColor:`${r.color}44`,background:`${r.color}11`}}>{r.tag}</span></div>
              <h3 className="text-xs font-sans font-semibold text-slate-800 dark:text-slate-200 mb-1">{r.title}</h3>
              <p className="text-[10px] font-sans text-slate-600 leading-relaxed mb-4">{r.desc}</p>
              <button onClick={() => go(r.id)} disabled={gen === r.id} className="w-full h-8 rounded-lg text-[10px] font-sans font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50" style={gen===r.id?{background:'#1e293b',color:'#475569'}:{background:`${r.color}22`,color:r.color,border:`1px solid ${r.color}44`}}>
                {gen===r.id?<><div className="w-3 h-3 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />GENERATING…</>:<><Icon name="download" size={12} />GENERATE {r.tag}</>}
              </button>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between"><span className="text-[9px] font-sans font-semibold text-slate-600 uppercase tracking-widest">Scheduled Reports</span><button className="flex items-center gap-1 text-[10px] font-sans text-emerald-500 hover:text-emerald-400 transition-colors"><Icon name="add" size={12} />NEW SCHEDULE</button></div>
        <div className="p-8 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mb-3"><Icon name="schedule_send" size={26} className="text-slate-600" /></div>
          <p className="text-sm font-sans font-semibold text-slate-500">No scheduled reports configured</p>
          <p className="text-xs font-sans text-slate-600 mt-1.5 max-w-xs">Set up automatic weekly or monthly reports delivered directly to your inbox.</p>
          <button className="mt-5 flex items-center gap-1.5 bg-emerald-900/40 border border-emerald-700/60 text-emerald-400 text-[10px] font-sans font-semibold px-4 py-2 rounded-lg hover:bg-emerald-900/60 transition-colors"><Icon name="add" size={12} />CREATE SCHEDULE</button>
        </div>
      </Card>
    </div>
  );
});
ReportsTab.displayName = 'ReportsTab';

// ═══════════════════════════════════════════════════════════════════════════
// OTP DOT DISPLAY — animated individual digit boxes
// ═══════════════════════════════════════════════════════════════════════════

const OtpDots = memo(({ value, maxLen = 6 }: { value: string; maxLen?: number }) => (
  <div className="flex items-center justify-center gap-2.5 py-1">
    {Array.from({ length: maxLen }, (_, i) => {
      const ch = value[i] || '';
      const isActive = i === value.length;
      return (
        <div key={i} className="transition-all duration-100"
          style={{
            width: 44, height: 56, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontFamily: 'monospace', fontWeight: 700,
            border: `2px solid ${ch ? '#f59e0b' : isActive ? 'rgba(245,158,11,0.5)' : '#334155'}`,
            background: ch ? 'rgba(245,158,11,0.12)' : isActive ? 'rgba(245,158,11,0.05)' : '#1e293b',
            color: ch ? '#fbbf24' : '#475569',
            transform: ch ? 'scale(1.05)' : 'scale(1)',
          }}>
          {ch || (isActive ? '|' : '·')}
        </div>
      );
    })}
  </div>
));
OtpDots.displayName = 'OtpDots';

// ═══════════════════════════════════════════════════════════════════════════
// TAB: PAYOUTS — FIXED with full OTP flow
// Steps: form → initiating → otp → verifying → done
// ═══════════════════════════════════════════════════════════════════════════

type WStep = 'form' | 'initiating' | 'otp' | 'verifying' | 'done';
type WFinal = 'completed' | 'failed' | 'unknown';

const PayoutsTab = memo(() => {

  // ── Balance ──────────────────────────────────────────────────────────────
  const [balance,      setBalance]      = useState<number | null>(null); // kobo
  const [balLoading,   setBalLoading]   = useState(true);
  const [balError,     setBalError]     = useState('');
  const [balFetchedAt, setBalFetchedAt] = useState<Date | null>(null);

  // ── Lists ─────────────────────────────────────────────────────────────────
  const [bankAccounts, setBankAccounts] = useState<BankAcct[]>([]);
  const [withdrawals,  setWithdrawals]  = useState<WithdrawalRecord[]>([]);
  const [histLoading,  setHistLoading]  = useState(true);

  // ── Modal ────────────────────────────────────────────────────────────────
  const [showWithdraw, setShowWithdraw] = useState(false);

  // ── Withdrawal form ───────────────────────────────────────────────────────
  const [wAmt,      setWAmt]      = useState('');
  const [wBankId,   setWBankId]   = useState('');
  const [wBankMode, setWBankMode] = useState<'saved'|'new'>('saved');
  const [wAcctName, setWAcctName] = useState('');
  const [wAcctNum,  setWAcctNum]  = useState('');
  const [wBankName, setWBankName] = useState('');
  const [wBankCode, setWBankCode] = useState('');
  const [wErr,      setWErr]      = useState('');
  const [wLoading,  setWLoading]  = useState(false);

  // ── Step machine ──────────────────────────────────────────────────────────
  const [wStep,        setWStep]        = useState<WStep>('form');
  const [wFinalStatus, setWFinalStatus] = useState<WFinal>('unknown');
  const [wStepMsg,     setWStepMsg]     = useState('');

  // ── OTP fields ────────────────────────────────────────────────────────────
  const [otpWdrId,   setOtpWdrId]   = useState('');
  const [otpTxCode,  setOtpTxCode]  = useState('');
  const [otpVal,     setOtpVal]     = useState('');
  const [otpErr,     setOtpErr]     = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const otpInputRef  = useRef<HTMLInputElement>(null);

  // Focus OTP input when we enter that step
  useEffect(() => {
    if (wStep === 'otp') setTimeout(() => otpInputRef.current?.focus(), 120);
  }, [wStep]);

  // ── Fetch balance ─────────────────────────────────────────────────────────
  const fetchBalance = useCallback(async () => {
    setBalLoading(true);
    setBalError('');
    try {
      const res = await apiService.get<{ balance: number }>('payments/admin/paystack-balance/');
      setBalance(res.balance);
      setBalFetchedAt(new Date());
    } catch {
      setBalError('Unable to fetch balance. Check Paystack key / network.');
    } finally {
      setBalLoading(false);
    }
  }, []);

  // ── Fetch history + accounts ──────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const [acctRes, histRes] = await Promise.allSettled([
        apiService.get<any>('withdrawals/bank-accounts/'),
        apiService.get<any>('admin/withdrawals/'),
      ]);
      if (acctRes.status === 'fulfilled') {
        const list: BankAcct[] = Array.isArray(acctRes.value) ? acctRes.value : (acctRes.value?.results ?? []);
        setBankAccounts(list);
        if (list.length > 0) { setWBankId(list[0].id); setWBankMode('saved'); } else { setWBankMode('new'); }
      }
      if (histRes.status === 'fulfilled') {
        const list: WithdrawalRecord[] = Array.isArray(histRes.value) ? histRes.value : (histRes.value?.results ?? []);
        setWithdrawals(list);
      }
    } finally {
      setHistLoading(false);
    }
  }, []);

  useEffect(() => { fetchBalance(); fetchHistory(); }, [fetchBalance, fetchHistory]);

  // ── Reset modal ───────────────────────────────────────────────────────────
  const resetModal = useCallback(() => {
    setShowWithdraw(false);
    setWStep('form');
    setWFinalStatus('unknown');
    setWStepMsg('');
    setWAmt('');
    setWAcctName(''); setWAcctNum(''); setWBankName(''); setWBankCode('');
    setWErr('');
    setWLoading(false);
    setOtpVal(''); setOtpErr('');
    setOtpLoading(false);
    setOtpWdrId(''); setOtpTxCode('');
  }, []);

  // ── Checks ANY field in a response object for a specific status string ────
  // This is intentionally broad — covers flat, nested, and wrapped shapes.
  const anyFieldIs = (obj: any, target: string): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    const t = target.toLowerCase();
    // Check direct fields first
    const candidates = [
      obj?.status, obj?.withdrawal?.status, obj?.data?.status,
      obj?.withdrawal?.data?.status, obj?.result?.status,
    ];
    if (candidates.some(v => typeof v === 'string' && v.toLowerCase() === t)) return true;
    // Deep scan one more level for safety
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (typeof v === 'string' && v.toLowerCase() === t) return true;
      if (v && typeof v === 'object' && typeof v.status === 'string' && v.status.toLowerCase() === t) return true;
    }
    return false;
  };

  // ── Extract transfer code from any response/withdrawal shape ─────────────
  const findTxCode = (obj: any): string => {
    if (!obj || typeof obj !== 'object') return '';
    const candidates = [
      obj?.paystack_transfer_code,
      obj?.withdrawal?.paystack_transfer_code,
      obj?.transaction?.paystack_transfer_code,
      obj?.data?.paystack_transfer_code,
      obj?.withdrawal?.transaction?.paystack_transfer_code,
    ];
    return candidates.find(v => typeof v === 'string' && v) ?? '';
  };

  // ── Apply OTP-required state — opens the OTP input screen ────────────────
  const applyOtpRequired = (wdrId: string, txCode: string) => {
    setOtpWdrId(wdrId);
    setOtpTxCode(txCode);
    setOtpVal('');
    setOtpErr('');
    setWStep('otp');
  };

  // ── Check a single response / withdrawal record and act on its status ─────
  // Returns true if a terminal action was taken (otp / done), false to keep polling.
  const handleWdrStatus = (
    obj: any,
    wdrId: string,
  ): boolean => {
    if (anyFieldIs(obj, 'otp_required')) {
      applyOtpRequired(wdrId, findTxCode(obj));
      return true;
    }
    if (anyFieldIs(obj, 'completed')) {
      setWFinalStatus('completed'); setWStep('done');
      fetchHistory(); fetchBalance();
      return true;
    }
    if (anyFieldIs(obj, 'failed')) {
      setWFinalStatus('failed');
      setWStepMsg(
        obj?.failure_reason ?? obj?.withdrawal?.failure_reason
        ?? 'The withdrawal could not be completed.'
      );
      setWStep('done'); fetchHistory();
      return true;
    }
    return false;
  };

  // ── Submit withdrawal ─────────────────────────────────────────────────────
  const submitWithdrawal = async () => {
    setWErr('');
    const amt = parseFloat(wAmt);
    if (!wAmt || isNaN(amt) || amt <= 0) { setWErr('Enter a valid amount.'); return; }
    if (balance !== null && amt * 100 > balance) {
      setWErr(`Amount exceeds available balance (${naira(balance)}).`); return;
    }
    let bankAccountId = wBankId;
    if (wBankMode === 'new') {
      if (!wAcctName.trim()) { setWErr('Enter account holder name.'); return; }
      if (!wAcctNum.trim() || wAcctNum.trim().length < 10) { setWErr('Enter a valid 10-digit account number.'); return; }
      if (!wBankName.trim()) { setWErr('Enter bank name.'); return; }
      if (!wBankCode.trim()) { setWErr('Enter Paystack bank code.'); return; }
    } else if (!bankAccountId) {
      setWErr('Select a bank account.'); return;
    }

    setWLoading(true);
    try {
      // ① Create bank account if new
      if (wBankMode === 'new') {
        const bank = await apiService.post<any>('withdrawals/bank-accounts/', {
          account_name: wAcctName.trim(), account_number: wAcctNum.trim(),
          bank_name: wBankName.trim(), bank_code: wBankCode.trim(),
        });
        bankAccountId = bank.id;
      }

      // ② Create withdrawal
      const created = await apiService.post<any>('withdrawals/', {
        bank_account: bankAccountId,
        amount: amt.toFixed(2),
        currency: 'NGN',
      });
      const wdrId = created.id;

      // ③ Approve — process_withdrawal() is synchronous on your backend.
      //    Paystack sends the OTP within ~2ms of this returning.
      //    We do NOT poll. We go straight to the OTP input screen.
      await apiService.post<any>(`admin/withdrawals/${wdrId}/approve/`, {});

      setWLoading(false);
      fetchHistory();

      // ④ Fetch the withdrawal record ONCE to grab the transfer code for display.
      //    We do this in the background — the OTP screen opens immediately
      //    regardless of whether this fetch succeeds.
      setOtpWdrId(wdrId);
      setOtpTxCode('');   // will be filled in below if fetch succeeds
      setOtpVal('');
      setOtpErr('');
      setWStep('otp');    // ← GO STRAIGHT TO OTP SCREEN — no polling

      // Background fetch of transfer code (display only, not required to submit OTP)
      apiService.get<any>(`admin/withdrawals/${wdrId}/`).then(w => {
        const txc =
          w?.paystack_transfer_code
          ?? w?.transaction?.paystack_transfer_code
          ?? w?.withdrawal?.paystack_transfer_code
          ?? '';
        if (txc) setOtpTxCode(txc);
      }).catch(() => { /* transfer code display is optional */ });
    } catch (e: any) {
      const msg = e?.response?.data?.detail
        ?? e?.response?.data?.amount?.[0]
        ?? e?.message
        ?? 'Withdrawal failed.';
      setWErr(msg);
      setWStep('form');
    } finally {
      setWLoading(false);
    }
  };

  // ── Submit OTP → POST to finalize-otp → poll final status ────────────────
  const submitOtp = async () => {
    if (otpVal.trim().length < 4) { setOtpErr('Enter the OTP sent to your email / SMS.'); return; }
    setOtpLoading(true);
    setOtpErr('');
    setWStep('verifying');

    try {
      // POST withdrawals/{id}/finalize-otp/
      // Body matches what testWithdrawals.py posts to Paystack's finalize endpoint
      const result = await apiService.post<any>(`withdrawals/${otpWdrId}/finalize-otp/`, {
        transfer_code: otpTxCode,
        otp: otpVal.trim(),
      });

      // Some backends set the withdrawal to 'completed' immediately after OTP
      if (result?.withdrawal_status === 'completed') {
        setWFinalStatus('completed');
        setWStep('done');
        fetchHistory(); fetchBalance();
        return;
      }

      // Otherwise poll for final status (webhook may arrive async)
      let attempts = 0;
      const pollFinal = async () => {
        attempts++;
        try {
          const w = await apiService.get<any>(`admin/withdrawals/${otpWdrId}/`);
          if (w.status === 'completed') {
            setWFinalStatus('completed');
            setWStep('done');
            fetchHistory(); fetchBalance();
          } else if (w.status === 'failed') {
            setWFinalStatus('failed');
            setWStepMsg(w.failure_reason || 'Transfer failed after OTP confirmation.');
            setWStep('done');
            fetchHistory();
          } else if (attempts < 15) {
            setTimeout(pollFinal, 3000);
          } else {
            // OTP accepted; Paystack webhook will finalise — tell user to check history
            setWFinalStatus('unknown');
            setWStepMsg('OTP accepted. Paystack is finalising the transfer — check Payout History shortly.');
            setWStep('done');
            fetchHistory();
          }
        } catch {
          if (attempts < 15) setTimeout(pollFinal, 3000);
        }
      };
      setTimeout(pollFinal, 3000);
    } catch (e: any) {
      const msg = e?.response?.data?.detail
        ?? e?.response?.data?.message
        ?? e?.message
        ?? 'OTP rejected. Try again.';
      setOtpErr(msg);
      setWStep('otp');    // ← return to OTP screen on error, NOT to form
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Resume a processing/otp_required withdrawal from the table ─────────────
  const resumeWithdrawal = useCallback(async (w: WithdrawalRecord) => {
    const eff = effectiveStatus(w);
    if (!['processing', 'otp_required'].includes(eff)) return;
    resetModal();

    if (eff === 'otp_required') {
      setShowWithdraw(true);
      setWStep('initiating'); // brief spinner while fetching transfer code
      try {
        const detail = await apiService.get<any>(`admin/withdrawals/${w.id}/`);
        const txCode = detail?.paystack_transfer_code
          ?? detail?.transaction?.paystack_transfer_code ?? '';
        setOtpWdrId(w.id);
        setOtpTxCode(txCode);
        setOtpVal('');
        setOtpErr('');
        setWStep('otp');
      } catch {
        setWStep('form');
      }
    } else {
      // status === 'processing' — open in initiating step and poll
      setShowWithdraw(true);
      setOtpWdrId(w.id);
      setWStep('initiating');
      let attempts = 0;
      const poll = () => {
        attempts++;
        apiService.get<any>(`admin/withdrawals/${w.id}/`).then(detail => {
          if (detail.status === 'otp_required') {
            const txCode = detail?.paystack_transfer_code
              ?? detail?.transaction?.paystack_transfer_code ?? '';
            setOtpWdrId(w.id);
            setOtpTxCode(txCode);
            setOtpVal(''); setOtpErr('');
            setWStep('otp');
          } else if (detail.status === 'completed') {
            setWFinalStatus('completed'); setWStep('done');
            fetchHistory(); fetchBalance();
          } else if (detail.status === 'failed') {
            setWFinalStatus('failed');
            setWStepMsg(detail.failure_reason || 'Transfer failed.');
            setWStep('done'); fetchHistory();
          } else if (attempts < 8) {
            setTimeout(poll, 3000);
          } else {
            setWFinalStatus('unknown');
            setWStepMsg('Still processing — check Payout History for the final status.');
            setWStep('done');
          }
        }).catch(() => { if (attempts < 8) setTimeout(poll, 3000); });
      };
      setTimeout(poll, 2000);
    }
  }, [resetModal, fetchHistory, fetchBalance]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const completedWdrs = withdrawals.filter(w => w.status === 'completed');
  const failedWdrs    = withdrawals.filter(w => ['failed', 'timed_out'].includes(effectiveStatus(w)));
  const pendingWdrs   = withdrawals.filter(w => ['pending','approved','processing','otp_required'].includes(effectiveStatus(w)));
  const totalOut      = completedWdrs.reduce((s, w) => s + Number(w.amount), 0);

  // ── Modal header meta ─────────────────────────────────────────────────────
  const modalAccentColor =
    wStep === 'otp' || wStep === 'verifying' ? '#f59e0b'
    : wStep === 'done' && wFinalStatus === 'completed' ? '#10b981'
    : wStep === 'done' && wFinalStatus === 'failed' ? '#ef4444'
    : '#10b981';

  const modalTitle =
    wStep === 'form'        ? 'Initiate Withdrawal'
    : wStep === 'initiating'? 'Processing Transfer…'
    : wStep === 'otp'       ? 'OTP Verification Required'
    : wStep === 'verifying' ? 'Confirming OTP…'
    : wFinalStatus === 'completed' ? 'Withdrawal Sent!'
    : wFinalStatus === 'failed'    ? 'Withdrawal Failed'
    :                                'Transfer In Progress';

  const modalSubtitle =
    wStep === 'form'        ? 'Funds deducted from Paystack balance'
    : wStep === 'initiating'? 'Waiting for Paystack to request OTP…'
    : wStep === 'otp'       ? 'Enter the one-time password Paystack sent you'
    : wStep === 'verifying' ? 'Submitting OTP to Paystack…'
    : wFinalStatus === 'completed' ? 'Funds are on their way to your bank'
    : wFinalStatus === 'failed'    ? 'See reason below'
    :                                'Paystack will confirm shortly';

  const canCloseModal = wStep === 'form' || wStep === 'done';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* ── Balance + Initiate ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Card className="md:col-span-2 p-6" glow="#10b981">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-sans font-semibold text-slate-500 uppercase tracking-widest mb-3">Paystack Available Balance</p>
              {balLoading
                ? <div className="h-10 w-52 bg-slate-800 rounded-lg animate-pulse" />
                : balError
                ? <p className="text-sm font-sans text-red-400">{balError}</p>
                : <p className="text-4xl font-mono font-bold tracking-tight text-emerald-400">{balance !== null ? naira(balance) : '—'}</p>
              }
              {balFetchedAt && !balLoading && !balError && (
                <p className="text-[10px] font-sans text-slate-600 mt-1.5">Fetched at {balFetchedAt.toLocaleTimeString()}</p>
              )}
            </div>
            <button onClick={fetchBalance} disabled={balLoading}
              className="ml-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-emerald-600 hover:text-emerald-400 text-[10px] font-sans font-semibold transition-colors disabled:opacity-40 flex-shrink-0">
              <Icon name="refresh" size={12} className={balLoading ? 'fh-spin' : ''} />UPDATE
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              onClick={() => {
                resetModal();
                setShowWithdraw(true);
                setWBankMode(bankAccounts.length > 0 ? 'saved' : 'new');
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-sans font-semibold text-black transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 0 18px #10b98140' }}>
              <Icon name="send" size={15} />Initiate Withdrawal
            </button>
            <p className="text-[11px] font-sans text-slate-600 leading-relaxed">
              Amount must not exceed balance shown above.<br />
              Paystack will send an <span className="text-amber-400/80 font-semibold">OTP</span> to confirm before disbursing.
            </p>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-[9px] font-sans font-semibold text-slate-500 uppercase tracking-widest mb-4">Withdrawal Summary</p>
          <div className="space-y-3">
            {[
              { label:'Total Withdrawn', value:`₦${totalOut.toLocaleString()}`,       color:'#10b981' },
              { label:'Completed',       value:completedWdrs.length.toString(),        color:'#10b981' },
              { label:'In Progress',     value:pendingWdrs.length.toString(),          color:'#f59e0b' },
              { label:'Failed',          value:failedWdrs.length.toString(),           color:'#f87171' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-1 border-b border-slate-800 last:border-0">
                <span className="text-[11px] font-sans text-slate-500">{s.label}</span>
                <span className="text-sm font-mono font-bold" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Withdrawal History ── */}
      <Card>
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-[9px] font-sans font-semibold text-slate-600 uppercase tracking-widest">Withdrawal History</span>
          <button onClick={fetchHistory} className="flex items-center gap-1.5 text-[10px] font-sans text-slate-600 hover:text-emerald-400 transition-colors">
            <Icon name="refresh" size={11} />Refresh
          </button>
        </div>
        {histLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full fh-spin" />
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Icon name="send" size={32} className="text-slate-700" />
            <p className="text-xs font-sans text-slate-600">No withdrawals yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto" style={THIN}>
            <table className="w-full min-w-[580px] border-collapse">
              <thead>
                <tr className="fh-thead">
                  {['#','REFERENCE','AMOUNT','STATUS','DATE','NOTE'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left">
                      <span className="text-[9px] font-sans font-semibold uppercase tracking-widest text-slate-600">{h}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w, i) => {
                  const eff = effectiveStatus(w);
                  const sm  = WSTATUS[eff] ?? { color:'#64748b', bg:'bg-slate-800', label: eff };
                  const isResumable = ['processing', 'otp_required'].includes(eff);
                  const noteText = eff === 'timed_out'
                    ? 'Timed out — Paystack did not confirm within 30 min'
                    : (w.failure_reason || '—');
                  return (
                    <tr
                      key={w.id}
                      onClick={isResumable ? () => resumeWithdrawal(w) : undefined}
                      title={isResumable ? 'Click to resume — re-enter OTP or check status' : undefined}
                      className={`border-b transition-colors ${
                        i%2===0 ? 'fh-row-even' : 'fh-row-odd'
                      } ${
                        isResumable ? 'cursor-pointer hover:bg-amber-900/10' : ''
                      }`}>
                      <td className="px-4 py-2.5"><span className="text-[9px] font-mono text-slate-600">{i+1}</span></td>
                      <td className="px-4 py-2.5"><span className="text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 rounded">{w.reference}</span></td>
                      <td className="px-4 py-2.5"><span className="text-sm font-mono font-bold text-emerald-400">₦{Number(w.amount).toLocaleString()}</span></td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-sans font-semibold ${sm.bg} ${
                          isResumable ? 'animate-pulse' : ''
                        }`} style={{ color: sm.color }}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sm.color }} />
                          {sm.label.toUpperCase()}
                          {isResumable && <span className="text-[8px] opacity-60 ml-0.5">↩ resume</span>}
                        </span>
                      </td>
                      <td className="px-4 py-2.5"><span className="text-[10px] font-mono text-slate-500">{fmtD(w.requested_at)}</span></td>
                      <td className="px-4 py-2.5 max-w-[200px]"><span className="text-[10px] font-sans text-slate-600 truncate block" title={noteText}>{noteText}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>


      {/* ══════════════════════ WITHDRAWAL MODAL ══════════════════════ */}
      {showWithdraw && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget && canCloseModal) resetModal(); }}>

          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Step accent bar */}
            <div className="h-1 w-full transition-all duration-500"
              style={{ background: `linear-gradient(90deg, ${modalAccentColor}, ${modalAccentColor}80)` }} />

            {/* Modal header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
                  style={{ background: `${modalAccentColor}20` }}>
                  {wStep === 'otp' || wStep === 'verifying'
                    ? <Icon name="lock" size={18} style={{ color: '#f59e0b' }} />
                    : wStep === 'done' && wFinalStatus === 'completed'
                    ? <Icon name="check_circle" size={18} style={{ color: '#10b981' }} />
                    : wStep === 'done' && wFinalStatus === 'failed'
                    ? <Icon name="error_outline" size={18} style={{ color: '#ef4444' }} />
                    : <Icon name="send" size={18} style={{ color: '#10b981' }} />}
                </div>
                <div>
                  <p className="text-sm font-sans font-semibold text-slate-100">{modalTitle}</p>
                  <p className="text-[10px] font-sans text-slate-500 mt-0.5">{modalSubtitle}</p>
                </div>
              </div>
              <button onClick={resetModal} disabled={!canCloseModal}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <Icon name="close" size={16} />
              </button>
            </div>


            {/* ── STEP: form ── */}
            {wStep === 'form' && (
              <>
                <div className="px-6 py-5 space-y-4">

                  {/* Balance pill */}
                  {balance !== null && (
                    <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-700/40"
                      style={{ background: 'rgba(16,185,129,0.07)' }}>
                      <span className="text-[11px] font-sans text-slate-400">Available Balance</span>
                      <span className="text-xl font-mono font-bold text-emerald-400">{naira(balance)}</span>
                    </div>
                  )}

                  {/* Bank selector */}
                  <div>
                    <label className="text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Destination Account</label>
                    <div className="flex gap-2 mb-2">
                      <button type="button" onClick={() => setWBankMode('saved')} disabled={bankAccounts.length === 0}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-sans border transition-colors ${wBankMode==='saved' ? 'border-emerald-600 text-emerald-400 bg-emerald-900/20' : 'border-slate-700 text-slate-400 hover:border-slate-600'} disabled:opacity-40 disabled:cursor-not-allowed`}>
                        Use Saved
                      </button>
                      <button type="button" onClick={() => setWBankMode('new')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-sans border transition-colors ${wBankMode==='new' ? 'border-emerald-600 text-emerald-400 bg-emerald-900/20' : 'border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                        Enter New
                      </button>
                    </div>

                    {wBankMode === 'saved' ? (
                      bankAccounts.length === 0
                        ? <div className="p-3 rounded-lg border border-amber-700/40 bg-amber-900/20 text-[11px] font-sans text-amber-400">No saved bank accounts. Switch to "Enter New".</div>
                        : (
                          <select value={wBankId} onChange={e => setWBankId(e.target.value)}
                            className="fh-input w-full rounded-lg px-3 py-2.5 text-sm font-sans focus:outline-none focus:border-emerald-600">
                            {bankAccounts.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.account_name} — {b.bank_name} (****{b.account_number.slice(-4)})
                              </option>
                            ))}
                          </select>
                        )
                    ) : (
                      <div className="space-y-2">
                        <input type="text" value={wAcctName} onChange={e => setWAcctName(e.target.value)} placeholder="Account holder name"
                          className="fh-input w-full rounded-lg px-3 py-2.5 text-sm font-sans focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30" />
                        <input type="text" inputMode="numeric" maxLength={20} value={wAcctNum}
                          onChange={e => setWAcctNum(e.target.value.replace(/\D/g,''))} placeholder="Account number"
                          className="fh-input w-full rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input type="text" value={wBankName} onChange={e => setWBankName(e.target.value)} placeholder="Bank name"
                            className="fh-input w-full rounded-lg px-3 py-2.5 text-sm font-sans focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30" />
                          <input type="text" value={wBankCode} onChange={e => setWBankCode(e.target.value.trim())} placeholder="Bank code (e.g. 058)"
                            className="fh-input w-full rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30" />
                        </div>
                        <p className="text-[10px] font-sans text-slate-500">058 = GTBank · 033 = UBA · 057 = Zenith · 044 = Access</p>
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-[10px] font-sans font-semibold text-slate-400 uppercase tracking-widest block mb-1.5">Amount (₦)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono text-slate-500">₦</span>
                      <input type="number" min="1" step="1" value={wAmt} onChange={e => setWAmt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && submitWithdrawal()} placeholder="0"
                        className="fh-input w-full pl-8 pr-4 py-3 rounded-lg text-lg font-mono focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30" />
                    </div>
                    {balance !== null && wAmt && Number(wAmt) > 0 && (
                      <p className={`text-[10px] font-sans mt-1.5 px-0.5 ${Number(wAmt)*100 > balance ? 'text-red-400' : 'text-emerald-400'}`}>
                        {Number(wAmt)*100 > balance
                          ? `⚠ Exceeds balance by ${naira(Number(wAmt)*100 - balance)}`
                          : `✓ Remaining after withdrawal: ${naira(balance - Number(wAmt)*100)}`}
                      </p>
                    )}
                  </div>

                  {/* OTP notice */}
                  <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-700/25 bg-amber-900/10">
                    <Icon name="info" size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] font-sans text-amber-400/80 leading-relaxed">
                      After submitting, Paystack will send an <strong>OTP</strong> to your registered email or phone.
                      You will be prompted to enter it here before funds are disbursed.
                    </p>
                  </div>

                  {wErr && (
                    <div className="flex items-start gap-2 p-3 rounded-lg border border-red-700/40 bg-red-900/20">
                      <Icon name="error_outline" size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] font-sans text-red-400">{wErr}</p>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
                  <button onClick={resetModal}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-sans text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors">
                    Cancel
                  </button>
                  <button onClick={submitWithdrawal}
                    disabled={wLoading || !wAmt || (wBankMode==='saved' && !wBankId) || (balance !== null && Number(wAmt)*100 > balance)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-sans font-semibold text-black flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                    {wLoading
                      ? <><div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full fh-spin" />Submitting…</>
                      : <><Icon name="send" size={14} />Withdraw {wAmt ? `₦${Number(wAmt).toLocaleString()}` : ''}</>}
                  </button>
                </div>
              </>
            )}


            {/* ── STEP: initiating ── */}
            {wStep === 'initiating' && (
              <div className="px-6 py-12 text-center space-y-5">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full fh-ping" style={{ background:'rgba(16,185,129,0.15)' }} />
                  <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background:'rgba(16,185,129,0.1)', border:'1.5px solid rgba(16,185,129,0.3)' }}>
                    <div className="w-9 h-9 border-2 border-emerald-800 border-t-emerald-400 rounded-full fh-spin" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-sans font-semibold text-slate-100">Initiating Transfer…</p>
                  <p className="text-xs font-sans text-slate-500 mt-2 leading-relaxed">
                    Paystack is creating the transfer. This typically takes a few seconds.<br />
                    <span className="text-amber-400/80 font-medium">Do not close this window.</span>
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-[10px] font-sans text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 fh-bounce-1" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 fh-bounce-2" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 fh-bounce-3" />
                  <span className="ml-2">waiting for Paystack OTP request</span>
                </div>
              </div>
            )}


            {/* ── STEP: otp ── THE MISSING SCREEN — NOW FIXED ── */}
            {wStep === 'otp' && (
              <div className="px-6 py-6 space-y-5">

                {/* Icon + heading */}
                <div className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-full"
                      style={{ background:'rgba(245,158,11,0.08)', border:'1.5px solid rgba(245,158,11,0.25)' }} />
                    <div className="relative w-20 h-20 rounded-full flex items-center justify-center">
                      <Icon name="mark_email_unread" size={32} style={{ color: '#f59e0b' }} />
                    </div>
                  </div>
                  <p className="text-base font-sans font-bold text-slate-100">Enter OTP to Authorise</p>
                  <p className="text-xs font-sans text-slate-500 mt-2 leading-relaxed">
                    Paystack has sent a one-time password to your<br />
                    registered <strong className="text-slate-400">email</strong> or <strong className="text-slate-400">phone number</strong>.<br />
                    Enter it below to disburse funds.
                  </p>
                </div>

                {/* Transfer code strip */}
                {otpTxCode && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700">
                    <span className="text-[10px] font-sans text-slate-500">Transfer code</span>
                    <span className="text-[10px] font-mono text-amber-400/80">{otpTxCode}</span>
                  </div>
                )}

                {/* OTP digit boxes */}
                <OtpDots value={otpVal} maxLen={6} />

                {/* Real input (drives the display above) */}
                <input
                  ref={otpInputRef}
                  type="tel"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpVal}
                  onChange={e => {
                    setOtpErr('');
                    setOtpVal(e.target.value.replace(/\D/g,'').slice(0,6));
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && otpVal.length >= 4) submitOtp(); }}
                  placeholder="Enter OTP"
                  className="fh-input w-full text-center text-xl font-mono tracking-widest py-3.5 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                  style={{ letterSpacing: '0.35em' }}
                  autoComplete="one-time-code"
                />

                {otpErr && (
                  <div className="flex items-start gap-2 p-3 rounded-lg border border-red-700/40 bg-red-900/20">
                    <Icon name="error_outline" size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] font-sans text-red-400">{otpErr}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={resetModal}
                    className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-sans text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors">
                    Cancel
                  </button>
                  <button onClick={submitOtp} disabled={otpLoading || otpVal.length < 4}
                    className="flex-1 py-2.5 rounded-xl text-sm font-sans font-semibold text-black flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                    {otpLoading
                      ? <><div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full fh-spin" />Confirming…</>
                      : <><Icon name="check" size={14} />Confirm OTP ({otpVal.length}/6)</>}
                  </button>
                </div>

              </div>
            )}


            {/* ── STEP: verifying ── */}
            {wStep === 'verifying' && (
              <div className="px-6 py-12 text-center space-y-5">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full fh-ping" style={{ background:'rgba(245,158,11,0.12)' }} />
                  <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background:'rgba(245,158,11,0.1)', border:'1.5px solid rgba(245,158,11,0.3)' }}>
                    <div className="w-9 h-9 border-2 border-amber-800 border-t-amber-400 rounded-full fh-spin" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-sans font-semibold text-slate-100">Confirming Transfer…</p>
                  <p className="text-xs font-sans text-slate-500 mt-2 leading-relaxed">
                    OTP submitted. Waiting for Paystack to confirm disbursement.<br />
                    <span className="text-amber-400/80 font-medium">Do not close this window.</span>
                  </p>
                </div>
              </div>
            )}


            {/* ── STEP: done ── */}
            {wStep === 'done' && (
              <div className="px-6 py-8 text-center space-y-5">
                <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center" style={{
                  background: wFinalStatus==='completed' ? 'rgba(16,185,129,0.12)' : wFinalStatus==='failed' ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.12)',
                  border: wFinalStatus==='completed' ? '1.5px solid rgba(16,185,129,0.35)' : wFinalStatus==='failed' ? '1.5px solid rgba(239,68,68,0.35)' : '1.5px solid rgba(148,163,184,0.35)',
                }}>
                  {wFinalStatus==='completed'
                    ? <Icon name="check_circle"  size={36} style={{ color: '#10b981' }} />
                    : wFinalStatus==='failed'
                    ? <Icon name="error_outline" size={36} style={{ color: '#ef4444' }} />
                    : <Icon name="schedule"      size={36} style={{ color: '#94a3b8' }} />}
                </div>
                <div>
                  <p className="text-base font-sans font-bold" style={{ color: wFinalStatus==='completed' ? '#10b981' : wFinalStatus==='failed' ? '#ef4444' : '#94a3b8' }}>
                    {wFinalStatus==='completed' ? '✓ Transfer Successful!' : wFinalStatus==='failed' ? '✗ Transfer Failed' : 'Processing — Check Back Soon'}
                  </p>
                  <p className="text-xs font-sans text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
                    {wFinalStatus==='completed'
                      ? 'Funds have been sent to the destination bank account. Check Payout History below for details.'
                      : wStepMsg || (wFinalStatus==='failed'
                        ? 'The withdrawal could not be completed. Contact support if funds were deducted.'
                        : 'Paystack is finalising the transfer. It will appear in Payout History once confirmed.')}
                  </p>
                </div>
                <button onClick={resetModal}
                  className="w-full py-3 rounded-xl text-sm font-sans font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: wFinalStatus==='completed' ? 'linear-gradient(135deg,#10b981,#059669)' : wFinalStatus==='failed' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#475569,#334155)' }}>
                  {wFinalStatus==='completed' ? '✓ Done' : 'Close'}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
});
PayoutsTab.displayName = 'PayoutsTab';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN — FINANCIAL HUB
// ═══════════════════════════════════════════════════════════════════════════

const FinancialHub: React.FC = () => {
  injectFHCSS();
  const [tab,     setTab]     = useState<HubTab>('overview');
  const [period,  setPeriod]  = useState<Period>('30D');
  const [txs,     setTxs]     = useState<Tx[]>(MOCK_TXS);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const res = await apiService.get<any>('payments/admin/transactions/');
        if (!dead) {
          const list: Tx[] = Array.isArray(res) ? res : (res?.results ?? res?.data ?? []);
          if (list.length > 0) setTxs(list);
        }
      } catch { /* use mock */ }
      finally { if (!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    if (q) setTab('transactions');
  }, []);

  const success = useMemo(() => txs.filter(t => t.status === 'SUCCESS'), [txs]);
  const revenue = useMemo(() => success.reduce((s, t) => s + t.amount, 0), [success]);
  const failed  = useMemo(() => txs.filter(t => t.status === 'FAILED').length, [txs]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [tab]);

  return (
    <div className="fh flex flex-col h-full overflow-hidden bg-slate-950">

      {/* ── COMMAND BAR ── */}
      <div className="fh-bar flex-shrink-0 bg-slate-900 border-b border-slate-800" style={{ boxShadow:'0 1px 0 #1e293b' }}>
        <div className="px-4 sm:px-6 py-3 flex items-center gap-3">

          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:'linear-gradient(135deg,#10b981,#059669)', boxShadow:'0 0 16px #10b98140' }}>
              <Icon name="account_balance" size={18} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-display font-semibold leading-none" style={{ color:'var(--fh-text1)' }}>Financial Hub</p>
              <p className="text-[9px] font-sans uppercase tracking-wider mt-0.5" style={{ color:'var(--fh-text3)' }}>Treasury · Accounting · Analytics</p>
            </div>
          </div>

          <div className="hidden sm:block w-px h-8 flex-shrink-0" style={{ background:'var(--fh-border2)' }} />

          <PeriodSelector value={period} onChange={setPeriod} />

          <span className="hidden lg:block text-[10px] font-sans flex-shrink-0" style={{ color:'var(--fh-text3)' }}>{periodLabel(period)}</span>

          {/* Global search */}
          <div className="flex-1 max-w-xs relative ml-auto">
            <Icon name="search" size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input type="text" placeholder="Global search…" value={search}
              onChange={e => handleSearch(e.target.value)}
              className="fh-input w-full pl-8 pr-6 py-1.5 bg-slate-800/80 border border-slate-700 rounded-md text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"><Icon name="close" size={11} /></button>}
          </div>

          {/* Quick KPIs */}
          <div className="hidden xl:flex items-center gap-0 divide-x flex-shrink-0" style={{ borderColor:'var(--fh-border)' }}>
            {[
              { label:'REVENUE', value: compact(revenue), color:'#10b981' },
              { label:'TX',      value: txs.length.toString(), color:'#94a3b8' },
              { label:'FAILED',  value: failed.toString(), color: failed>0 ? '#f87171' : '#475569' },
            ].map(k => (
              <div key={k.label} className="px-4 text-center">
                <p className="text-[8px] font-sans tracking-widest" style={{ color:'var(--fh-text3)' }}>{k.label}</p>
                <p className="text-sm font-mono font-bold" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => exportCSV(txs)}
              className="flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-[10px] font-sans hover:border-emerald-700 hover:text-emerald-400 transition-colors"
              style={{ background:'var(--fh-surface2)', borderColor:'var(--fh-border2)', color:'var(--fh-text3)' }}>
              <Icon name="download" size={12} />
              <span className="hidden sm:inline">EXPORT</span>
            </button>
            <button onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-sans font-semibold text-black transition-colors"
              style={{ background:'#10b981' }}>
              <Icon name="refresh" size={12} />
              <span className="hidden sm:inline">REFRESH</span>
            </button>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="fh-tabs flex overflow-x-auto border-t border-slate-800/60 px-4 sm:px-6" style={THIN}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-sans font-semibold whitespace-nowrap border-b-2 transition-all ${tab===t.key ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-slate-600 hover:text-slate-400'}`}
              style={tab !== t.key ? { color:'var(--fh-text3)' } : {}}>
              <Icon name={t.icon} size={12} />
              {t.label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {tab === 'overview'     && <div className="flex-1 overflow-y-auto" style={THIN}><OverviewTab txs={txs} period={period} /></div>}
        {tab === 'transactions' && <div className="flex-1 min-h-0 overflow-hidden flex flex-col"><TransactionsTab txs={txs} period={period} /></div>}
        {tab === 'giving'       && <div className="flex-1 overflow-y-auto" style={THIN}><GivingTab txs={txs} period={period} /></div>}
        {tab === 'budget'       && <div className="flex-1 overflow-y-auto" style={THIN}><BudgetTab /></div>}
        {tab === 'members'      && <div className="flex-1 min-h-0 overflow-hidden flex flex-col"><MembersTab txs={txs} /></div>}
        {tab === 'reports'      && <div className="flex-1 overflow-y-auto" style={THIN}><ReportsTab txs={txs} /></div>}
        {tab === 'payouts'      && <div className="flex-1 overflow-y-auto" style={THIN}><PayoutsTab /></div>}
      </div>
    </div>
  );
};

export default FinancialHub;
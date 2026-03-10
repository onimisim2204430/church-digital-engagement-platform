/**
 * PaymentRecords — Dark Mode Edition
 * Themed to match AdminTopBar/Sidebar: slate-900 bg, emerald-500 accents.
 */

import React, {
  useState, useEffect, useCallback, useMemo, memo,
} from 'react';
import Icon from '../components/common/Icon';
import apiService from '../services/api.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type TxStatus  = 'SUCCESS' | 'FAILED' | 'PROCESSING' | 'PENDING' | string;
type SortKey   = 'user_name' | 'amount' | 'status' | 'created_at' | 'paid_at';
type SortDir   = 'asc' | 'desc';

interface PaymentTransaction {
  id: string;
  user_email: string;
  user_name: string;
  reference: string;
  amount: number;
  currency: string;
  status: TxStatus;
  status_label: string;
  payment_method?: string | null;
  amount_verified: boolean;
  paid_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, any>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_META: Record<string, {
  bg: string; text: string; border: string; dot: string; icon: string; label: string;
}> = {
  SUCCESS:    { bg: 'bg-emerald-50 dark:bg-emerald-500/10',  text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30', dot: 'bg-emerald-400',             icon: 'check_circle',  label: 'Success'    },
  FAILED:     { bg: 'bg-red-50 dark:bg-red-500/10',          text: 'text-red-700 dark:text-red-400',         border: 'border-red-200 dark:border-red-500/30',         dot: 'bg-red-400',                 icon: 'cancel',        label: 'Failed'     },
  PROCESSING: { bg: 'bg-amber-50 dark:bg-amber-500/10',      text: 'text-amber-700 dark:text-amber-400',     border: 'border-amber-200 dark:border-amber-500/30',     dot: 'bg-amber-400',               icon: 'hourglass_top', label: 'Processing' },
  PENDING:    { bg: 'bg-blue-50 dark:bg-blue-500/10',        text: 'text-blue-700 dark:text-blue-400',       border: 'border-blue-200 dark:border-blue-500/30',       dot: 'bg-blue-400',                icon: 'schedule',      label: 'Pending'    },
};

const DEFAULT_STATUS = { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-400', icon: 'help', label: 'Unknown' };

const THIN: React.CSSProperties = { scrollbarWidth: 'thin' };
const PANEL_W = 420;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const money = (amount: number, currency = 'NGN') =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: (currency || 'NGN').toUpperCase(), maximumFractionDigits: 2,
  }).format(amount / 100);

const fmtD  = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtDT = (s?: string | null) =>
  s ? new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const sMeta = (status: string) => STATUS_META[status?.toUpperCase()] ?? DEFAULT_STATUS;

const initials = (name: string) =>
  name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '??';

const AVATAR_COLORS = [
  'from-emerald-500 to-teal-400', 'from-blue-500 to-cyan-400',
  'from-violet-500 to-purple-400', 'from-amber-500 to-orange-400',
  'from-rose-500 to-pink-400', 'from-indigo-500 to-blue-400',
];
const avatarColor = (id: string) =>
  AVATAR_COLORS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

// ─── Tiny sparkline ───────────────────────────────────────────────────────────

const Sparkline = memo(({ values, color = '#10b981', w = 64, h = 24 }: {
  values: number[]; color?: string; w?: number; h?: number;
}) => {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) =>
    `${Math.round((i / (values.length - 1)) * w)},${Math.round(h - (v / max) * h)}`
  ).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="opacity-70">
      <polyline points={pts} stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
});
Sparkline.displayName = 'Sparkline';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = memo(({ status }: { status: string }) => {
  const m = sMeta(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${m.bg} ${m.text} ${m.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
      {m.label}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

// ─── Avatar ───────────────────────────────────────────────────────────────────

const TxAvatar = memo(({ tx, cls = 'w-8 h-8 text-xs' }: { tx: PaymentTransaction; cls?: string }) => (
  <div className={`${cls} rounded-full bg-gradient-to-br ${avatarColor(tx.id)} flex items-center justify-center flex-shrink-0 font-bold text-white shadow-sm select-none`}>
    {initials(tx.user_name || tx.user_email)}
  </div>
));
TxAvatar.displayName = 'TxAvatar';

// ─── Skeleton row ─────────────────────────────────────────────────────────────

const SkeletonRow = memo(({ i }: { i: number }) => (
  <tr className={`border-b border-slate-100 dark:border-slate-700/50 ${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/30'}`}>
    <td className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 animate-pulse flex-shrink-0" />
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-2.5 w-40 bg-slate-50 dark:bg-slate-800 rounded animate-pulse" />
        </div>
      </div>
    </td>
    <td className="hidden md:table-cell px-4 py-3"><div className="h-3 w-32 bg-slate-100 dark:bg-slate-700 rounded animate-pulse font-mono" /></td>
    <td className="px-4 py-3"><div className="h-4 w-20 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
    <td className="hidden sm:table-cell px-4 py-3"><div className="h-5 w-20 bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse" /></td>
    <td className="hidden lg:table-cell px-4 py-3"><div className="h-3 w-16 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
    <td className="hidden xl:table-cell px-4 py-3"><div className="h-3 w-24 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
    <td className="px-4 py-3 text-right"><div className="h-7 w-16 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse ml-auto" /></td>
  </tr>
));
SkeletonRow.displayName = 'SkeletonRow';

// ─── Sort TH ─────────────────────────────────────────────────────────────────

const SortTh = memo(({ label, col, sk, sd, onSort, cls = '' }: {
  label: string; col: SortKey; sk: SortKey; sd: SortDir;
  onSort: (k: SortKey) => void; cls?: string;
}) => (
  <th
    className={`px-4 py-3 text-left cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors group ${cls}`}
    onClick={() => onSort(col)}
  >
    <div className="flex items-center gap-1">
      <span className={`text-[10px] font-bold uppercase tracking-wider ${sk === col ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>{label}</span>
      <Icon
        name={sk === col ? (sd === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
        size={11}
        className={sk === col ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-400'}
      />
    </div>
  </th>
));
SortTh.displayName = 'SortTh';

// ─── Table row ────────────────────────────────────────────────────────────────

const TableRow = memo(({ tx, idx, selected, panelOpen, onOpen }: {
  tx: PaymentTransaction; idx: number; selected: boolean; panelOpen: boolean; onOpen: (t: PaymentTransaction) => void;
}) => (
  <tr
    onClick={() => onOpen(tx)}
    className={`border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors ${
      selected
        ? 'bg-emerald-50/60 dark:bg-emerald-500/10'
        : idx % 2 === 0
          ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
          : 'bg-slate-50/30 dark:bg-slate-800/30 hover:bg-slate-100/60 dark:hover:bg-slate-700/40'
    }`}
  >
    {/* User */}
    <td className="px-4 py-3">
      <div className="flex items-center gap-3">
        <TxAvatar tx={tx} />
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate ${selected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>{tx.user_name || '—'}</p>
          <p className={`text-xs text-slate-400 dark:text-slate-500 truncate ${panelOpen ? 'hidden xl:block' : 'hidden sm:block'}`}>{tx.user_email}</p>
        </div>
      </div>
    </td>
    {/* Reference */}
    <td className={`px-4 py-3 ${panelOpen ? 'hidden 2xl:table-cell' : 'hidden md:table-cell'}`}>
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded truncate block max-w-[160px]">{tx.reference}</span>
    </td>
    {/* Amount */}
    <td className="px-4 py-3">
      <span className={`text-sm font-bold ${tx.status === 'SUCCESS' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
        {money(tx.amount, tx.currency)}
      </span>
    </td>
    {/* Status */}
    <td className={`px-4 py-3 ${panelOpen ? 'hidden xl:table-cell' : 'hidden sm:table-cell'}`}>
      <StatusBadge status={tx.status} />
    </td>
    {/* Method */}
    <td className={`px-4 py-3 ${panelOpen ? 'hidden' : 'hidden lg:table-cell'}`}>
      <span className="text-xs text-slate-500 dark:text-slate-400">{tx.payment_method || '—'}</span>
    </td>
    {/* Date */}
    <td className={`px-4 py-3 ${panelOpen ? 'hidden' : 'hidden xl:table-cell'}`}>
      <span className="text-xs text-slate-500 dark:text-slate-400">{fmtD(tx.created_at)}</span>
    </td>
    {/* Action */}
    <td className="px-4 py-3 text-right">
      <button
        onClick={e => { e.stopPropagation(); onOpen(tx); }}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${
          selected
            ? 'bg-emerald-500 text-white border-emerald-500'
            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 dark:hover:border-emerald-500'
        }`}
      >
        {selected ? 'Viewing' : 'Details'}
      </button>
    </td>
  </tr>
));
TableRow.displayName = 'TableRow';

// ─── Detail Panel Content ─────────────────────────────────────────────────────

const PanelContent = memo(({ tx, onClose }: { tx: PaymentTransaction; onClose: () => void }) => {
  const meta = tx.metadata ?? {};

  return (
    <>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
        <div className="px-5 py-4 bg-gradient-to-b from-slate-50 dark:from-slate-800/80 to-white dark:to-slate-900">
          <div className="flex items-start justify-between mb-4">
            <TxAvatar tx={tx} cls="w-12 h-12 text-sm" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Icon name="close" size={17} />
            </button>
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{tx.user_name || 'Unknown'}</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{tx.user_email}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <StatusBadge status={tx.status} />
            {tx.amount_verified && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">
                <Icon name="verified" size={10} />Verified
              </span>
            )}
          </div>
          {/* Big amount */}
          <div className="mt-4 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Amount</span>
            <span className={`text-2xl font-bold ${tx.status === 'SUCCESS' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
              {money(tx.amount, tx.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-slate-900" style={THIN}>

        {/* Core details */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Transaction Details</p>
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50 overflow-hidden">
            {[
              { icon: 'tag',               label: 'Reference', value: tx.reference,                    mono: true  },
              { icon: 'fingerprint',       label: 'ID',        value: tx.id,                           mono: true  },
              { icon: 'credit_card',       label: 'Method',    value: tx.payment_method || '—',        mono: false },
              { icon: 'currency_exchange', label: 'Currency',  value: tx.currency?.toUpperCase() || '—', mono: false },
              { icon: 'calendar_today',    label: 'Created',   value: fmtDT(tx.created_at),            mono: false },
              { icon: 'schedule',          label: 'Paid At',   value: fmtDT(tx.paid_at),               mono: false },
              { icon: 'update',            label: 'Updated',   value: fmtDT(tx.updated_at),            mono: false },
            ].map(r => (
              <div key={r.label} className="flex items-start gap-3 px-4 py-2.5">
                <Icon name={r.icon} size={13} className="text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-16 flex-shrink-0">{r.label}</span>
                <span className={`text-xs text-slate-700 dark:text-slate-300 font-medium truncate flex-1 ${r.mono ? 'font-mono text-[11px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded' : ''}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metadata */}
        {Object.keys(meta).length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Metadata</p>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50 overflow-hidden">
              {Object.entries(meta).map(([k, v]) => (
                <div key={k} className="flex items-start gap-3 px-4 py-2.5">
                  <Icon name="data_object" size={13} className="text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" />
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 w-24 flex-shrink-0 truncate">{k}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-mono truncate flex-1">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status timeline */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Timeline</p>
          <div className="flex flex-col gap-0">
            {[
              { label: 'Transaction Created', time: tx.created_at, done: true,                     icon: 'add_circle'   },
              { label: 'Payment Initiated',   time: tx.created_at, done: true,                     icon: 'play_circle'  },
              { label: 'Processing',          time: null,          done: tx.status !== 'PENDING',   icon: 'hourglass_top'},
              { label: 'Confirmed',           time: tx.paid_at,    done: tx.status === 'SUCCESS',   icon: 'check_circle' },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                    step.done
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
                  }`}>
                    <Icon name={step.icon} size={13} />
                  </div>
                  {i < arr.length - 1 && <div className={`w-0.5 h-5 ${step.done ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-slate-100 dark:bg-slate-700'}`} />}
                </div>
                <div className="pt-0.5 pb-4">
                  <p className={`text-xs font-semibold ${step.done ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>{step.label}</p>
                  {step.time && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{fmtDT(step.time)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Actions</p>
          {[
            { icon: 'receipt_long', label: 'View Receipt',        cls: 'hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400' },
            { icon: 'mail',         label: 'Resend Confirmation', cls: 'hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-700 dark:hover:text-blue-400' },
            { icon: 'refresh',      label: 'Re-verify Payment',  cls: 'hover:border-amber-300 dark:hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400' },
          ].map(a => (
            <button key={a.label}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all ${a.cls}`}>
              <Icon name={a.icon} size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
              <span className="flex-1 text-left">{a.label}</span>
              <Icon name="chevron_right" size={12} className="text-slate-300 dark:text-slate-600" />
            </button>
          ))}
          {tx.status === 'SUCCESS' && (
            <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
              <Icon name="undo" size={14} className="text-red-400 flex-shrink-0" />
              <span className="flex-1 text-left">Initiate Refund</span>
              <Icon name="chevron_right" size={12} className="text-red-300 dark:text-red-500/50" />
            </button>
          )}
        </div>

      </div>
    </>
  );
});
PanelContent.displayName = 'PanelContent';

// ─── CSV Export ───────────────────────────────────────────────────────────────

const exportCSV = (rows: PaymentTransaction[]) => {
  const headers = ['ID', 'Name', 'Email', 'Reference', 'Amount', 'Currency', 'Status', 'Method', 'Created', 'Paid At'];
  const lines = [headers.join(','), ...rows.map(tx => [
    tx.id, tx.user_name, tx.user_email, tx.reference,
    (tx.amount / 100).toFixed(2), tx.currency, tx.status,
    tx.payment_method || '', fmtDT(tx.created_at), fmtDT(tx.paid_at),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `transactions_${Date.now()}.csv` });
  a.click();
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PaymentRecords: React.FC = () => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [detail, setDetail]             = useState<PaymentTransaction | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch]             = useState('');
  const [sortKey, setSortKey]           = useState<SortKey>('created_at');
  const [sortDir, setSortDir]           = useState<SortDir>('desc');
  const [page, setPage]                 = useState(1);

  useEffect(() => {
    let dead = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const q = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
        const res = await apiService.get<any>(`/payments/admin/transactions/${q}`);
        if (!dead) setTransactions(res?.results ?? res ?? []);
      } catch (e: any) {
        if (!dead) setError(e?.response?.data?.message || 'Failed to load transactions.');
      } finally { if (!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, [statusFilter]);

  const handleSort = useCallback((k: SortKey) => {
    setSortDir(p => sortKey === k ? (p === 'asc' ? 'desc' : 'asc') : 'desc');
    setSortKey(k);
    setPage(1);
  }, [sortKey]);

  const openPanel  = useCallback((tx: PaymentTransaction) => { setDetail(p => p?.id === tx.id ? null : tx); }, []);
  const closePanel = useCallback(() => setDetail(null), []);

  const processed = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = transactions;
    if (q) list = list.filter(tx =>
      tx.reference.toLowerCase().includes(q) ||
      tx.user_email.toLowerCase().includes(q) ||
      (tx.user_name || '').toLowerCase().includes(q)
    );
    return [...list].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case 'user_name':  av = a.user_name;    bv = b.user_name;    break;
        case 'amount':     av = a.amount;        bv = b.amount;       break;
        case 'status':     av = a.status;        bv = b.status;       break;
        case 'created_at': av = a.created_at||''; bv = b.created_at||''; break;
        case 'paid_at':    av = a.paid_at||'';   bv = b.paid_at||'';  break;
        default: av = ''; bv = '';
      }
      const c = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? c : -c;
    });
  }, [transactions, search, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paginated  = useMemo(() => processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [processed, page]);

  const summary = useMemo(() => {
    const success    = transactions.filter(t => t.status === 'SUCCESS');
    const failed     = transactions.filter(t => t.status === 'FAILED').length;
    const processing = transactions.filter(t => t.status === 'PROCESSING' || t.status === 'PENDING').length;
    const revenue    = success.reduce((s, t) => s + t.amount, 0);
    const now = Date.now();
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const day = now - (6 - i) * 86400000;
      return success
        .filter(t => t.paid_at && Math.abs(new Date(t.paid_at).getTime() - day) < 43200000)
        .reduce((s, t) => s + t.amount, 0);
    });
    return { total: transactions.length, success: success.length, failed, processing, revenue, sparkline: buckets };
  }, [transactions]);

  const panelOpen = !!detail;

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-300">

      {/* ══════════════ LEFT COLUMN ══════════════ */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* ── Page Header ── */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Icon name="receipt_long" size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">Payment Records</h1>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 hidden sm:block">All transactions processed on this platform</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportCSV(processed)}
                className="hidden sm:flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-lg text-sm font-semibold hover:border-emerald-400 dark:hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                <Icon name="download" size={14} />Export CSV
              </button>
              <button className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all">
                <Icon name="refresh" size={14} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Revenue', value: money(summary.revenue, 'NGN'),
                icon: 'payments',     color: 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-emerald-50 dark:bg-emerald-500/10',
                border: 'border-emerald-100 dark:border-emerald-500/20',
                sparkColor: '#10b981', note: `${summary.success} successful` },
              { label: 'Transactions', value: String(summary.total),
                icon: 'receipt',      color: 'text-slate-700 dark:text-slate-300',
                bg: 'bg-slate-50 dark:bg-slate-800/60',
                border: 'border-slate-100 dark:border-slate-700',
                sparkColor: '#64748b', note: 'all time' },
              { label: 'Failed',       value: String(summary.failed),
                icon: 'cancel',       color: 'text-red-600 dark:text-red-400',
                bg: 'bg-red-50 dark:bg-red-500/10',
                border: 'border-red-100 dark:border-red-500/20',
                sparkColor: '#ef4444', note: summary.total > 0 ? `${Math.round((summary.failed / summary.total) * 100)}% failure rate` : '—' },
              { label: 'In Progress',  value: String(summary.processing),
                icon: 'hourglass_top', color: 'text-amber-600 dark:text-amber-400',
                bg: 'bg-amber-50 dark:bg-amber-500/10',
                border: 'border-amber-100 dark:border-amber-500/20',
                sparkColor: '#f59e0b', note: 'pending/processing' },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-3 p-3 rounded-xl border ${s.border} ${s.bg} transition-colors`}>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color} mt-0.5 truncate`}>{s.value}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{s.note}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.bg}`}>
                    <Icon name={s.icon} size={16} className={s.color} />
                  </div>
                  <Sparkline values={summary.sparkline} color={s.sparkColor} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-2.5 flex-shrink-0 flex items-center gap-2 overflow-x-auto transition-colors" style={THIN}>
          <div className="relative flex-shrink-0 w-48 sm:w-64">
            <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Reference, email, name…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-7 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:focus:ring-emerald-500 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400">
                <Icon name="close" size={12} />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="flex-shrink-0 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:focus:ring-emerald-500 transition-colors"
          >
            <option value="ALL">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="PROCESSING">Processing</option>
            <option value="PENDING">Pending</option>
          </select>
          <span className="ml-auto flex-shrink-0 text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
            {processed.length} / {transactions.length} records
          </span>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-y-auto overflow-x-auto" style={THIN}>
          <table className="w-full min-w-[360px] border-collapse">
            <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-slate-950/40 transition-colors">
              <tr>
                <SortTh label="User"    col="user_name"  sk={sortKey} sd={sortDir} onSort={handleSort} cls="px-4" />
                <th className={`px-4 py-3 text-left ${panelOpen ? 'hidden 2xl:table-cell' : 'hidden md:table-cell'}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Reference</span>
                </th>
                <SortTh label="Amount"  col="amount"     sk={sortKey} sd={sortDir} onSort={handleSort} cls="px-4" />
                <SortTh label="Status"  col="status"     sk={sortKey} sd={sortDir} onSort={handleSort} cls={`${panelOpen ? 'hidden xl:table-cell' : 'hidden sm:table-cell'}`} />
                <th className={`px-4 py-3 text-left ${panelOpen ? 'hidden' : 'hidden lg:table-cell'}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Method</span>
                </th>
                <SortTh label="Created" col="created_at" sk={sortKey} sd={sortDir} onSort={handleSort} cls={`${panelOpen ? 'hidden' : 'hidden xl:table-cell'}`} />
                <th className="px-4 py-3 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} i={i} />)
                : error
                  ? (
                    <tr><td colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Icon name="error_outline" size={36} className="text-red-300 dark:text-red-700 mb-3" />
                        <p className="text-sm font-semibold text-red-500 dark:text-red-400">{error}</p>
                      </div>
                    </td></tr>
                  )
                  : paginated.length === 0
                    ? (
                      <tr><td colSpan={7}>
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                            <Icon name="receipt_long" size={26} className="text-slate-300 dark:text-slate-600" />
                          </div>
                          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No transactions found</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your filters.</p>
                        </div>
                      </td></tr>
                    )
                    : paginated.map((tx, i) => (
                      <TableRow key={tx.id} tx={tx} idx={i}
                        selected={detail?.id === tx.id}
                        panelOpen={panelOpen}
                        onOpen={openPanel}
                      />
                    ))
              }
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 flex items-center justify-between transition-colors">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Page {page} of {totalPages} · {processed.length} records
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_left" size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                      p === page
                        ? 'bg-emerald-500 text-white'
                        : 'border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}>
                    {p}
                  </button>
                );
              })}
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Icon name="chevron_right" size={14} />
              </button>
            </div>
          </div>
        )}

      </div>{/* end LEFT */}

      {/* ══════════════ RIGHT — DESKTOP DETAIL PANEL ══════════════ */}
      <div
        className="hidden md:flex flex-col flex-shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 overflow-hidden transition-colors"
        style={{
          width:      panelOpen ? PANEL_W : 0,
          minWidth:   panelOpen ? PANEL_W : 0,
          transition: 'width 300ms ease, min-width 300ms ease',
        }}
      >
        <div className="flex flex-col h-full" style={{ width: PANEL_W, minWidth: PANEL_W }}>
          {detail && <PanelContent tx={detail} onClose={closePanel} />}
        </div>
      </div>

      {/* ══════════════ MOBILE bottom sheet ══════════════ */}
      <div
        onClick={closePanel}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden ${panelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl dark:shadow-slate-950/80 flex flex-col md:hidden transition-transform duration-300 ${panelOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '90dvh' }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        {detail && <PanelContent tx={detail} onClose={closePanel} />}
      </div>

    </div>
  );
};

export default PaymentRecords;
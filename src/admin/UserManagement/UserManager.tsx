/**
 * UserManager — Production v6
 *
 * TRUE two-column layout:
 *   LEFT  column = flex-1  → header + toolbar + table, ALL shrink together
 *   RIGHT column = panel   → slides in, pushes entire left column
 *
 * No more "top bar spanning full width". The header & toolbar live INSIDE
 * the left flex child so they shrink with the table when the panel opens.
 *
 * Mobile: panel still slides up as a fixed bottom sheet.
 */

import React, {
  useState, useEffect, useCallback, useMemo, useDeferredValue, useRef, memo,
} from 'react';
import { apiService } from '../../services/api.service';
import { useConfirm } from '../../contexts/ConfirmContext';
import Icon           from '../../components/common/Icon';

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole       = 'MEMBER' | 'MODERATOR' | 'ADMIN';
type UserStatus     = 'active' | 'suspended';
type VerifiedFilter = '' | 'verified' | 'unverified';
type SortKey        = 'full_name' | 'role' | 'is_suspended' | 'date_joined' | 'last_login';
type SortDir        = 'asc' | 'desc';
type DrawerTab      = 'overview' | 'controls' | 'activity' | 'security';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  profile_picture?: string | null;
  role: UserRole;
  is_suspended: boolean;
  email_verified?: boolean;
  emailVerified?: boolean;
  email_subscribed: boolean;
  date_joined: string;
  last_login: string | null;
  sub_role_label?: string;
}

interface UserDetail extends User {
  phone_number: string | null;
  profile_picture: string | null;
  bio: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  suspended_by_email: string | null;
  suspension_reason: string | null;
  suspension_expires_at: string | null;
  activity: {
    posts_count: number;
    comments_count: number;
    reactions_count: number;
    prayers_count?: number;
  };
  mod_permissions?: {
    permissions: string[];
    sub_role_label: string;
    updated_at: string | null;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_META: Record<UserRole, { label: string; icon: string; pill: string }> = {
  ADMIN:     { label: 'Admin',     icon: 'admin_panel_settings', pill: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50'             },
  MODERATOR: { label: 'Moderator', icon: 'shield',               pill: 'bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800/50' },
  MEMBER:    { label: 'Member',    icon: 'person',                pill: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700/50 dark:text-slate-400 dark:border-slate-600'           },
};

const TABS: { key: DrawerTab; icon: string; label: string }[] = [
  { key: 'overview',  icon: 'person',    label: 'Overview' },
  { key: 'controls',  icon: 'tune',      label: 'Controls' },
  { key: 'activity',  icon: 'bar_chart', label: 'Activity' },
  { key: 'security',  icon: 'security',  label: 'Security' },
];

const GRADS = [
  'from-blue-500 to-cyan-400', 'from-violet-500 to-purple-400',
  'from-rose-500 to-pink-400', 'from-amber-500 to-yellow-400',
  'from-emerald-500 to-teal-400', 'from-indigo-500 to-blue-400',
];

/** Width of the detail panel on desktop (px) */
const PANEL_W = 400;

const THIN: React.CSSProperties = { scrollbarWidth: 'none', msOverflowStyle: 'none' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uName = (u: User) => {
  if (u.full_name?.trim()) return u.full_name.trim();
  const c = `${u.first_name || ''} ${u.last_name || ''}`.trim();
  return c || u.email.split('@')[0].replace(/[._-]/g, ' ').split(' ')
    .map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ') || 'Unknown';
};

const uInitials = (n: string) =>
  n.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

const uVerified = (u: User) =>
  typeof u.email_verified === 'boolean' ? u.email_verified
  : typeof u.emailVerified === 'boolean' ? u.emailVerified : false;

const uGrad = (id: string) =>
  GRADS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % GRADS.length];

const fmtD  = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const fmtDT = (s: string | null) =>
  s ? new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

const API_ORIGIN = (() => {
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  if (typeof window === 'undefined') {
    return '';
  }

  if (!apiBaseUrl) {
    return window.location.origin;
  }

  try {
    return new URL(apiBaseUrl, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
})();

const toAbsoluteProfileUrl = (value: string): string => {
  const url = value.trim();

  if (!url) {
    return '';
  }

  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  if (!API_ORIGIN) {
    return url;
  }

  if (url.startsWith('/')) {
    return `${API_ORIGIN}${url}`;
  }

  return `${API_ORIGIN}/${url.replace(/^\/+/, '')}`;
};

const pickProfilePicture = (raw: any): string | null => {
  const candidates = [
    raw?.profile_picture,
    raw?.profilePicture,
    raw?.profile_image,
    raw?.profileImage,
    raw?.avatar,
    raw?.avatar_url,
    raw?.image,
    raw?.photo,
    raw?.picture,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return toAbsoluteProfileUrl(value);
  }

  return null;
};

const normalizeUser = (raw: any): User => ({
  ...raw,
  is_suspended: Boolean(raw?.is_suspended),
  profile_picture: pickProfilePicture(raw),
});

const normalizeUserDetail = (raw: any): UserDetail => ({
  ...raw,
  is_suspended: Boolean(raw?.is_suspended),
  profile_picture: pickProfilePicture(raw),
  activity: {
    posts_count: Number(raw?.activity?.posts_count ?? 0),
    comments_count: Number(raw?.activity?.comments_count ?? 0),
    reactions_count: Number(raw?.activity?.reactions_count ?? 0),
    prayers_count: raw?.activity?.prayers_count != null ? Number(raw.activity.prayers_count) : undefined,
  },
});

// ─── Atoms ────────────────────────────────────────────────────────────────────

const Avatar = memo(({ user, cls = 'w-9 h-9 text-xs' }: { user: User; cls?: string }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const profileImage = typeof user.profile_picture === 'string' ? user.profile_picture.trim() : '';
  const showImage = Boolean(profileImage) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [profileImage, user.id]);

  if (showImage) {
    return (
      <img
        src={profileImage}
        alt={uName(user)}
        onLoad={() => setImageFailed(false)}
        onError={() => setImageFailed(true)}
        className={`${cls} rounded-full object-cover flex-shrink-0 shadow-sm bg-slate-100 select-none`}
      />
    );
  }

  return (
    <div className={`${cls} rounded-full bg-gradient-to-br ${uGrad(user.id)} flex items-center justify-center flex-shrink-0 font-bold text-white shadow-sm select-none`}>
      {uInitials(uName(user))}
    </div>
  );
});
Avatar.displayName = 'Avatar';

const RoleBadge = memo(({ role }: { role: UserRole }) => {
  const m = ROLE_META[role] ?? ROLE_META.MEMBER;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${m.pill}`}>
      <Icon name={m.icon} size={10} />{m.label}
    </span>
  );
});
RoleBadge.displayName = 'RoleBadge';

const StatusBadge = memo(({ suspended }: { suspended: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${suspended ? 'text-red-500' : 'text-emerald-500'}`}>
    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${suspended ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`} />
    {suspended ? 'Suspended' : 'Active'}
  </span>
));
StatusBadge.displayName = 'StatusBadge';

// ─── Table skeleton row ───────────────────────────────────────────────────────

const SkeletonRow = memo(({ i }: { i: number }) => (
  <tr className={`border-b border-slate-100 dark:border-slate-700/50 ${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/40 dark:bg-slate-800/30'}`}>
    <td className="hidden md:table-cell pl-4 pr-2 py-4"><div className="h-2.5 w-5 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 animate-pulse flex-shrink-0" />
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-2.5 w-40 bg-slate-50 dark:bg-slate-800 rounded animate-pulse" />
        </div>
      </div>
    </td>
    <td className="hidden sm:table-cell px-4 py-3"><div className="h-5 w-20 bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse" /></td>
    <td className="hidden md:table-cell px-4 py-3"><div className="h-3 w-14 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
    <td className="hidden lg:table-cell px-4 py-3"><div className="h-3 w-16 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
    <td className="hidden xl:table-cell px-4 py-3"><div className="h-3 w-20 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
    <td className="px-4 py-3 text-right"><div className="h-7 w-16 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse ml-auto" /></td>
  </tr>
));
SkeletonRow.displayName = 'SkeletonRow';

// ─── Table row ────────────────────────────────────────────────────────────────

const TableRow = memo(({ user, idx, selected, panelOpen, onOpen, checked, onCheck }: {
  user: User; idx: number; selected: boolean; panelOpen: boolean; onOpen: (u: User) => void;
  checked?: boolean; onCheck?: (id: string) => void;
}) => (
  <tr
    onClick={() => onOpen(user)}
    className={`border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors ${
      selected
        ? 'bg-primary/5 dark:bg-emerald-500/10'
        : idx % 2 === 0 ? 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60' : 'bg-slate-50/40 hover:bg-slate-100/60 dark:bg-slate-800/30 dark:hover:bg-slate-800/60'
    }`}
  >
    <td className="hidden md:table-cell pl-4 pr-2 py-4 w-8" onClick={e => e.stopPropagation()}>
      {onCheck
        ? <input type="checkbox" checked={!!checked} onChange={() => onCheck(user.id)} className="w-4 h-4 rounded accent-primary cursor-pointer" />
        : <span className="text-[10px] font-mono text-slate-300 dark:text-slate-600">{String(idx + 1).padStart(2, '0')}</span>
      }
    </td>

    <td className="px-4 py-3">
      <div className="flex items-center gap-3">
        <Avatar user={user} />
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate ${selected ? 'text-primary dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>{uName(user)}</p>
          <p className={`text-xs text-slate-400 dark:text-slate-500 truncate ${panelOpen ? 'hidden xl:block' : 'hidden sm:block'}`}>{user.email}</p>
          <div className="sm:hidden mt-0.5"><RoleBadge role={user.role} /></div>
        </div>
      </div>
    </td>

    <td className={`px-4 py-3 ${panelOpen ? 'hidden xl:table-cell' : 'hidden sm:table-cell'}`}>
      <RoleBadge role={user.role} />
      {user.role === 'MODERATOR' && user.sub_role_label && (
        <p className="text-[10px] text-violet-400 italic mt-0.5 truncate">{user.sub_role_label}</p>
      )}
    </td>
    <td className={`px-4 py-3 ${panelOpen ? 'hidden 2xl:table-cell' : 'hidden md:table-cell'}`}>
      <StatusBadge suspended={user.is_suspended} />
    </td>
    <td className={`px-4 py-3 ${panelOpen ? 'hidden' : 'hidden lg:table-cell'}`}>
      {uVerified(user)
        ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Icon name="check_circle" size={13} />Verified</span>
        : <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500"><Icon name="pending" size={13} />Pending</span>
      }
    </td>
    <td className={`px-4 py-3 ${panelOpen ? 'hidden' : 'hidden xl:table-cell'}`}>
      <span className="text-xs text-slate-500">{fmtD(user.date_joined)}</span>
    </td>

    <td className="px-4 py-3 text-right">
      <button
        onClick={e => { e.stopPropagation(); onOpen(user); }}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${
          selected
            ? 'bg-primary text-white border-primary dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40'
            : 'border-slate-200 text-slate-500 bg-white hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-400 dark:bg-transparent dark:hover:border-emerald-500 dark:hover:text-emerald-400'
        }`}
      >
        {selected ? 'Viewing' : 'Manage'}
      </button>
    </td>
  </tr>
));
TableRow.displayName = 'TableRow';

// ─── Sort header cell ─────────────────────────────────────────────────────────

const SortTh = memo(({ label, col, sk, sd, onSort, cls = '' }: {
  label: string; col: SortKey; sk: SortKey; sd: SortDir; onSort: (k: SortKey) => void; cls?: string;
}) => (
  <th className={`px-4 py-3 text-left cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors group ${cls}`}
    onClick={() => onSort(col)}>
    <div className="flex items-center gap-1">
      <span className={`text-[10px] font-bold uppercase tracking-wider ${sk === col ? 'text-primary' : 'text-slate-400'}`}>{label}</span>
      <Icon name={sk === col ? (sd === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'} size={11}
        className={sk === col ? 'text-primary' : 'text-slate-300 group-hover:text-slate-400'} />
    </div>
  </th>
));
SortTh.displayName = 'SortTh';

// ─── Detail panel content ─────────────────────────────────────────────────────

const PanelContent = memo(({
  user, loadingUser, tab, setTab,
  newRole, setNewRole, newStatus, setNewStatus,
  reason, setReason, hasChanges, saving, success, error,
  onSave, onClose, onSetTabControls,
}: {
  user: UserDetail; loadingUser: boolean;
  tab: DrawerTab; setTab: (t: DrawerTab) => void;
  newRole: UserRole; setNewRole: (r: UserRole) => void;
  newStatus: 'ACTIVE' | 'SUSPENDED'; setNewStatus: (s: 'ACTIVE' | 'SUSPENDED') => void;
  reason: string; setReason: (v: string) => void;
  hasChanges: boolean; saving: boolean; success: boolean; error: string;
  onSave: () => void; onClose: () => void;
  onSetTabControls: () => void;

}) => (
  <>
    {/* ── Header ── */}
    <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
      <div className="px-5 py-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
        <div className="flex items-start justify-between mb-3">
          <Avatar user={user} cls="w-11 h-11 text-sm" />
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors">
            <Icon name="close" size={17} />
          </button>
        </div>
        {loadingUser ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-48 bg-slate-100 dark:bg-slate-600 rounded" />
            <div className="flex gap-2 mt-2"><div className="h-4 w-20 bg-slate-100 dark:bg-slate-700 rounded-full" /><div className="h-4 w-14 bg-slate-100 dark:bg-slate-700 rounded-full" /></div>
          </div>
        ) : (
          <>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{uName(user)}</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              <RoleBadge role={user.role} />
              <StatusBadge suspended={user.is_suspended} />
              {!uVerified(user) && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-700/50 dark:text-amber-400 px-2 py-0.5 rounded-full">
                  <Icon name="pending" size={10} />Unverified
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      {!loadingUser && (
        <div className="flex border-t border-slate-100 dark:border-slate-700/50">
          {[
            ...TABS,

          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-bold uppercase tracking-wider transition-colors border-b-2 ${
                tab === t.key ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}>
              <Icon name={t.icon} size={14} />{t.label}
            </button>
          ))}
        </div>
      )}
    </div>

    {/* ── Body ── */}
    {!loadingUser && (
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={THIN}>
        <div className="p-4 space-y-4">

          {success && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700/50 dark:text-emerald-400 rounded-xl px-4 py-3 text-sm font-medium">
              <Icon name="check_circle" size={14} className="text-emerald-500 flex-shrink-0" />Changes saved.
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-700/50 dark:text-red-400 rounded-xl px-4 py-3 text-sm font-medium">
              <Icon name="error_outline" size={14} className="text-red-400 flex-shrink-0" />{error}
            </div>
          )}

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50 overflow-hidden">
                {[
                  { icon: 'badge',          label: 'Name',       value: uName(user)                },
                  { icon: 'mail',           label: 'Email',      value: user.email                 },
                  { icon: 'phone',          label: 'Phone',      value: user.phone_number || '—'   },
                  { icon: 'fingerprint',    label: 'ID',         value: user.id                    },
                  { icon: 'calendar_today', label: 'Joined',     value: fmtD(user.date_joined)     },
                  { icon: 'schedule',       label: 'Last Login', value: fmtD(user.last_login)      },
                  { icon: 'notifications',  label: 'Subscribed', value: user.email_subscribed ? 'Yes' : 'No' },
                  ...(user.role === 'MODERATOR'
                    ? [{ icon: 'shield', label: 'Sub-role', value: user.sub_role_label || 'Not set' }]
                    : []),
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-3 px-4 py-2.5">
                    <Icon name={r.icon} size={13} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-400 w-20 flex-shrink-0">{r.label}</span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate flex-1">{r.value}</span>
                  </div>
                ))}
              </div>
              {user.bio && (
                <div className="bg-white dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bio</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{user.bio}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Activity</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: 'article',  label: 'Posts',     value: user.activity.posts_count,     c: 'text-primary dark:text-emerald-400'  },
                    { icon: 'comment',  label: 'Comments',  value: user.activity.comments_count,  c: 'text-blue-600 dark:text-blue-400'   },
                    { icon: 'favorite', label: 'Reactions', value: user.activity.reactions_count, c: 'text-rose-500 dark:text-rose-400'   },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center">
                      <Icon name={s.icon} size={15} className={`${s.c} mx-auto mb-1`} />
                      <p className={`text-lg font-bold ${s.c}`}>{s.value}</p>
                      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* CONTROLS */}
          {tab === 'controls' && (
            <>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Role</p>
                <div className="flex flex-col gap-2">
                  {(['MEMBER', 'MODERATOR'] as UserRole[]).map(role => {
                    const m   = ROLE_META[role];
                    const on  = newRole === role;
                    const dis = role === 'MODERATOR' && !uVerified(user);
                    return (
                      <label key={role} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        dis ? 'opacity-50 cursor-not-allowed border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/30'
                        : on ? 'border-primary bg-primary/5 ring-1 ring-primary/20 dark:bg-emerald-500/10 dark:border-primary/50'
                             : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}>
                        <input type="radio" className="sr-only" checked={on} onChange={() => !dis && setNewRole(role)} disabled={dis} />
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${on ? 'bg-primary/10 dark:bg-emerald-500/10' : 'bg-slate-100 dark:bg-slate-700'}`}>
                          <Icon name={m.icon} size={14} className={on ? 'text-primary dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${on ? 'text-primary dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{m.label}</p>
                          {dis && <p className="text-[10px] text-amber-500 font-semibold">Requires verified email</p>}
                        </div>
                        {on && <Icon name="check_circle" size={14} className="text-primary flex-shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              {newRole === 'MODERATOR' && (
                <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-700/50 rounded-xl px-4 py-2.5">
                  <Icon name="shield" size={12} className="text-violet-500 flex-shrink-0" />
                  <p className="text-xs text-violet-700 dark:text-violet-400 font-medium">
                    Module permissions are managed in <strong>Settings → Roles & Permissions</strong>.
                  </p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Account Status</p>
                <div className="flex gap-2">
                  {([
                    { v: 'ACTIVE',    icon: 'check_circle', label: 'Active',    on: 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:ring-emerald-700/30', ic: 'text-emerald-500 dark:text-emerald-400' },
                    { v: 'SUSPENDED', icon: 'block',        label: 'Suspended', on: 'border-red-300 bg-red-50 ring-1 ring-red-200 dark:border-red-700/60 dark:bg-red-950/30 dark:ring-red-700/30',                         ic: 'text-red-500 dark:text-red-400'         },
                  ] as const).map(opt => {
                    const active = newStatus === opt.v;
                    return (
                      <label key={opt.v} className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-all ${active ? opt.on : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                        <input type="radio" className="sr-only" checked={active} onChange={() => setNewStatus(opt.v)} />
                        <Icon name={opt.icon} size={19} className={active ? opt.ic : 'text-slate-300 dark:text-slate-600'} />
                        <span className={`text-xs font-bold ${active ? opt.ic : 'text-slate-400 dark:text-slate-500'}`}>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
                {newStatus === 'SUSPENDED' && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Reason <span className="font-normal text-slate-400">(optional)</span></label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
                      placeholder="Reason for suspension…"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-slate-800 resize-none" />
                  </div>
                )}
              </div>

              {user.is_suspended && user.suspension_reason && (
                <div className="bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800/50 p-4">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">Current Suspension</p>
                  {[
                    { label: 'When',   value: fmtDT(user.suspended_at)          },
                    { label: 'By',     value: user.suspended_by_email || 'N/A'  },
                    { label: 'Reason', value: user.suspension_reason             },
                  ].map(r => (
                    <div key={r.label} className="flex items-start gap-2 mt-1.5">
                      <span className="text-[10px] font-bold text-red-400 w-12 flex-shrink-0 mt-0.5 uppercase tracking-wider">{r.label}</span>
                      <span className="text-xs text-red-700 dark:text-red-400 leading-relaxed">{r.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Current State</p>
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: 'Role',   node: <RoleBadge role={user.role} /> },
                    { label: 'Status', node: <StatusBadge suspended={user.is_suspended} /> },
                    { label: 'Email',  node: uVerified(user)
                        ? <span className="text-xs font-bold text-emerald-600">✓ Verified</span>
                        : <span className="text-xs font-bold text-amber-500">⚠ Unverified</span> },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">{r.label}</span>{r.node}
                    </div>
                  ))}
                  {user.role === 'MODERATOR' && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Permissions</span>
                      <a href="/admin/settings" className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline">
                        <Icon name="shield" size={11} />
                        Manage in Settings
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {hasChanges && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 rounded-xl px-4 py-3 flex items-center gap-2">
                  <Icon name="edit" size={12} className="text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">You have unsaved changes.</p>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={onSave} disabled={saving || !hasChanges}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 transition-all shadow-sm">
                  <Icon name={saving ? 'hourglass_empty' : 'check'} size={14} />
                  {saving ? 'Saving…' : 'Apply Changes'}
                </button>
                <button onClick={() => { setNewRole(user.role); setNewStatus(user.is_suspended ? 'SUSPENDED' : 'ACTIVE'); setReason(''); }}
                  disabled={saving || !hasChanges}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-40">
                  Reset
                </button>
              </div>
            </>
          )}

          {/* ACTIVITY */}
          {tab === 'activity' && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: 'article',            label: 'Posts',     value: user.activity.posts_count,          c: 'text-primary dark:text-emerald-400',    bg: 'bg-primary/10 dark:bg-emerald-500/10'               },
                  { icon: 'comment',            label: 'Comments',  value: user.activity.comments_count,       c: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-950/40'                     },
                  { icon: 'favorite',           label: 'Reactions', value: user.activity.reactions_count,      c: 'text-rose-500 dark:text-rose-400',       bg: 'bg-rose-50 dark:bg-rose-950/40'                     },
                  { icon: 'volunteer_activism', label: 'Prayers',   value: user.activity.prayers_count ?? '—', c: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40'               },
                ].map(m => (
                  <div key={m.label} className="bg-white dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon name={m.icon} size={15} className={m.c} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{m.label}</p>
                      <p className={`text-xl font-bold ${m.c}`}>{m.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                <Icon name="insights" size={30} className="text-slate-200 mx-auto" />
                <p className="text-sm font-semibold text-slate-500 mt-3">Timeline coming soon</p>
                <p className="text-xs text-slate-400 mt-1">Per-user engagement charts will appear here.</p>
              </div>
            </>
          )}

          {/* SECURITY */}
          {tab === 'security' && (
            <>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50 overflow-hidden">
                {[
                  { icon: 'verified_user',  label: 'Email',   value: uVerified(user) ? 'Verified' : 'Unverified', ok: uVerified(user)    },
                  { icon: 'lock',           label: 'Account', value: user.is_suspended ? 'Suspended' : 'Active',   ok: !user.is_suspended },
                  { icon: 'history',        label: 'Login',   value: fmtD(user.last_login),                        ok: !!user.last_login  },
                  { icon: 'calendar_today', label: 'Since',   value: fmtD(user.date_joined),                       ok: true               },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-3 px-4 py-2.5">
                    <Icon name={r.icon} size={13} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                    <span className="text-xs font-semibold text-slate-400 w-16 flex-shrink-0">{r.label}</span>
                    <span className={`text-sm font-semibold ${r.ok ? 'text-slate-700 dark:text-slate-200' : 'text-red-500'}`}>{r.value}</span>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Admin Actions</p>
                <div className="flex flex-col gap-2">
                  {[
                    { icon: 'mark_email_read', label: 'Resend Verification Email',  cls: 'hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-700 dark:hover:border-amber-700/50 dark:hover:bg-amber-950/30 dark:hover:text-amber-400' },
                    { icon: 'lock_reset',      label: 'Send Password Reset Link',   cls: 'hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 dark:hover:border-blue-700/50 dark:hover:bg-blue-950/30 dark:hover:text-blue-400'     },
                    { icon: 'logout',          label: 'Force Sign Out All Devices', cls: 'hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800 dark:hover:border-slate-500 dark:hover:bg-slate-700/50 dark:hover:text-slate-200'     },
                  ].map(a => (
                    <button key={a.label}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-all ${a.cls}`}>
                      <Icon name={a.icon} size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      <span className="flex-1 text-left">{a.label}</span>
                      <Icon name="chevron_right" size={12} className="text-slate-300 dark:text-slate-600" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-800/50 overflow-hidden">
                <div className="px-4 py-3 border-b border-red-100 dark:border-red-800/50 bg-red-50/60 dark:bg-red-950/30 flex items-center gap-2">
                  <Icon name="warning" size={14} className="text-red-500" />
                  <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Danger Zone</span>
                </div>
                <div className="px-4 py-4 flex flex-col gap-2.5">
                  <button onClick={onSetTabControls}
                    className="w-full px-4 py-2.5 rounded-lg border border-amber-300 dark:border-amber-700/50 text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors flex items-center justify-center gap-2">
                    <Icon name="block" size={13} />Suspend Account
                  </button>
                  <button className="w-full px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                    <Icon name="delete_forever" size={13} />Delete Account
                  </button>
                </div>
              </div>
            </>
          )}



        </div>
      </div>
    )}
  </>
));
PanelContent.displayName = 'PanelContent';

// ─── Main component ───────────────────────────────────────────────────────────

const UserManager: React.FC = () => {
  const { confirm } = useConfirm();

  const [users,        setUsers]        = useState<User[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [detail,       setDetail]       = useState<UserDetail | null>(null);
  const [loadingUser,  setLoadingUser]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState('');
  const [tab,          setTab]          = useState<DrawerTab>('overview');

  const [search,         setSearch]         = useState('');
  const [roleFilter,     setRoleFilter]     = useState<UserRole | ''>('');
  const [statusFilter,   setStatusFilter]   = useState<UserStatus | ''>('');
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>('');
  const [sortKey,        setSortKey]        = useState<SortKey>('date_joined');
  const [sortDir,        setSortDir]        = useState<SortDir>('desc');

  const [newRole,   setNewRole]   = useState<UserRole>('MEMBER');
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [reason,    setReason]    = useState('');



  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const deferredSearch = useDeferredValue(search);
  const detailIdRef    = useRef<string | null>(null);

  useEffect(() => {
    detailIdRef.current = detail?.id ?? null;
  }, [detail?.id]);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const d = await apiService.get('/admin/users/');
        if (dead) return;
        let list: User[] = Array.isArray(d) ? d : (d?.results ?? d?.users ?? []);
        list = list.map(normalizeUser);
        setUsers(list);
      } catch { if (!dead) setUsers([]); }
      finally  { if (!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(prev => prev.size === ids.length ? new Set() : new Set(ids));
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const exportCSV = useCallback((rows: User[]) => {
    const headers = ['Name', 'Email', 'Role', 'Status', 'Verified', 'Joined'];
    const lines = [
      headers.join(','),
      ...rows.map(u => [
        uName(u), u.email, u.role,
        u.is_suspended ? 'Suspended' : 'Active',
        uVerified(u) ? 'Verified' : 'Unverified',
        fmtD(u.date_joined),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `users_${Date.now()}.csv`,
    });
    a.click();
  }, []);

  const handleSort = useCallback((k: SortKey) => {
    setSortDir(p => sortKey === k ? (p === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortKey(k);
  }, [sortKey]);

  const openPanel = useCallback(async (user: User) => {
    if (detailIdRef.current === user.id) { setDetail(null); return; }
    setLoadingUser(true);
    setTab('overview');
    setSuccess(false);
    setError('');
    try {
      const d = await apiService.get(`/admin/users/${user.id}/`);
      const detailData = normalizeUserDetail(d);
      setDetail(detailData);
      setUsers(prev => prev.map(u => (
        u.id === detailData.id
          ? { ...u, profile_picture: detailData.profile_picture ?? u.profile_picture }
          : u
      )));
      setNewRole(detailData.role);
      setNewStatus(detailData.is_suspended ? 'SUSPENDED' : 'ACTIVE');
      setReason('');

    } catch {
      const fallback: UserDetail = {
        ...user, phone_number: null, profile_picture: user.profile_picture ?? null, bio: null,
        suspended_at: null, suspended_by: null, suspended_by_email: null,
        suspension_reason: null, suspension_expires_at: null,
        activity: { posts_count: 0, comments_count: 0, reactions_count: 0 },
      };
      setDetail(fallback);
      setNewRole(user.role);
      setNewStatus(user.is_suspended ? 'SUSPENDED' : 'ACTIVE');
    } finally { setLoadingUser(false); }
  }, []);

  const closePanel = useCallback(() => setDetail(null), []);

  const hasChanges = useMemo(() => {
    if (!detail) return false;
    return newRole !== detail.role || newStatus !== (detail.is_suspended ? 'SUSPENDED' : 'ACTIVE');
  }, [detail, newRole, newStatus]);

  const handleSave = useCallback(async () => {
    if (!detail) return;
    const willSuspend = newStatus === 'SUSPENDED' && !detail.is_suspended;
    const doSave = async () => {
      setSaving(true); setError(''); setSuccess(false);
      try {
        const p: Record<string, any> = {};
        if (newRole !== detail.role) p.role = newRole;
        if (willSuspend) { p.action = 'suspend'; if (reason) p.reason = reason; }
        else if (newStatus === 'ACTIVE' && detail.is_suspended) p.action = 'unsuspend';
        await apiService.patch(`/admin/users/${detail.id}/`, p);
        const d = await apiService.get('/admin/users/');
        let list: User[] = Array.isArray(d) ? d : (d?.results ?? d?.users ?? []);
        list = list.map(normalizeUser);
        setUsers(list);
        setDetail(prev => prev ? { ...prev, role: newRole, is_suspended: newStatus === 'SUSPENDED' } : prev);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3500);
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Failed to update user.');
      } finally { setSaving(false); }
    };
    willSuspend
      ? confirm({ title: 'Suspend User', message: `Suspend ${uName(detail)}? They will lose access immediately.`, confirmLabel: 'Suspend', cancelLabel: 'Cancel', variant: 'danger', onConfirm: doSave })
      : doSave();
  }, [detail, newRole, newStatus, reason, confirm]);



  const stats = useMemo(() => {
    let members = 0;
    let moderators = 0;
    let suspended = 0;
    let unverified = 0;

    for (const user of users) {
      if (user.role === 'MEMBER') members += 1;
      if (user.role === 'MODERATOR') moderators += 1;
      if (user.is_suspended) suspended += 1;
      if (!uVerified(user)) unverified += 1;
    }

    return {
      total: users.length,
      members,
      moderators,
      suspended,
      unverified,
    };
  }, [users]);

  const processed = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    let list = users;
    if (q || roleFilter || statusFilter || verifiedFilter) {
      list = users.filter(u => {
        if (roleFilter && u.role !== roleFilter)             return false;
        if (statusFilter === 'active'    &&  u.is_suspended) return false;
        if (statusFilter === 'suspended' && !u.is_suspended) return false;
        const v = uVerified(u);
        if (verifiedFilter === 'verified'   && !v) return false;
        if (verifiedFilter === 'unverified' &&  v) return false;
        if (q && !uName(u).toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
        return true;
      });
    }
    return [...list].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case 'full_name':    av = uName(a); bv = uName(b); break;
        case 'role':         av = a.role;   bv = b.role;   break;
        case 'is_suspended': av = +a.is_suspended; bv = +b.is_suspended; break;
        case 'date_joined':  av = a.date_joined;   bv = b.date_joined;   break;
        case 'last_login':   av = a.last_login ?? ''; bv = b.last_login ?? ''; break;
        default: av = ''; bv = '';
      }
      const c = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? c : -c;
    });
  }, [users, deferredSearch, roleFilter, statusFilter, verifiedFilter, sortKey, sortDir]);

  const activeFilters = [roleFilter, statusFilter, verifiedFilter].filter(Boolean).length + (search ? 1 : 0);
  const panelOpen     = !!detail;

  const panelProps = detail ? {
    user: detail, loadingUser, tab, setTab,
    newRole, setNewRole, newStatus, setNewStatus,
    reason, setReason, hasChanges, saving, success, error,
    onSave: handleSave, onClose: closePanel,
    onSetTabControls: () => { setTab('controls'); setNewStatus('SUSPENDED'); },

  } : null;

  return (
    // ════════════════════════════════════════════════════════════════
    // ROOT: single flex ROW that fills the viewport.
    // LEFT column  = flex-1  (header + toolbar + table, all together)
    // RIGHT column = panel   (fixed width, slides in from right)
    // When the panel opens it takes PANEL_W px; the left col
    // naturally shrinks because it has flex:1 and no min-width set.
    // ════════════════════════════════════════════════════════════════
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT COLUMN — entire left side shrinks as one unit ─────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Page header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <Icon name="manage_accounts" size={17} className="text-primary dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">User Manager</h1>
                <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Manage users, roles, and account status</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportCSV(selectedIds.size > 0 ? processed.filter(u => selectedIds.has(u.id)) : processed)}
                className="hidden sm:flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 px-3 py-2 rounded-lg text-sm font-semibold hover:border-primary dark:hover:border-emerald-500 hover:text-primary dark:hover:text-emerald-400 transition-colors"
              >
                <Icon name="download" size={14} />{selectedIds.size > 0 ? `Export (${selectedIds.size})` : 'Export CSV'}
              </button>
              <button className="flex items-center gap-1.5 bg-primary text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:opacity-90 transition-all">
                <Icon name="person_add" size={14} />
                <span className="hidden sm:inline">Invite User</span>
                <span className="sm:hidden">Invite</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden" style={THIN}>
            {([
              { icon: 'group',             label: 'Total',      val: stats.total,      color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-700'         },
              { icon: 'person',            label: 'Members',    val: stats.members,    color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950/40'         },
              { icon: 'shield',            label: 'Moderators', val: stats.moderators, color: 'text-violet-600 dark:text-violet-400',bg: 'bg-violet-50 dark:bg-violet-950/40'     },
              { icon: 'block',             label: 'Suspended',  val: stats.suspended,  color: 'text-red-500 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950/40'           },
              { icon: 'mark_email_unread', label: 'Unverified', val: stats.unverified, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40'       },
            ] as const).map(s => (
              <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 flex-shrink-0">
                <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon name={s.icon} size={14} className={s.color} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">{s.label}</p>
                  <p className={`text-base font-bold ${s.color} leading-tight mt-0.5`}>{s.val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-2.5 flex-shrink-0 flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={THIN}>
          <div className="relative flex-shrink-0 w-40 sm:w-56">
            <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                <Icon name="close" size={12} />
              </button>
            )}
          </div>
          {[
            { val: roleFilter,     opts: [['', 'All Roles'],   ['MEMBER', 'Members'],   ['MODERATOR', 'Mods']],          set: (v: string) => setRoleFilter(v as any)     },
            { val: statusFilter,   opts: [['', 'All Status'],  ['active', 'Active'],    ['suspended', 'Suspended']],     set: (v: string) => setStatusFilter(v as any)   },
            { val: verifiedFilter, opts: [['', 'Email: All'],  ['verified', 'Verified'],['unverified', 'Unverified']],   set: (v: string) => setVerifiedFilter(v as any) },
          ].map((f, i) => (
            <select key={i} value={f.val} onChange={e => f.set(e.target.value)}
              className="flex-shrink-0 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-primary">
              {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          {activeFilters > 0 && (
            <button onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); setVerifiedFilter(''); }}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors whitespace-nowrap">
              <Icon name="filter_list_off" size={12} />Clear ({activeFilters})
            </button>
          )}
          <span className="ml-auto flex-shrink-0 text-xs text-slate-400 font-medium whitespace-nowrap">
            {processed.length}/{users.length}
          </span>
        </div>

        {/* Bulk action bar — appears when rows are selected */}
        {selectedIds.size > 0 && (
          <div className="flex-shrink-0 bg-primary/5 dark:bg-emerald-500/10 border-b border-primary/20 dark:border-emerald-500/20 px-4 sm:px-6 py-2 flex items-center gap-3">
            <span className="text-xs font-bold text-primary dark:text-emerald-400">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={() => { /* bulk suspend */ }}
                className="px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700/50 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
              >
                <Icon name="block" size={12} />Suspend All
              </button>
              <button
                onClick={() => exportCSV(processed.filter(u => selectedIds.has(u.id)))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:border-primary transition-colors flex items-center gap-1.5"
              >
                <Icon name="download" size={12} />Export Selected
              </button>
            </div>
            <button onClick={clearSelection} className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        {/* Table — scrollable area */}
        <div className="flex-1 overflow-y-auto overflow-x-auto [&::-webkit-scrollbar]:hidden" style={THIN}>
          <table className="w-full min-w-[280px] border-collapse">
            <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700 shadow-sm">
              <tr>
                <th className="hidden md:table-cell pl-4 pr-2 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === processed.length && processed.length > 0}
                    onChange={() => selectAll(processed.map(u => u.id))}
                    className="w-4 h-4 rounded accent-primary cursor-pointer"
                  />
                </th>
                <SortTh label="User"   col="full_name"    sk={sortKey} sd={sortDir} onSort={handleSort} cls="px-4" />
                <SortTh label="Role"   col="role"         sk={sortKey} sd={sortDir} onSort={handleSort} cls={panelOpen ? 'hidden xl:table-cell' : 'hidden sm:table-cell'} />
                <SortTh label="Status" col="is_suspended" sk={sortKey} sd={sortDir} onSort={handleSort} cls={panelOpen ? 'hidden 2xl:table-cell' : 'hidden md:table-cell'} />
                <th className={`px-4 py-3 text-left ${panelOpen ? 'hidden' : 'hidden lg:table-cell'}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</span>
                </th>
                <SortTh label="Joined" col="date_joined"  sk={sortKey} sd={sortDir} onSort={handleSort} cls={panelOpen ? 'hidden' : 'hidden xl:table-cell'} />
                <th className="px-4 py-3 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} i={i} />)
                : processed.length === 0
                  ? (
                    <tr><td colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                          <Icon name="manage_search" size={26} className="text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm font-semibold text-slate-500">No users found</p>
                        <p className="text-xs text-slate-400 mt-1">Adjust your filters or search term.</p>
                      </div>
                    </td></tr>
                  )
                  : processed.map((u, i) => (
                    <TableRow key={u.id} user={u} idx={i}
                      selected={detail?.id === u.id}
                      panelOpen={panelOpen}
                      onOpen={openPanel}
                      checked={selectedIds.has(u.id)}
                      onCheck={toggleSelect}
                    />
                  ))
              }
            </tbody>
          </table>
        </div>

      </div>{/* end LEFT COLUMN */}

      {/* ── RIGHT COLUMN — DESKTOP DETAIL PANEL ──────────────────────
          Animates width 0 → PANEL_W. Because the left col is flex:1
          with no explicit width, it naturally absorbs/releases space.
          Hidden on mobile (md:flex).
      ─────────────────────────────────────────────────────────────── */}
      <div
        className="hidden md:flex flex-col flex-shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 overflow-hidden"
        style={{
          width:      panelOpen ? PANEL_W : 0,
          minWidth:   panelOpen ? PANEL_W : 0,
          transition: 'width 300ms ease, min-width 300ms ease',
        }}
      >
        {/* Inner wrapper keeps content at full PANEL_W while outer clips during animation */}
        <div className="flex flex-col h-full" style={{ width: PANEL_W, minWidth: PANEL_W }}>
          {panelProps && <PanelContent {...panelProps} />}
        </div>
      </div>

      {/* ── MOBILE — fixed bottom sheet ──────────────────────────────── */}
      <div
        onClick={closePanel}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden ${panelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl flex flex-col md:hidden transition-transform duration-300 ease-in-out ${panelOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '90dvh' }}
      >
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        {panelProps && <PanelContent {...panelProps} />}
      </div>

    </div>
  );
};

export default UserManager;
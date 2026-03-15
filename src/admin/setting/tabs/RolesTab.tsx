/**
 * RolesTab — clean edition
 * No sub-role labels, no templates. Just permission counts (X/Y) per moderator.
 */

import React, {
  useState, useEffect, useCallback, useMemo, useRef, memo,
} from 'react';
import Icon from '../../../components/common/Icon';
import { adminUserService } from '../../../services/admin-user.service';
import {
  adminPermissionsService,
  PermissionCodesResponse,
  ModeratorPermissionData,
} from '../../../services/admin-permissions.service';
import { User, UserRole } from '../../../types/auth.types';

const PANEL_W = 460;
const THIN: React.CSSProperties  = { scrollbarWidth: 'thin' };
const NONE: React.CSSProperties  = { scrollbarWidth: 'none', msOverflowStyle: 'none' };

const CAT_META: Record<string, { icon: string; color: string }> = {
  Finance:    { icon: 'payments',  color: 'text-emerald-600 dark:text-emerald-400' },
  Content:    { icon: 'article',   color: 'text-blue-600 dark:text-blue-400'       },
  Scheduling: { icon: 'schedule',  color: 'text-violet-600 dark:text-violet-400'   },
  Community:  { icon: 'people',    color: 'text-amber-600 dark:text-amber-400'     },
  Outreach:   { icon: 'campaign',  color: 'text-pink-600 dark:text-pink-400'       },
};

const AVATAR_GRADS = [
  'from-emerald-500 to-teal-400', 'from-blue-500 to-cyan-400',
  'from-violet-500 to-purple-400', 'from-amber-500 to-orange-400',
  'from-rose-500 to-pink-400',    'from-indigo-500 to-blue-400',
];

const uFirst = (u: User) => (u.firstName || (u as any).first_name || '');
const uLast  = (u: User) => (u.lastName  || (u as any).last_name  || '');
const uPic   = (u: User) => (u.profilePicture || (u as any).profile_picture || '');
const uName  = (u: User) => `${uFirst(u)} ${uLast(u)}`.trim() || u.email.split('@')[0];
const uInit  = (u: User) => { const f = uFirst(u)[0] ?? ''; const l = uLast(u)[0] ?? ''; return (f + l).toUpperCase() || '??'; };
const uGrad  = (id: string) => AVATAR_GRADS[id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_GRADS.length];
const fmtD   = (s?: string | null) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtAgo = (s?: string | null) => {
  if (!s) return '—';
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  if (d === 0) return 'Today'; if (d === 1) return 'Yesterday';
  if (d < 30) return `${d} days ago`; if (d < 365) return `${Math.floor(d / 30)} months ago`;
  return `${Math.floor(d / 365)}y ago`;
};

// Avatar
const Avatar = memo(({ user, cls = 'w-8 h-8 text-xs' }: { user: User; cls?: string }) => (
  <div className={`${cls} rounded-full bg-gradient-to-br ${uGrad(user.id)} flex items-center justify-center flex-shrink-0 font-bold text-white shadow-sm select-none`}>
    {uPic(user)
      ? <img src={uPic(user)} alt={uName(user)} className="w-full h-full rounded-full object-cover" />
      : uInit(user)}
  </div>
));
Avatar.displayName = 'Avatar';

// Permission count column cell
const PermCount = memo(({ granted, total }: { granted: number; total: number }) => {
  if (total === 0) return <span className="text-xs text-slate-400">—</span>;
  const pct    = Math.round((granted / total) * 100);
  const barCls = granted === 0 ? 'bg-amber-400' : pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-500' : 'bg-slate-400';
  const numCls = granted === 0 ? 'text-amber-600 dark:text-amber-400' : pct >= 80 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300';
  return (
    <div className="flex items-center gap-2.5 min-w-[110px]">
      <span className={`text-sm font-bold tabular-nums ${numCls}`}>
        {granted}<span className="text-slate-400 dark:text-slate-500 font-normal text-xs">/{total}</span>
      </span>
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden min-w-[40px]">
        <div className={`h-full rounded-full transition-all duration-300 ${barCls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
});
PermCount.displayName = 'PermCount';

type SortKey = 'name' | 'count' | 'updated_at';
type SortDir = 'asc' | 'desc';

const SortTh = memo(({ label, col, sk, sd, onSort, cls = '' }: {
  label: string; col: SortKey; sk: SortKey; sd: SortDir; onSort: (k: SortKey) => void; cls?: string;
}) => (
  <th onClick={() => onSort(col)} className={`px-4 py-3 text-left cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${cls}`}>
    <div className="flex items-center gap-1">
      <span className={`text-[10px] font-bold uppercase tracking-wider ${sk === col ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>{label}</span>
      <Icon name={sk === col ? (sd === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'} size={11} className={sk === col ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'} />
    </div>
  </th>
));
SortTh.displayName = 'SortTh';

const SkeletonRow = memo(({ i }: { i: number }) => (
  <tr className={`border-b border-slate-100 dark:border-slate-700/50 ${i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'}`}>
    <td className="pl-4 pr-2 py-3 w-8"><div className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" /></td>
    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 animate-pulse flex-shrink-0" /><div className="space-y-1.5"><div className="h-3 w-28 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /><div className="h-2.5 w-36 bg-slate-50 dark:bg-slate-800 rounded animate-pulse" /></div></div></td>
    <td className="hidden sm:table-cell px-4 py-3"><div className="h-2 w-24 bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse" /></td>
    <td className="hidden lg:table-cell px-4 py-3"><div className="h-3 w-16 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" /></td>
    <td className="px-4 py-3 text-right"><div className="h-7 w-14 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse ml-auto" /></td>
  </tr>
));
SkeletonRow.displayName = 'SkeletonRow';

const TableRow = memo(({ user, perms, totalPerms, selected, panelOpen, checked, onCheck, onOpen }: {
  user: User; perms: ModeratorPermissionData | undefined; totalPerms: number;
  selected: boolean; panelOpen: boolean; checked: boolean;
  onCheck: (id: string) => void; onOpen: (u: User) => void;
}) => {
  const count = perms?.permissions.length ?? 0;
  return (
    <tr onClick={() => onOpen(user)} className={`border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors ${selected ? 'bg-emerald-50/70 dark:bg-emerald-500/10' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
      <td className="pl-4 pr-2 py-3 w-8" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={checked} onChange={() => onCheck(user.id)} className="w-4 h-4 rounded accent-emerald-500 cursor-pointer" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar user={user} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-semibold truncate leading-tight ${selected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>{uName(user)}</p>
              {count === 0 && (
                <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <Icon name="warning" size={9} />RISK
                </span>
              )}
            </div>
            <p className={`text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5 ${panelOpen ? 'hidden xl:block' : ''}`}>{user.email}</p>
          </div>
        </div>
      </td>
      <td className={`px-4 py-3 ${panelOpen ? 'hidden lg:table-cell' : 'hidden sm:table-cell'}`}>
        <PermCount granted={count} total={totalPerms} />
      </td>
      <td className={`px-4 py-3 ${panelOpen ? 'hidden' : 'hidden lg:table-cell'}`}>
        <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">{fmtD(perms?.updated_at)}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <button onClick={e => { e.stopPropagation(); onOpen(user); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap ${selected ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`}>
          {selected ? 'Editing' : 'Edit'}
        </button>
      </td>
    </tr>
  );
});
TableRow.displayName = 'TableRow';

// ─── Editor Panel ─────────────────────────────────────────────────────────────

type EditorView = 'permissions' | 'activity';

const EditorPanel = memo(({ user, codesData, currentPerms, saving, onSave, onClose }: {
  user: User; codesData: PermissionCodesResponse; currentPerms: ModeratorPermissionData | null;
  saving: boolean; onSave: (perms: string[]) => void; onClose: () => void;
}) => {
  // Get all valid permission codes from codesData
  const allValidCodes = useMemo(() => new Set(Object.values(codesData.codes).flat().map(c => c.code)), [codesData]);
  
  // Filter currentPerms to only include valid codes (removes stale codes like removed 'fin.hub')
  const validCurrentPerms = useMemo(() => 
    (currentPerms?.permissions ?? []).filter(p => allValidCodes.has(p)),
    [currentPerms, allValidCodes]
  );

  const [selected, setSelected] = useState<Set<string>>(new Set(validCurrentPerms));
  const [view,     setView]     = useState<EditorView>('permissions');
  const prevIdRef = useRef(user.id);
  if (prevIdRef.current !== user.id) { prevIdRef.current = user.id; setSelected(new Set(validCurrentPerms)); setView('permissions'); }

  const totalCodes = useMemo(() => Object.values(codesData.codes).flat().length, [codesData]);
  const coverage   = totalCodes > 0 ? Math.round((selected.size / totalCodes) * 100) : 0;
  const isDirty    = useMemo(() => { return selected.size !== validCurrentPerms.length || [...selected].some(p => !validCurrentPerms.includes(p)); }, [selected, validCurrentPerms]);

  const savedCount  = validCurrentPerms.length ?? 0;
  const savedPct    = totalCodes > 0 ? Math.round((savedCount / totalCodes) * 100) : 0;
  const permsByCat  = useMemo(() => Object.entries(codesData.codes).map(([cat, codes]) => ({ cat, total: codes.length, granted: codes.filter(c => validCurrentPerms.includes(c.code)).length })), [codesData, validCurrentPerms]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 transition-colors">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
        <div className="px-5 py-4 bg-gradient-to-b from-slate-50 dark:from-slate-800/70 to-white dark:to-slate-900">
          <div className="flex items-start justify-between mb-3">
            <Avatar user={user} cls="w-11 h-11 text-sm" />
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><Icon name="close" size={17} /></button>
          </div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{uName(user)}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{user.email}</p>
          <div className="flex gap-2 mt-3.5">
            {[
              { lbl: 'Granted',   val: selected.size, color: 'text-emerald-600 dark:text-emerald-400' },
              { lbl: 'Available', val: totalCodes,    color: 'text-slate-700 dark:text-slate-300' },
              { lbl: 'Coverage',  val: `${coverage}%`, color: 'text-blue-600 dark:text-blue-400' },
            ].map(s => (
              <div key={s.lbl} className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none">{s.lbl}</p>
                <p className={`text-lg font-bold leading-tight mt-1 ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>
          <div className="mt-2.5 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${coverage === 0 ? 'bg-amber-400' : coverage >= 80 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${coverage}%` }} />
          </div>
        </div>
        <div className="flex border-t border-slate-100 dark:border-slate-700/50">
          {([{ key: 'permissions', icon: 'shield', label: 'Permissions' }, { key: 'activity', icon: 'timeline', label: 'Activity' }] as const).map(t => (
            <button key={t.key} onClick={() => setView(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 ${view === t.key ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              <Icon name={t.icon} size={13} />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={THIN}>
        {view === 'permissions' && (
          <div className="p-4 space-y-3">
            {Object.entries(codesData.codes).map(([cat, codes]) => {
              const meta  = CAT_META[cat] ?? { icon: 'tune', color: 'text-slate-400' };
              const catOn = codes.filter(c => selected.has(c.code)).length;
              const allOn = catOn === codes.length;
              return (
                <div key={cat} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-2">
                    <Icon name={meta.icon} size={13} className={meta.color} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{cat}</span>
                    <span className="ml-auto text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">{catOn}/{codes.length}</span>
                    <button onClick={() => setSelected(prev => { const n = new Set(prev); allOn ? codes.forEach(c => n.delete(c.code)) : codes.forEach(c => n.add(c.code)); return n; })} className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline ml-1.5 flex-shrink-0">
                      {allOn ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/40 bg-white dark:bg-slate-900">
                    {codes.map(item => {
                      const on = selected.has(item.code);
                      return (
                        <label key={item.code} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${on ? 'bg-emerald-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                          <input type="checkbox" checked={on} onChange={() => setSelected(prev => { const n = new Set(prev); on ? n.delete(item.code) : n.add(item.code); return n; })} className="w-4 h-4 rounded accent-emerald-500 flex-shrink-0 cursor-pointer" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold leading-tight ${on ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</p>
                            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'activity' && (
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Account Timeline</p>
              {[
                { icon: 'person_add', color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',             label: 'Account created',          value: fmtD(user.dateJoined ?? (user as any).date_joined),  sub: fmtAgo(user.dateJoined ?? (user as any).date_joined) },
                { icon: 'shield',     color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'Permissions last updated', value: fmtD(currentPerms?.updated_at),                      sub: fmtAgo(currentPerms?.updated_at) },
                { icon: 'login',      color: 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400',     label: 'Last login',               value: fmtD(user.lastLogin ?? (user as any).last_login),    sub: fmtAgo(user.lastLogin ?? (user as any).last_login) },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}><Icon name={item.icon} size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.value}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">{item.sub}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Saved Permissions by Category</p>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                {permsByCat.map(({ cat, granted, total }) => {
                  const meta = CAT_META[cat] ?? { icon: 'tune', color: 'text-slate-400' };
                  const pct  = total > 0 ? Math.round((granted / total) * 100) : 0;
                  return (
                    <div key={cat} className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                      <Icon name={meta.icon} size={14} className={meta.color} />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-24 flex-shrink-0">{cat}</span>
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${granted === 0 ? 'bg-slate-200 dark:bg-slate-700' : pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-10 text-right tabular-nums flex-shrink-0">{granted}/{total}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-4">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Total Saved</p>
              <div className="flex items-end gap-3">
                <p className={`text-4xl font-black leading-none tabular-nums ${savedPct === 0 ? 'text-amber-500' : savedPct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {savedCount}<span className="text-lg font-semibold text-slate-400 dark:text-slate-500">/{totalCodes}</span>
                </p>
                <div className="flex-1 pb-1.5">
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${savedPct === 0 ? 'bg-amber-400' : savedPct >= 80 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${savedPct}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{savedPct}% of all permissions</p>
                </div>
              </div>
              {savedPct === 0 && (
                <div className="mt-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2">
                  <Icon name="warning" size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">No permissions assigned — this moderator cannot access any module.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 bg-white dark:bg-slate-900">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 tabular-nums">{selected.size}/{totalCodes} permissions</span>
          {isDirty && <span className="ml-2 text-[10px] text-amber-500 dark:text-amber-400 font-bold">• unsaved</span>}
        </div>
        <button onClick={() => setSelected(new Set(currentPerms?.permissions ?? []))} disabled={!isDirty || saving} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">Reset</button>
        <button onClick={() => onSave(Array.from(selected))} disabled={!isDirty || saving} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm">
          <Icon name={saving ? 'hourglass_empty' : 'shield'} size={13} />{saving ? 'Saving…' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
});
EditorPanel.displayName = 'EditorPanel';

// ─── Permission Lookup Panel ──────────────────────────────────────────────────

type LookupMode = 'by_permission' | 'by_moderator';

const PermissionLookupPanel = memo(({ codesData, moderators, permsMap, onClose }: {
  codesData: PermissionCodesResponse; moderators: User[];
  permsMap: Map<string, ModeratorPermissionData>; onClose: () => void;
}) => {
  const [mode,         setMode]         = useState<LookupMode>('by_permission');
  const [pickedCode,   setPickedCode]   = useState<string | null>(null);
  const [pickedUserId, setPickedUserId] = useState<string | null>(null);
  const totalCodes = useMemo(() => Object.values(codesData.codes).flat().length, [codesData]);
  const allCodes   = useMemo(() => Object.values(codesData.codes).flat(), [codesData]);
  const holders    = useMemo(() => pickedCode ? moderators.filter(m => permsMap.get(m.id)?.permissions.includes(pickedCode)) : [], [pickedCode, moderators, permsMap]);
  const codeMeta   = pickedCode ? allCodes.find(c => c.code === pickedCode) : null;
  const pickedUser = moderators.find(m => m.id === pickedUserId) ?? null;
  const pickedPerm = pickedUserId ? permsMap.get(pickedUserId) ?? null : null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 transition-colors">
      <div className="flex-shrink-0 px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50 dark:from-slate-800/70 to-white dark:to-slate-900">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm"><Icon name="manage_search" size={16} className="text-white" /></div>
            <div><p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">Permission Lookup</p><p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Cross-reference permissions and moderators</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><Icon name="close" size={17} /></button>
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {([{ key: 'by_permission', icon: 'key', label: 'Permission → Holders' }, { key: 'by_moderator', icon: 'person', label: 'Moderator → Permissions' }] as const).map(m => (
            <button key={m.key} onClick={() => setMode(m.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${mode === m.key ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              <Icon name={m.icon} size={12} /><span className="truncate">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={THIN}>
        {mode === 'by_permission' && (
          <div className="p-4 space-y-4">
            <select value={pickedCode ?? ''} onChange={e => setPickedCode(e.target.value || null)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors">
              <option value="">— Choose a permission —</option>
              {Object.entries(codesData.codes).map(([cat, codes]) => (
                <optgroup key={cat} label={cat}>{codes.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}</optgroup>
              ))}
            </select>
            {pickedCode ? (
              <div className="space-y-3">
                <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-200 dark:border-indigo-500/30 p-4">
                  <p className="text-sm font-bold text-indigo-900 dark:text-indigo-200">{codeMeta?.label ?? pickedCode}</p>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-1 leading-relaxed">{codeMeta?.description}</p>
                  <code className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-white/60 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 rounded mt-2 inline-block">{pickedCode}</code>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Holders</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-200 leading-tight mt-0.5 tabular-nums">{holders.length}<span className="text-sm font-semibold text-slate-400 dark:text-slate-500">/{moderators.length}</span></p>
                  </div>
                  <div className="w-16 h-16 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-100 dark:text-slate-700" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${moderators.length > 0 ? (holders.length / moderators.length) * 88 : 0} 88`} className="text-indigo-500 transition-all duration-500" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                {holders.length === 0
                  ? <div className="flex flex-col items-center py-8 text-center"><Icon name="person_off" size={28} className="text-slate-300 dark:text-slate-600 mb-2" /><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Nobody has this permission</p></div>
                  : holders.map(mod => {
                    const mp = permsMap.get(mod.id);
                    return (
                      <div key={mod.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                        <Avatar user={mod} />
                        <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{uName(mod)}</p><p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{mod.email}</p></div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums flex-shrink-0">{mp?.permissions.length ?? 0}<span className="text-xs text-slate-400 font-normal">/{totalCodes}</span></p>
                      </div>
                    );
                  })
                }
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center mb-3"><Icon name="key" size={28} className="text-indigo-400 dark:text-indigo-500" /></div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Pick a permission</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px] leading-relaxed">See every moderator who currently holds this permission code.</p>
              </div>
            )}
          </div>
        )}

        {mode === 'by_moderator' && (
          <div className="p-4 space-y-4">
            <select value={pickedUserId ?? ''} onChange={e => setPickedUserId(e.target.value || null)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-colors">
              <option value="">— Choose a moderator —</option>
              {moderators.map(m => <option key={m.id} value={m.id}>{uName(m)} — {m.email}</option>)}
            </select>
            {pickedUser && pickedPerm ? (() => {
              const perms    = pickedPerm.permissions;
              const cov      = Math.round((perms.length / totalCodes) * 100);
              const byCat    = Object.entries(codesData.codes).map(([cat, codes]) => ({ cat, codes: codes.filter(c => perms.includes(c.code)), total: codes.length })).filter(b => b.codes.length > 0);
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30">
                    <Avatar user={pickedUser} cls="w-10 h-10 text-sm" />
                    <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{uName(pickedUser)}</p><p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{pickedUser.email}</p></div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xl font-black tabular-nums ${cov === 0 ? 'text-amber-500' : cov >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{perms.length}<span className="text-sm font-semibold text-slate-400 dark:text-slate-500">/{totalCodes}</span></p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{cov}% coverage</p>
                    </div>
                  </div>
                  {perms.length === 0
                    ? <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-4 py-3"><Icon name="warning" size={16} className="text-amber-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Zero permissions — cannot access any module.</p></div>
                    : byCat.map(({ cat, codes, total }) => {
                      const meta = CAT_META[cat] ?? { icon: 'tune', color: 'text-slate-400' };
                      return (
                        <div key={cat} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700/50 flex items-center gap-2">
                            <Icon name={meta.icon} size={13} className={meta.color} />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{cat}</span>
                            <span className="ml-auto text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">{codes.length}/{total}</span>
                          </div>
                          <div className="divide-y divide-slate-100 dark:divide-slate-700/40 bg-white dark:bg-slate-900">
                            {codes.map(item => (
                              <div key={item.code} className="flex items-center gap-3 px-4 py-2.5 bg-emerald-500/5">
                                <Icon name="check_circle" size={14} className="text-emerald-500 flex-shrink-0" />
                                <div className="min-w-0"><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 leading-tight">{item.label}</p><p className="text-[10px] text-slate-400 leading-tight mt-0.5">{item.description}</p></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              );
            })() : (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center mb-3"><Icon name="person_search" size={28} className="text-indigo-400 dark:text-indigo-500" /></div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Pick a moderator</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px] leading-relaxed">See all permissions they hold, grouped by category.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
PermissionLookupPanel.displayName = 'PermissionLookupPanel';

// ─── Main ─────────────────────────────────────────────────────────────────────

type PanelMode = 'editor' | 'lookup' | null;

const RolesTab: React.FC = () => {
  const [codesData,   setCodesData]   = useState<PermissionCodesResponse | null>(null);
  const [moderators,  setModerators]  = useState<User[]>([]);
  const [permsMap,    setPermsMap]    = useState<Map<string, ModeratorPermissionData>>(new Map());
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [panelMode,   setPanelMode]   = useState<PanelMode>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [search,      setSearch]      = useState('');
  const [filterZero,  setFilterZero]  = useState(false);
  const [sortKey,     setSortKey]     = useState<SortKey>('name');
  const [sortDir,     setSortDir]     = useState<SortDir>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPerms,   setBulkPerms]   = useState<'all' | 'none' | ''>('');
  const [bulkSaving,  setBulkSaving]  = useState(false);

  const showToast = useCallback((msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [codes, usersResp] = await Promise.all([adminPermissionsService.getPermissionCodes(), adminUserService.getUsers({ role: UserRole.MODERATOR })]);
      const users: User[] = Array.isArray(usersResp) ? usersResp : ((usersResp as any).results ?? []);
      setCodesData(codes); setModerators(users);
      const results = await Promise.allSettled(users.map(u => adminPermissionsService.getModeratorPermissions(u.id)));
      const map = new Map<string, ModeratorPermissionData>();
      results.forEach((r, i) => { if (r.status === 'fulfilled') map.set(users[i].id, r.value); });
      setPermsMap(map);
    } catch { showToast('Failed to load data', false); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalCodes = useMemo(() => codesData ? Object.values(codesData.codes).reduce((s, a) => s + a.length, 0) : 0, [codesData]);
  const allCodes   = useMemo(() => codesData ? Object.values(codesData.codes).flat().map(c => c.code) : [], [codesData]);
  const zeroCount  = useMemo(() => moderators.filter(u => (permsMap.get(u.id)?.permissions.length ?? 0) === 0).length, [moderators, permsMap]);
  const avgCov     = useMemo(() => {
    if (!moderators.length || !totalCodes) return 0;
    return Math.round(moderators.reduce((s, u) => s + (permsMap.get(u.id)?.permissions.length ?? 0), 0) / (moderators.length * totalCodes) * 100);
  }, [moderators, permsMap, totalCodes]);

  const handleSort   = useCallback((k: SortKey) => { setSortDir(p => sortKey === k ? (p === 'asc' ? 'desc' : 'asc') : 'asc'); setSortKey(k); }, [sortKey]);
  const openEditor   = useCallback((user: User) => { if (editingUser?.id === user.id) { setPanelMode(null); setEditingUser(null); } else { setEditingUser(user); setPanelMode('editor'); } }, [editingUser]);
  const closePanel   = useCallback(() => { setPanelMode(null); setEditingUser(null); }, []);
  const openLookup   = useCallback(() => { setPanelMode(p => p === 'lookup' ? null : 'lookup'); setEditingUser(null); }, []);
  const toggleSelect = useCallback((id: string) => { setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }, []);

  const handleSave = useCallback(async (userId: string, perms: string[]) => {
    setSaving(true);
    try { const u = await adminPermissionsService.updateModeratorPermissions(userId, perms, ''); setPermsMap(prev => new Map(prev).set(userId, u)); showToast('Permissions saved'); }
    catch { showToast('Failed to save', false); }
    finally { setSaving(false); }
  }, [showToast]);

  const handleBulkApply = useCallback(async () => {
    if (!bulkPerms || selectedIds.size === 0) return;
    const perms = bulkPerms === 'all' ? allCodes : [];
    setBulkSaving(true);
    const count = selectedIds.size;
    try {
      await Promise.all(Array.from(selectedIds).map(uid => adminPermissionsService.updateModeratorPermissions(uid, perms, '')));
      await loadData(); setSelectedIds(new Set()); setBulkPerms('');
      showToast(`Updated ${count} moderator${count !== 1 ? 's' : ''}`);
    } catch { showToast('Bulk update failed', false); }
    finally { setBulkSaving(false); }
  }, [bulkPerms, selectedIds, allCodes, loadData, showToast]);

  const processed = useMemo(() => {
    let list = moderators;
    const q = search.toLowerCase().trim();
    if (q) list = list.filter(u => `${uName(u)} ${u.email}`.toLowerCase().includes(q));
    if (filterZero) list = list.filter(u => (permsMap.get(u.id)?.permissions.length ?? 0) === 0);
    return [...list].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === 'name')       { av = uName(a); bv = uName(b); }
      else if (sortKey === 'count') { av = permsMap.get(a.id)?.permissions.length ?? 0; bv = permsMap.get(b.id)?.permissions.length ?? 0; }
      else                          { av = permsMap.get(a.id)?.updated_at ?? ''; bv = permsMap.get(b.id)?.updated_at ?? ''; }
      const c = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? c : -c;
    });
  }, [moderators, search, filterZero, sortKey, sortDir, permsMap]);

  const panelOpen = panelMode !== null;

  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-200">
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-4 transition-colors">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm"><Icon name="security" size={18} className="text-white" /></div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">Roles & Permissions</h1>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 hidden sm:block">Manage what each moderator can access</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={openLookup} className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${panelMode === 'lookup' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}>
                <Icon name="manage_search" size={14} /><span className="hidden sm:inline">{panelMode === 'lookup' ? 'Close Lookup' : 'Permission Lookup'}</span>
              </button>
              <button onClick={loadData} disabled={loading} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all">
                <Icon name={loading ? 'hourglass_empty' : 'refresh'} size={14} /><span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5" style={NONE}>
            {[
              { icon: 'group',       label: 'Moderators',       val: moderators.length, sub: 'total',                          bg: 'bg-violet-50 dark:bg-violet-500/10',   ic: 'text-violet-600 dark:text-violet-400'  },
              { icon: 'warning',     label: 'Zero Permissions', val: zeroCount,         sub: zeroCount > 0 ? '⚠ needs action' : 'all assigned', bg: zeroCount > 0 ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10', ic: zeroCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400' },
              { icon: 'donut_small', label: 'Avg Coverage',     val: `${avgCov}%`,      sub: `across ${totalCodes} total`,    bg: 'bg-blue-50 dark:bg-blue-500/10',       ic: 'text-blue-600 dark:text-blue-400'      },
              { icon: 'tune',        label: 'Permission Codes', val: totalCodes,        sub: `${codesData ? Object.keys(codesData.codes).length : 0} categories`, bg: 'bg-slate-100 dark:bg-slate-700/60', ic: 'text-slate-600 dark:text-slate-400' },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 ${s.bg} flex-shrink-0`}>
                <div className="w-8 h-8 rounded-lg bg-white/60 dark:bg-slate-800/60 flex items-center justify-center flex-shrink-0"><Icon name={s.icon} size={15} className={s.ic} /></div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none">{s.label}</p>
                  <p className={`text-lg font-bold leading-tight mt-0.5 ${s.ic}`}>{s.val}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 whitespace-nowrap">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex-shrink-0 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-2.5 flex items-center gap-3 overflow-x-auto transition-colors" style={NONE}>
          <div className="relative flex-shrink-0 w-40 sm:w-56">
            <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input type="text" placeholder="Search moderators…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-7 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><Icon name="close" size={12} /></button>}
          </div>
          {zeroCount > 0 && (
            <button onClick={() => setFilterZero(v => !v)} className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${filterZero ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}>
              <Icon name="warning" size={11} />No permissions
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${filterZero ? 'bg-white/20 text-white' : 'bg-amber-50 dark:bg-amber-500/10'}`}>{zeroCount}</span>
            </button>
          )}
          <span className="ml-auto flex-shrink-0 text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap tabular-nums">{processed.length}/{moderators.length}</span>
        </div>

        {/* Bulk bar */}
        {selectedIds.size > 0 && (
          <div className="flex-shrink-0 bg-violet-50 dark:bg-violet-500/10 border-b border-violet-200 dark:border-violet-500/20 px-4 sm:px-6 py-2 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-violet-700 dark:text-violet-400">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2">
              <select value={bulkPerms} onChange={e => setBulkPerms(e.target.value as any)} className="border border-violet-200 dark:border-violet-500/40 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none">
                <option value="">— Bulk set permissions —</option>
                <option value="all">Grant all permissions</option>
                <option value="none">Remove all permissions</option>
              </select>
              <button onClick={handleBulkApply} disabled={!bulkPerms || bulkSaving} className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition-colors">
                <Icon name={bulkSaving ? 'hourglass_empty' : 'bolt'} size={12} />{bulkSaving ? 'Applying…' : 'Apply'}
              </button>
            </div>
            <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><Icon name="close" size={14} /></button>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`flex-shrink-0 flex items-center gap-2 px-4 sm:px-6 py-2.5 text-sm font-semibold border-b ${toast.ok ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400'}`}>
            <Icon name={toast.ok ? 'check_circle' : 'error_outline'} size={15} className="flex-shrink-0" />{toast.msg}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto overflow-x-auto" style={THIN}>
          <table className="w-full min-w-[360px] border-collapse">
            <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
              <tr>
                <th className="pl-4 pr-2 py-3 w-8">
                  <input type="checkbox" checked={selectedIds.size === processed.length && processed.length > 0} onChange={() => setSelectedIds(prev => prev.size === processed.length ? new Set() : new Set(processed.map(u => u.id)))} className="w-4 h-4 rounded accent-emerald-500 cursor-pointer" />
                </th>
                <SortTh label="Moderator"   col="name"       sk={sortKey} sd={sortDir} onSort={handleSort} cls="px-4" />
                <SortTh label="Permissions" col="count"      sk={sortKey} sd={sortDir} onSort={handleSort} cls={panelOpen ? 'hidden lg:table-cell' : 'hidden sm:table-cell'} />
                <SortTh label="Updated"     col="updated_at" sk={sortKey} sd={sortDir} onSort={handleSort} cls={panelOpen ? 'hidden' : 'hidden lg:table-cell'} />
                <th className="px-4 py-3 text-right"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} i={i} />)
                : processed.length === 0
                  ? <tr><td colSpan={5}><div className="flex flex-col items-center justify-center py-20 text-center"><div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3"><Icon name="manage_accounts" size={26} className="text-slate-300 dark:text-slate-600" /></div><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{moderators.length === 0 ? 'No moderators yet' : 'No results found'}</p><p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[220px] leading-relaxed">{moderators.length === 0 ? 'Promote a member to Moderator in User Management first.' : 'Try clearing the search or filter.'}</p></div></td></tr>
                  : processed.map(u => <TableRow key={u.id} user={u} perms={permsMap.get(u.id)} totalPerms={totalCodes} selected={panelMode === 'editor' && editingUser?.id === u.id} panelOpen={panelOpen} checked={selectedIds.has(u.id)} onCheck={toggleSelect} onOpen={openEditor} />)
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Right panel (desktop) */}
      <div className="hidden md:flex flex-col flex-shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 overflow-hidden transition-colors" style={{ width: panelOpen ? PANEL_W : 0, minWidth: panelOpen ? PANEL_W : 0, transition: 'width 300ms ease, min-width 300ms ease' }}>
        <div className="flex flex-col h-full" style={{ width: PANEL_W, minWidth: PANEL_W }}>
          {panelMode === 'editor' && editingUser && codesData && <EditorPanel user={editingUser} codesData={codesData} currentPerms={permsMap.get(editingUser.id) ?? null} saving={saving} onSave={perms => handleSave(editingUser.id, perms)} onClose={closePanel} />}
          {panelMode === 'lookup' && codesData && <PermissionLookupPanel codesData={codesData} moderators={moderators} permsMap={permsMap} onClose={closePanel} />}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div onClick={closePanel} className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden ${panelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
      <div className={`fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl flex flex-col md:hidden transition-transform duration-300 ease-in-out ${panelOpen ? 'translate-y-0' : 'translate-y-full'}`} style={{ maxHeight: '92dvh' }}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0"><div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" /></div>
        {panelMode === 'editor' && editingUser && codesData && <EditorPanel user={editingUser} codesData={codesData} currentPerms={permsMap.get(editingUser.id) ?? null} saving={saving} onSave={perms => handleSave(editingUser.id, perms)} onClose={closePanel} />}
        {panelMode === 'lookup' && codesData && <PermissionLookupPanel codesData={codesData} moderators={moderators} permsMap={permsMap} onClose={closePanel} />}
      </div>
    </div>
  );
};

export default React.memo(RolesTab);
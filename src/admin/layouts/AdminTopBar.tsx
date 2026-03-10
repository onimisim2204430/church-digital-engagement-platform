/**
 * AdminTopBar.tsx — matches FinancialDashboard aesthetic
 * Fonts: Syne (brand) + JetBrains Mono (everything else)
 * Colors: CSS vars from AdminLayout injection
 * Theme: delegate toggle to AdminThemeContext (no local state)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import Icon from '../../components/common/Icon';
import { useAdminTheme } from './AdminLayout';
import { useNotificationWebSocket } from '../../hooks/useNotificationWebSocket';
import notificationService, { Notification } from '../../services/notification.service';
import apiService from '../../services/api.service';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TopBarProps {
  onMenuClick?:       () => void;
  onRightPanelClick?: () => void;
  showRightPanelBtn?: boolean;
  routeTitle?:        string;
  routeSub?:          string;
}

// ─── Notification config ──────────────────────────────────────────────────────
const NOTIF_META: Record<string, { icon: string; dot: string }> = {
  PAYMENT_SUCCESS:     { icon: 'payments',       dot: '#10b981' },
  PAYMENT_FAILED:      { icon: 'money_off',       dot: '#ef4444' },
  SYSTEM_ALERT:        { icon: 'warning',         dot: '#f59e0b' },
  ADMIN_MESSAGE:       { icon: 'campaign',        dot: '#3b82f6' },
  SECURITY_EVENT:      { icon: 'security',        dot: '#ef4444' },
  ROLE_UPDATED:        { icon: 'manage_accounts', dot: '#a855f7' },
  PERMISSIONS_UPDATED: { icon: 'shield',          dot: '#a855f7' },
};
const DEFAULT_META = { icon: 'notifications', dot: '#64748b' };

function relTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const FINANCE_TYPES = new Set(['PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'SYSTEM_ALERT', 'ADMIN_MESSAGE']);
const CONTENT_TYPES = new Set(['SYSTEM_ALERT', 'ADMIN_MESSAGE']);

function useAdminNotifications(userRole: string, permissions: string[]) {
  const [items,   setItems]   = useState<Notification[]>([]);
  const [unread,  setUnread]  = useState(0);
  const [loading, setLoading] = useState(false);

  const relevantTypes = React.useMemo(() => {
    if (userRole === 'ADMIN') return null;
    return permissions.some(p => p.startsWith('fin.')) ? FINANCE_TYPES : CONTENT_TYPES;
  }, [userRole, permissions]);

  const passes = useCallback((n: Notification) =>
    !relevantTypes || relevantTypes.has(n.notification_type), [relevantTypes]);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await apiService.get('/notifications/admin/');
      const res: Notification[] = (data.results || []).filter(passes);
      setItems(res);
      setUnread(data.unread_count ?? res.filter(r => !r.is_read).length);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [passes]);

  const handleWs = useCallback((n: Notification) => {
    if (!passes(n)) return;
    setItems(p => [n, ...p.slice(0, 29)]);
    setUnread(p => p + 1);
  }, [passes]);

  const markAll = useCallback(async () => {
    try {
      await apiService.post('/notifications/admin/');
      setItems(p => p.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* silent */ }
  }, []);

  const markOne = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setItems(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(p => Math.max(0, p - 1));
    } catch { /* silent */ }
  }, []);

  return { items, unread, loading, fetch, handleWs, markAll, markOne };
}

// ─── Component ────────────────────────────────────────────────────────────────
const AdminTopBar: React.FC<TopBarProps> = ({
  onMenuClick,
  onRightPanelClick,
  showRightPanelBtn = false,
  routeTitle = 'Dashboard',
  routeSub   = '',
}) => {
  const navigate          = useNavigate();
  const { user, logout }  = useAuth();
  const { isDark, toggle } = useAdminTheme();

  const [searchTerm,  setSearchTerm]  = useState('');
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [showUser,    setShowUser]    = useState(false);
  const [showNotif,   setShowNotif]   = useState(false);

  const userRef  = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const userRole   = (user as any)?.role || '';
  const perms: string[] = (user as any)?.permissions || [];

  const { items: notifs, unread, loading, fetch, handleWs, markAll, markOne }
    = useAdminNotifications(userRole, perms);

  useEffect(() => {
    if (user?.id && (userRole === 'ADMIN' || userRole === 'MODERATOR')) fetch();
  }, [user?.id, userRole, fetch]);

  useEffect(() => {
    if (!user?.id || (userRole !== 'ADMIN' && userRole !== 'MODERATOR')) return;
    const t = setInterval(fetch, 60_000);
    return () => clearInterval(t);
  }, [user?.id, userRole, fetch]);

  useNotificationWebSocket({
    onNotification: handleWs,
    enabled: Boolean(user?.id) && (userRole === 'ADMIN' || userRole === 'MODERATOR'),
  });

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setShowUser(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => (document.getElementById('admin-search') as HTMLInputElement)?.focus(), 40);
      }
      if (e.key === 'Escape') { setSearchOpen(false); setShowNotif(false); setShowUser(false); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const initials = () => {
    const f = user?.firstName?.charAt(0) || '';
    const l = user?.lastName?.charAt(0)  || '';
    return (f + l).toUpperCase() || 'U';
  };

  // ── Shared dropdown base styles ────────────────────────────────
  const ddStyle: React.CSSProperties = {
    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
    zIndex: 50, minWidth: 280,
    background: 'var(--bg2)',
    border: '1px solid var(--border-color)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-lg)',
  };

  // ── Avatar ────────────────────────────────────────────────────
  const Avatar = (
    <div style={{
      width: 30, height: 30, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
      border: '1px solid var(--em-border)',
      background: 'var(--emd)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--em)', fontSize: 12, fontWeight: 700,
    }}>
      {user?.profilePicture
        ? <img src={user.profilePicture} alt="Profile" className="admin-avatar-img" />
        : initials()}
    </div>
  );

  return (
    <header
      className="admin-topbar flex items-center justify-between flex-shrink-0 relative"
      style={{ height: 56, padding: '0 14px' }}
    >
      {/* ── LEFT ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>

        {/* Hamburger */}
        <button
          onClick={onMenuClick}
          className="tb-btn tb-hamburger"
          aria-label="Menu"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="15" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Brand — Syne font matches FinancialDashboard logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <Icon name="spa" size={17} style={{ color: 'var(--em)' } as any} />
          <span
            className="brand-title tb-brand-name"
            style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 800, letterSpacing: '-.02em',
                     background: 'linear-gradient(135deg,var(--em),var(--em2))',
                     WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Serene Sanctuary
          </span>
        </div>

        <div className="admin-vdiv tb-divider-md" />

        {/* Route title */}
        <div className="tb-route-title" style={{ minWidth: 0 }}>
          <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 700,
                      color: 'var(--text-primary)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
            {routeTitle}
          </p>

        </div>

        {/* Status chip */}
        <div className="status-chip status-chip-wrap" style={{ marginLeft: 6 }}>
          <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--em)' }} />
          Online
        </div>
      </div>

      {/* ── CENTER: Search ───────────────────────────────── */}
      <div className="admin-search-bar">
        <div style={{ position: 'relative' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            id="admin-search"
            type="text"
            placeholder="Search admin…  Ctrl K"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="admin-search"
          />
        </div>
      </div>

      {/* ── RIGHT ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>

        {/* Mobile search */}
        <button className="tb-btn tb-mobile-search" onClick={() => setSearchOpen(s => !s)} aria-label="Search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {/* Right panel btn (mobile, dashboard only) */}
        {showRightPanelBtn && (
          <button className="tb-btn tb-rpanel-btn" onClick={onRightPanelClick} aria-label="Pastoral panel">
            <Icon name="notifications_active" size={15} />
          </button>
        )}

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="tb-btn"
            aria-label="Notifications"
            onClick={() => { const n = !showNotif; setShowNotif(n); if (n) fetch(); }}
          >
            <Icon name="notifications" size={16} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: 5, right: 5,
                minWidth: 14, height: 14, borderRadius: 9999,
                background: '#ef4444', color: '#fff',
                fontSize: 9, fontWeight: 700, lineHeight: '14px', textAlign: 'center',
                padding: '0 3px', border: '1.5px solid var(--bg1)',
              }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="dropdown-animate" style={{ ...ddStyle, width: 320 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
                  {unread > 0 && <span className="em-badge">{unread} new</span>}
                </div>
                {unread > 0 && (
                  <button onClick={markAll}
                    style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--em)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="admin-scroll" style={{ maxHeight: 340, overflowY: 'auto' }}>
                {loading && !notifs.length ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                    <Icon name="hourglass_empty" size={18} style={{ color: 'var(--text-tertiary)' } as any} className="animate-spin" />
                  </div>
                ) : !notifs.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                padding: '36px 0', color: 'var(--text-tertiary)' }}>
                    <Icon name="notifications_none" size={26} />
                    <p style={{ fontSize: 11 }}>No notifications</p>
                  </div>
                ) : notifs.map(n => {
                  const meta = NOTIF_META[n.notification_type] ?? DEFAULT_META;
                  return (
                    <button key={n.id} onClick={() => !n.is_read && markOne(n.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '10px 16px', background: n.is_read ? 'none' : 'rgba(16,185,129,.04)',
                        border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? 'none' : 'rgba(16,185,129,.04)')}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: n.is_read ? 'var(--bg3)' : 'var(--emd)',
                      }}>
                        <Icon name={meta.icon} size={13} style={{ color: n.is_read ? 'var(--text-tertiary)' : 'var(--em)' } as any} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 11.5, fontWeight: n.is_read ? 500 : 700,
                                    color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)',
                                    margin: 0, lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {n.title}
                        </p>
                        <p style={{ fontSize: 10, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                          {relTime(n.created_at)}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot,
                                       flexShrink: 0, marginTop: 8 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Help */}
        <button className="tb-btn" onClick={() => navigate('/admin/settings')} aria-label="Help">
          <Icon name="help_outline" size={16} />
        </button>

        {/* Theme toggle */}
        <button
          className="tb-btn"
          onClick={toggle}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
          style={{ overflow: 'hidden' }}
        >
          {/* Sun */}
          <svg style={{ position: 'absolute', width: 16, height: 16,
                        transition: 'opacity .2s, transform .2s',
                        opacity: isDark ? 1 : 0, transform: isDark ? 'rotate(0deg)' : 'rotate(-90deg) scale(.5)' }}
               viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
          {/* Moon */}
          <svg style={{ position: 'absolute', width: 16, height: 16,
                        transition: 'opacity .2s, transform .2s',
                        opacity: isDark ? 0 : 1, transform: isDark ? 'rotate(90deg) scale(.5)' : 'rotate(0deg)' }}
               viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
          <span style={{ width: 16, height: 16, visibility: 'hidden' }} />
        </button>

        <div className="admin-vdiv" style={{ margin: '0 2px' }} />

        {/* User menu */}
        <div ref={userRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUser(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
                     cursor: 'pointer', borderRadius: 8, padding: '4px 6px' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {/* Name hidden on mobile */}
            <div className="tb-user-name" style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700,
                          color: 'var(--text-primary)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p style={{ fontSize: 9.5, color: 'var(--text-tertiary)', textTransform: 'uppercase',
                          letterSpacing: '.07em', marginTop: 2 }}>
                {user?.role}
              </p>
            </div>
            {Avatar}
          </button>

          {showUser && (
            <div className="dropdown-animate" style={{ ...ddStyle, minWidth: 200 }}>
              {/* User info */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {user?.firstName} {user?.lastName}
                </p>
                <p style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>{user?.email}</p>
                <span className="em-badge" style={{ marginTop: 6, display: 'inline-flex' }}>
                  {user?.role}
                </span>
              </div>
              {/* Actions */}
              <div style={{ padding: '4px 0' }}>
                {[
                  { label: 'Settings',    icon: 'settings', action: () => { navigate('/admin/settings'); setShowUser(false); } },
                  { label: 'Public Site', icon: 'public',   action: () => { navigate('/');               setShowUser(false); } },
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 16px',
                             background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
                             fontSize: 12, textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Icon name={item.icon} size={14} style={{ color: 'var(--text-tertiary)' } as any} />
                    {item.label}
                  </button>
                ))}
                <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />
                <button onClick={handleLogout}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 16px',
                           background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444',
                           fontSize: 12, textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <Icon name="logout" size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="mobile-search-overlay">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
               style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            autoFocus
            type="text"
            placeholder="Search admin…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
                     fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: 'var(--text-primary)' }}
          />
          <button className="tb-btn" onClick={() => setSearchOpen(false)} aria-label="Close search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}
    </header>
  );
};

export default AdminTopBar;
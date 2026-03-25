/**
 * Member TopBar — Sovereign Component
 * SOVEREIGN: zero shared imports from admin or public layout.
 *
 * Features:
 *  - Hamburger (mobile only)
 *  - Dynamic title / breadcrumb slot
 *  - Dark-mode toggle (persisted to localStorage under member-theme key)
 *  - Notification bell with real-time WebSocket + REST fallback
 *  - User avatar dropdown (profile, settings, sign out)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNotificationWebSocket } from '../../hooks/useNotificationWebSocket';
import notificationService, { Notification } from '../../services/notification.service';
import './MemberTopBar.css';

/* ── Types ─────────────────────────────────────────────────── */
interface Breadcrumb {
  label: string;
  onClick?: () => void;
}

interface TopBarProps {
  title?: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  onMenuClick?: () => void;
}

/* ── Helpers ────────────────────────────────────────────────── */
function formatTimeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

/* ── Component ──────────────────────────────────────────────── */
const MemberTopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  onMenuClick,
}) => {
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const toast     = useToast();

  const [isDark,             setIsDark]             = useState(false);
  const [showUserMenu,       setShowUserMenu]        = useState(false);
  const [showNotifications,  setShowNotifications]   = useState(false);
  const [notifications,      setNotifications]       = useState<Notification[]>([]);
  const [unreadCount,        setUnreadCount]         = useState(0);
  const [loadingNotifs,      setLoadingNotifs]       = useState(false);

  const userMenuRef  = useRef<HTMLDivElement>(null);
  const notifRef     = useRef<HTMLDivElement>(null);

  /* ── Theme ────────────────────────────────────────────────── */
  useEffect(() => {
    const saved      = localStorage.getItem('member-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved === 'dark' || (!saved && prefersDark);
    setIsDark(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('member-theme', next ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  };

  /* ── Notifications ────────────────────────────────────────── */
  const fetchNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const r = await notificationService.getUnreadNotifications(1, 10);
      setNotifications(r.results   ?? []);
      setUnreadCount  (r.unread_count ?? 0);
    } catch {
      // silent — panel will show empty state
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) fetchNotifications();
  }, [user?.id, fetchNotifications]);

  /* 60s fallback poll */
  useEffect(() => {
    if (!user?.id) return;
    const id = setInterval(async () => {
      try {
        const r = await notificationService.getUnreadNotifications(1, 1);
        setUnreadCount(r.unread_count ?? 0);
      } catch { /* silent */ }
    }, 60_000);
    return () => clearInterval(id);
  }, [user?.id]);

  /* WebSocket */
  const onWsNotification = useCallback((n: Notification) => {
    const t = n.notification_type ?? '';
    if (t.includes('PAYMENT_SUCCESS'))     toast.success(n.title, 5000);
    else if (t.includes('PAYMENT_FAILED')) toast.error(n.title, 5000);
    else                                   toast.info(n.title, 5000);
    setNotifications(prev => [n, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, [toast]);

  useNotificationWebSocket({
    onNotification:  onWsNotification,
    onConnect:    () => {},
    onDisconnect: () => {},
    enabled: Boolean(user?.id),
  });

  const handleNotifToggle = useCallback(() => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next && user?.id) fetchNotifications();
  }, [showNotifications, user?.id, fetchNotifications]);

  const handleNotifClick = useCallback(async (n: Notification) => {
    try {
      await notificationService.markAsRead(n.id);
      setNotifications(prev => prev.filter(x => x.id !== n.id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      const t = n.notification_type ?? '';
      if (t.includes('PAYMENT')) {
        const pid = n.metadata?.payment_id ?? n.metadata?.reference;
        navigate(pid ? `/member/giving?payment=${pid}` : '/member/giving');
      }
    } catch { /* silent */ } finally {
      setShowNotifications(false);
    }
  }, [navigate]);

  /* ── Click outside ────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── User ─────────────────────────────────────────────────── */
  const initials = (() => {
    const f = user?.firstName?.charAt(0) ?? '';
    const l = user?.lastName?.charAt(0)  ?? '';
    return (f + l).toUpperCase() || 'M';
  })();

  const fullName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email?.split('@')[0] ?? 'Member';

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <header className="m-topbar" role="banner">
      <div className="m-topbar-inner">

        {/* Left */}
        <div className="m-topbar-left">
          <button
            className="m-topbar-menu-btn"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>menu</span>
          </button>

          <div className="m-topbar-title-section">
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav className="m-topbar-breadcrumbs" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="m-topbar-crumb-sep" aria-hidden="true">/</span>}
                    {crumb.onClick ? (
                      <button className="m-topbar-crumb" onClick={crumb.onClick}>
                        {crumb.label}
                      </button>
                    ) : (
                      <span className="m-topbar-crumb current">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            ) : (
              <>
                {title    && <h1 className="m-topbar-title">{title}</h1>}
                {subtitle && <p  className="m-topbar-subtitle">{subtitle}</p>}
              </>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="m-topbar-right">
          {actions && <div className="m-topbar-actions">{actions}</div>}

          {/* Theme toggle */}
          <button
            className="m-topbar-icon-btn"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Notifications */}
          <div className="m-topbar-dropdown-wrap" ref={notifRef}>
            <button
              className="m-topbar-icon-btn"
              onClick={handleNotifToggle}
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={showNotifications}
              aria-haspopup="true"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                notifications
              </span>
              {unreadCount > 0 && (
                <span className={`m-topbar-notif-badge${unreadCount > 0 ? ' pulse' : ''}`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="m-topbar-notif-panel" role="dialog" aria-label="Notifications">
                <div className="m-notif-panel-header">
                  <h2 className="m-notif-panel-title">Notifications</h2>
                  {unreadCount > 0 && (
                    <span className="m-notif-panel-count">{unreadCount} unread</span>
                  )}
                </div>

                <div className="m-notif-panel-body">
                  {loadingNotifs ? (
                    <div className="m-notif-panel-loading" aria-busy="true">
                      <div className="m-notif-panel-spinner" aria-hidden="true" />
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className="m-notif-item unread"
                        onClick={() => handleNotifClick(n)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && handleNotifClick(n)}
                      >
                        <div className="m-notif-dot" aria-hidden="true" />
                        <div className="m-notif-content">
                          <p className="m-notif-title">{n.title}</p>
                          <p className="m-notif-msg">{n.message}</p>
                          <span className="m-notif-time">{formatTimeAgo(n.created_at)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="m-notif-panel-empty">
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '40px', opacity: 0.4 }}
                        aria-hidden="true"
                      >
                        notifications_off
                      </span>
                      <p>No new notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="m-topbar-dropdown-wrap" ref={userMenuRef}>
            <button
              className="m-topbar-user-btn"
              onClick={() => setShowUserMenu(prev => !prev)}
              aria-label="Open user menu"
              aria-expanded={showUserMenu}
              aria-haspopup="true"
            >
              <div className="m-avatar m-avatar-sm" aria-hidden="true">
                {user?.profilePicture
                  ? <img src={user.profilePicture} alt="" />
                  : initials}
              </div>
              <span className="m-topbar-user-name">{user?.firstName ?? 'Member'}</span>
              <span
                className={`material-symbols-outlined m-topbar-chevron`}
                style={{ fontSize: '16px' }}
                aria-hidden="true"
              >
                expand_more
              </span>
            </button>

            {showUserMenu && (
              <div className="m-topbar-user-panel" role="menu">
                {/* Header */}
                <div className="m-user-panel-header">
                  <div className="m-avatar m-avatar-md" aria-hidden="true">
                    {user?.profilePicture
                      ? <img src={user.profilePicture} alt="" />
                      : initials}
                  </div>
                  <div className="m-user-panel-info">
                    <p className="m-user-panel-name">{fullName}</p>
                    <p className="m-user-panel-email">{user?.email ?? ''}</p>
                  </div>
                </div>

                {/* Menu items */}
                <button
                  className="m-dropdown-item"
                  role="menuitem"
                  onClick={() => { navigate('/member'); setShowUserMenu(false); }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span>
                  My Profile
                </button>

                <button
                  className="m-dropdown-item"
                  role="menuitem"
                  onClick={() => { navigate('/member/settings'); setShowUserMenu(false); }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>settings</span>
                  Settings
                </button>

                <div className="m-dropdown-divider" aria-hidden="true" />

                <button
                  className="m-dropdown-item danger"
                  role="menuitem"
                  onClick={() => { logout(); navigate('/'); }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default MemberTopBar;

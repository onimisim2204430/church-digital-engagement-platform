/**
 * Member TopBar — Sanctuary Design
 * Full-width glassmorphic header.
 * Retains: notifications (WebSocket + REST), user menu.
 * SOVEREIGN: zero shared imports from admin or public.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNotificationWebSocket } from '../../hooks/useNotificationWebSocket';
import notificationService, { Notification } from '../../services/notification.service';
import MemberIcon from '../components/MemberIcon';
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
  const diff  = Date.now() - new Date(dateString).getTime();
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
  const navigate         = useNavigate();
  const { user, logout } = useAuth();
  const toast            = useToast();

  const [showUserMenu,      setShowUserMenu]       = useState(false);
  const [showNotifications, setShowNotifications]  = useState(false);
  const [notifications,     setNotifications]      = useState<Notification[]>([]);
  const [unreadCount,       setUnreadCount]        = useState(0);
  const [loadingNotifs,     setLoadingNotifs]      = useState(false);
  const [avatarLoadFailed,  setAvatarLoadFailed]   = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef    = useRef<HTMLDivElement>(null);
  const avatarUrl   = user?.profilePicture;

  /* ── Theme (locked to light in member) ──────────────────── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('member-theme', 'light');
  }, []);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUrl]);

  /* ── Notifications ──────────────────────────────────────── */
  const fetchNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const r = await notificationService.getUnreadNotifications(1, 10);
      setNotifications(r.results      ?? []);
      setUnreadCount  (r.unread_count ?? 0);
    } catch { /* silent */ } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) fetchNotifications();
  }, [user?.id, fetchNotifications]);

  /* 60 s fallback poll */
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

  /* WebSocket push */
  const onWsNotification = useCallback((n: Notification) => {
    const t = n.notification_type ?? '';
    if      (t.includes('PAYMENT_SUCCESS')) toast.success(n.title, 5000);
    else if (t.includes('PAYMENT_FAILED'))  toast.error(n.title, 5000);
    else                                    toast.info(n.title, 5000);
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

  /* ── Click outside ──────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── User ────────────────────────────────────────────────── */
  const initials = (() => {
    const f = user?.firstName?.charAt(0) ?? '';
    const l = user?.lastName?.charAt(0)  ?? '';
    return (f + l).toUpperCase() || 'M';
  })();

  const fullName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email?.split('@')[0] ?? 'Member';

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <header className="m-topbar" role="banner">
      <div className="m-topbar-inner">

        {/* ── Left ───────────────────────────────────────── */}
        <div className="m-topbar-left">
          {/* Hamburger — mobile only */}
          <button
            className="m-topbar-menu-btn"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <MemberIcon name="menu" size={22} />
          </button>

          {/* Mobile wordmark (hidden on desktop — sidebar shows it) */}
          <span className="m-topbar-wordmark">Serene</span>

          {/* Title / breadcrumb slot */}
          <div className="m-topbar-title-section">
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav className="m-topbar-breadcrumbs" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span className="m-topbar-crumb-sep" aria-hidden="true">/</span>
                    )}
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

        {/* ── Right ──────────────────────────────────────── */}
        <div className="m-topbar-right">
          {actions && <div className="m-topbar-actions">{actions}</div>}

          {/* Notifications */}
          <div className="m-topbar-dropdown-wrap" ref={notifRef}>
            <button
              className="m-topbar-icon-btn"
              onClick={handleNotifToggle}
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              aria-expanded={showNotifications}
              aria-haspopup="true"
            >
              <MemberIcon name="notifications" size={20} />
              {unreadCount > 0 && (
                <span className={`m-topbar-notif-badge${unreadCount > 0 ? ' pulse' : ''}`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                className="m-topbar-notif-panel"
                role="dialog"
                aria-label="Notifications"
              >
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
                          <span className="m-notif-time">
                            {formatTimeAgo(n.created_at)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="m-notif-panel-empty">
                      <MemberIcon
                        name="notificationsOff"
                        size={40}
                        color="#767683"
                      />
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
                {avatarUrl && !avatarLoadFailed ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  initials
                )}
              </div>
              <span className="m-topbar-user-name">
                {user?.firstName ?? 'Member'}
              </span>
              <MemberIcon
                name="chevronDown"
                size={16}
                className="m-topbar-chevron"
              />
            </button>

            {showUserMenu && (
              <div className="m-topbar-user-panel" role="menu">
                {/* Header */}
                <div className="m-user-panel-header">
                  <div className="m-avatar m-avatar-md" aria-hidden="true">
                    {avatarUrl && !avatarLoadFailed ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        onError={() => setAvatarLoadFailed(true)}
                      />
                    ) : (
                      initials
                    )}
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
                  <MemberIcon name="user" size={16} />
                  My Profile
                </button>

                <button
                  className="m-dropdown-item"
                  role="menuitem"
                  onClick={() => { navigate('/member/settings'); setShowUserMenu(false); }}
                >
                  <MemberIcon name="settings" size={16} />
                  Settings
                </button>

                <div className="m-dropdown-divider" aria-hidden="true" />

                <button
                  className="m-dropdown-item danger"
                  role="menuitem"
                  onClick={() => { logout(); navigate('/'); }}
                >
                  <MemberIcon name="logout" size={16} />
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
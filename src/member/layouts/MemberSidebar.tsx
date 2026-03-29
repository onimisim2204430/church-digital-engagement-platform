/**
 * Member Sidebar — Sanctuary Design
 * 320px fixed desktop · Drawer mobile
 * Retains: auth context, role-based admin link, context switcher, profile.
 * SOVEREIGN: zero shared imports from admin or public.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  HandCoins,
  HandHeart,
  LayoutDashboard,
  MessageSquareText,
  PlayCircle,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '../../types/auth.types';
import MemberIcon from '../components/MemberIcon';
import './MemberSidebar.css';

/* ── Nav items ─────────────────────────────────────────────── */
interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview',  label: 'Dashboard',           icon: LayoutDashboard },
  { id: 'sermons',   label: 'Sermons & Teachings', icon: PlayCircle },
  { id: 'events',    label: 'Events & Activities', icon: CalendarDays },
  { id: 'community', label: 'Community',           icon: Users },
  { id: 'prayer',    label: 'Prayer Requests',     icon: HandHeart },
  { id: 'giving',    label: 'Giving History',      icon: HandCoins },
  { id: 'chat',      label: 'Chat',                icon: MessageSquareText },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { id: 'settings', label: 'Account Settings', icon: Settings },
];

interface SidebarProps {
  activeView: string;
  isOpen: boolean;
  onClose: () => void;
}

/* ── Component ─────────────────────────────────────────────── */
const MemberSidebar: React.FC<SidebarProps> = ({
  activeView,
  isOpen,
  onClose,
}) => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const sidebarRef       = useRef<HTMLElement>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const avatarUrl = user?.profilePicture;

  const navigateTo = (view: string) => {
    const path = view === 'overview' ? '/member' : `/member/${view}`;
    navigate(path);
    onClose();
  };

  const canAccessAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR;

  /* Derived user display values */
  const initials = (() => {
    const f = user?.firstName?.charAt(0) ?? '';
    const l = user?.lastName?.charAt(0)  ?? '';
    return (f + l).toUpperCase() || 'M';
  })();

  const fullName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email?.split('@')[0] ?? 'Beloved Member';

  const greeting =
    user?.firstName
      ? `Grace and Peace, ${user.firstName}`
      : 'Grace and Peace be with you';

  /* Close on Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  /* Reset avatar error state when URL changes */
  useEffect(() => { setAvatarLoadFailed(false); }, [avatarUrl]);

  /* Focus trap — focus sidebar when opened on mobile */
  useEffect(() => {
    if (isOpen && sidebarRef.current) sidebarRef.current.focus();
  }, [isOpen]);

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="m-sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        ref={sidebarRef}
        className={`m-sidebar${isOpen ? ' m-sidebar--open' : ''}`}
        aria-label="Member navigation"
        tabIndex={-1}
      >
        {/* ── Header: Wordmark + User ───────────────────── */}
        <div className="m-sidebar-header">
          {/* Wordmark row */}
          <div className="m-sidebar-brand-row">
            <span className="m-sidebar-wordmark">Serene</span>
            {/* Mobile close button */}
            <button
              className="m-sidebar-close"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <MemberIcon name="close" size={18} />
            </button>
          </div>

          {/* User section */}
          <div className="m-sidebar-user">
            <div className="m-sidebar-avatar" aria-hidden="true">
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
            <div className="m-sidebar-user-info">
              <p className="m-sidebar-user-name">{fullName}</p>
              <p className="m-sidebar-user-greeting">{greeting}</p>
            </div>
          </div>
        </div>

        <div className="m-sidebar-divider" />

        {/* ── Navigation ───────────────────────────────── */}
        <nav className="m-sidebar-nav" aria-label="Main navigation">
          {/* Main nav */}
          <div className="m-nav-section">
            <span className="m-nav-section-label">Navigation</span>

            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`m-nav-item${activeView === item.id ? ' m-nav-item--active' : ''}`}
                onClick={() => navigateTo(item.id)}
                aria-current={activeView === item.id ? 'page' : undefined}
              >
                <item.icon
                  size={19}
                  strokeWidth={1.9}
                  className="m-nav-icon"
                  aria-hidden="true"
                />
                <span className="m-nav-label">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="m-nav-badge" aria-label={`${item.badge} unread`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Account nav */}
          <div className="m-nav-section">
            <span className="m-nav-section-label">Account</span>

            {ACCOUNT_ITEMS.map(item => (
              <button
                key={item.id}
                className={`m-nav-item${activeView === item.id ? ' m-nav-item--active' : ''}`}
                onClick={() => navigateTo(item.id)}
                aria-current={activeView === item.id ? 'page' : undefined}
              >
                <item.icon
                  size={19}
                  strokeWidth={1.9}
                  className="m-nav-icon"
                  aria-hidden="true"
                />
                <span className="m-nav-label">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* ── Footer ───────────────────────────────────── */}
        <div className="m-sidebar-footer">
          {/* Context switcher */}
          <div className="m-sidebar-context-switcher">
            <button
              className="m-context-btn"
              onClick={() => navigate('/')}
              title="Visit public site"
            >
              <MemberIcon name="public" size={15} />
              <span className="m-context-label">Public Site</span>
            </button>

            {canAccessAdmin && (
              <button
                className="m-context-btn"
                onClick={() => navigate('/admin')}
                title="Go to admin area"
              >
                <MemberIcon name="admin" size={15} />
                <span className="m-context-label">Admin Area</span>
              </button>
            )}
          </div>

          {/* Sign out */}
          <button
            className="m-sidebar-signout"
            onClick={() => { logout(); navigate('/'); }}
            aria-label="Sign out"
          >
            <MemberIcon name="logout" size={16} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default MemberSidebar;
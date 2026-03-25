/**
 * Member Sidebar — Sovereign Navigation Component
 * SOVEREIGN: zero shared classes or imports from admin or public.
 *
 * Desktop: 256px expanded, collapses to 64px icon-only at 1024px.
 * Mobile: hidden, replaced by MemberBottomTabBar.
 */

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '../../types/auth.types';
import MemberIcon, { type MemberIconName } from '../components/MemberIcon';
import './MemberSidebar.css';

/* ── Nav items ─────────────────────────────────────────────── */
interface NavItem {
  id: string;
  label: string;
  iconName: MemberIconName;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview',   label: 'Dashboard',             iconName: 'dashboard' },
  { id: 'sermons',    label: 'Sermons & Teachings',   iconName: 'sermons' },
  { id: 'events',     label: 'Events & Activities',   iconName: 'events' },
  { id: 'community',  label: 'Community',             iconName: 'community' },
  { id: 'prayer',     label: 'Prayer Requests',       iconName: 'prayer' },
  { id: 'giving',     label: 'Giving History',        iconName: 'giving' },
  { id: 'chat',       label: 'Chat',                  iconName: 'chat' },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { id: 'settings', label: 'Settings', iconName: 'settings' },
];

interface SidebarProps {
  activeView: string;
  isOpen: boolean;
  onClose: () => void;
}

/* ── Sidebar component ─────────────────────────────────────── */
const MemberSidebar: React.FC<SidebarProps> = ({ activeView, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLElement>(null);

  const navigate_to = (view: string) => {
    const path = view === 'overview' ? '/member' : `/member/${view}`;
    navigate(path);
    onClose();
  };

  const canAccessAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR;

  const initials = (() => {
    const f = user?.firstName?.charAt(0) ?? '';
    const l = user?.lastName?.charAt(0) ?? '';
    return (f + l).toUpperCase() || 'M';
  })();

  const fullName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email?.split('@')[0] ?? 'Member';

  /* Close sidebar on Escape */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  /* Trap focus when open on mobile */
  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      sidebarRef.current.focus();
    }
  }, [isOpen]);

  return (
    <>
      {/* Mobile overlay */}
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
        {/* Brand */}
        <div className="m-sidebar-brand">
          <div className="m-sidebar-logo" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L3 7L12 12L21 7L12 2Z" fill="currentColor" opacity="0.9" />
              <path d="M12 22L3 17V7L12 12V22Z" fill="currentColor" />
              <path d="M12 22L21 17V7L12 12V22Z" fill="currentColor" opacity="0.65" />
            </svg>
          </div>
          <div className="m-sidebar-brand-text">
            <div className="m-sidebar-brand-name">Member Portal</div>
            <div className="m-sidebar-brand-sub">Church Community</div>
          </div>
          {/* Mobile close */}
          <button
            className="m-sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <MemberIcon name="close" size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="m-sidebar-nav" aria-label="Main navigation">
          <div className="m-nav-section">
            <span className="m-nav-section-label">Navigation</span>

            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`m-nav-item${activeView === item.id ? ' m-nav-item--active' : ''}`}
                onClick={() => navigate_to(item.id)}
                aria-current={activeView === item.id ? 'page' : undefined}
              >
                <MemberIcon name={item.iconName} size={20} className="m-nav-icon" />
                <span className="m-nav-label">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="m-nav-badge" aria-label={`${item.badge} unread`}>
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="m-nav-section">
            <span className="m-nav-section-label">Account</span>

            {ACCOUNT_ITEMS.map(item => (
              <button
                key={item.id}
                className={`m-nav-item${activeView === item.id ? ' m-nav-item--active' : ''}`}
                onClick={() => navigate_to(item.id)}
                aria-current={activeView === item.id ? 'page' : undefined}
              >
                <MemberIcon name={item.iconName} size={20} className="m-nav-icon" />
                <span className="m-nav-label">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Footer — profile + context switcher */}
        <div className="m-sidebar-footer">
          {/* Context switcher */}
          <div className="m-sidebar-context-switcher">
            <button
              className="m-context-btn"
              onClick={() => navigate('/')}
              title="Visit public site"
            >
              <MemberIcon name="public" size={16} />
              <span className="m-context-label">Public Site</span>
            </button>

            {canAccessAdmin && (
              <button
                className="m-context-btn"
                onClick={() => navigate('/admin')}
                title="Go to admin area"
              >
                <MemberIcon name="admin" size={16} />
                <span className="m-context-label">Admin Area</span>
              </button>
            )}
          </div>

          {/* Profile pill */}
          <div className="m-sidebar-profile">
            <div className="m-avatar m-avatar-sm" aria-hidden="true">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="" />
              ) : (
                initials
              )}
            </div>
            <div className="m-sidebar-profile-info">
              <div className="m-sidebar-profile-name m-truncate">{fullName}</div>
              <div className="m-sidebar-profile-email m-truncate">{user?.email ?? ''}</div>
            </div>
            <button
              className="m-sidebar-logout"
              onClick={() => { logout(); navigate('/'); }}
              title="Sign out"
              aria-label="Sign out"
            >
              <MemberIcon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default MemberSidebar;

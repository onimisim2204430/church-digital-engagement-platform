/**
 * Admin Sidebar - Enterprise Command Center
 * Grouped navigation with Material Symbols
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '../../types/auth.types';
import Icon from '../../components/common/Icon';
import './Sidebar.css';

interface SidebarProps {
  activeView: string;
  isOpen: boolean;
  onClose: () => void;
}

interface NavGroup {
  label: string;
  items: {
    id: string;
    label: string;
    icon: string;
    path: string;
    roles: UserRole[];
  }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'overview', label: 'Dashboard', icon: 'dashboard', path: '/admin', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    ],
  },
  {
    label: 'Content Pipeline',
    items: [
      { id: 'content', label: 'Posts & Sermons', icon: 'movie', path: '/admin/content', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
      { id: 'daily-words', label: 'Daily Words', icon: 'light_mode', path: '/admin/daily-words', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
      { id: 'series', label: 'Series', icon: 'library_books', path: '/admin/series', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
      { id: 'drafts', label: 'Post Drafts', icon: 'edit_note', path: '/admin/drafts', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
      { id: 'weekly-flow', label: 'Weekly Flow', icon: 'schedule', path: '/admin/weekly-flow', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
      { id: 'podcasting', label: 'Podcasting', icon: 'podcasts', path: '/admin/podcasting', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    ],
  },
  {
    label: 'Community',
    items: [
      { id: 'users', label: 'Member Directory', icon: 'groups', path: '/admin/users', roles: [UserRole.ADMIN] },
      { id: 'moderation', label: 'Moderation', icon: 'forum', path: '/admin/moderation', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
      { id: 'small-groups', label: 'Small Groups', icon: 'groups_2', path: '/admin/small-groups', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
      { id: 'prayer-wall', label: 'Prayer Wall', icon: 'volunteer_activism', path: '/admin/prayer-wall', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    ],
  },
  {
    label: 'Ministry',
    items: [
      { id: 'events', label: 'Events Calendar', icon: 'event', path: '/admin/events', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
      { id: 'volunteers', label: 'Volunteers', icon: 'manage_accounts', path: '/admin/volunteers', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    ],
  },
  {
    label: 'Growth & Data',
    items: [
      { id: 'email', label: 'Email Campaigns', icon: 'campaign', path: '/admin/email', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
      { id: 'reports', label: 'Reports', icon: 'bar_chart', path: '/admin/reports', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
      { id: 'settings', label: 'Settings', icon: 'settings', path: '/admin/settings', roles: [UserRole.ADMIN] },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getUserInitials = () => {
    const first = user?.firstName?.charAt(0) || '';
    const last = user?.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  const isActive = (path: string, id: string) => {
    if (id === 'overview') return location.pathname === '/admin' || location.pathname === '/admin/';
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <nav
        className={`admin-sidebar-pro ${isOpen ? 'open' : ''} w-64 flex flex-col border-r-1 border-r-primary bg-white overflow-y-auto`}
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5" style={{ scrollbarWidth: 'none' }}>
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) =>
              item.roles.includes(user?.role as UserRole)
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="space-y-0.5">
                {group.label !== 'Overview' && (
                  <p className="px-3 font-bold text-slate-soft uppercase tracking-widest mb-1.5">
                    {group.label}
                  </p>
                )}
                {visibleItems.map((item) => {
                  const active = isActive(item.path, item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.path)}
                      className={`flex items-center gap-3 w-full rounded px-3 py-2 font-medium transition-all text-left ${
                        active
                          ? 'bg-primary text-white font-semibold'
                          : 'text-slate-soft hover:bg-slate-50 hover:text-primary'
                      }`}
                    >
                      <Icon name={item.icon} size={18} className={active ? 'text-white' : ''} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-border-light p-3 space-y-2 bg-slate-50/50 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex-1 flex items-center justify-center gap-1.5 rounded border border-border-light bg-white px-2 py-1.5 font-semibold text-slate-soft hover:border-primary hover:text-primary transition-colors"
            >
              <Icon name="public" size={16} />
              <span>Public</span>
            </button>
            <button
              onClick={() => navigate('/member')}
              className="flex-1 flex items-center justify-center gap-1.5 rounded border border-border-light bg-white px-2 py-1.5 text-xs font-semibold text-slate-soft hover:border-primary hover:text-primary transition-colors"
            >
              <Icon name="home" size={16} />
              <span>Member</span>
            </button>
          </div>

          <div className="flex items-center gap-2 px-1 pt-1">
            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
              {getUserInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-deep truncate">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-slate-soft uppercase font-semibold">{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded p-1.5 text-slate-soft hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Sign out"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;

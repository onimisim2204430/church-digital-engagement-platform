/**
 * Sidebar.tsx — zero external CSS, matches FinancialDashboard font/color system
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '../../types/auth.types';
import Icon from '../../components/common/Icon';

interface SidebarProps {
  activeView: string;
  isOpen:     boolean;
  onClose:    () => void;
}

const navGroups = [
  {
    label: 'Overview',
    items: [
      { id: 'overview', label: 'Dashboard', icon: 'dashboard', path: '/admin', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    ],
  },
  {
    label: 'Dashboards',
    items: [
      { id: 'content-dashboard',   label: 'Content Pipeline', icon: 'movie',           path: '/admin/content-dashboard',   roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'content.*'        },
      { id: 'community-dashboard', label: 'Community',        icon: 'groups',          path: '/admin/community-dashboard', roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'community.*'      },
      { id: 'ministry-dashboard',  label: 'Ministry',         icon: 'church',          path: '/admin/ministry-dashboard',  roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'schedule.*'       },
      // { id: 'financial-dashboard', label: 'Financial',        icon: 'account_balance', path: '/admin/financial-dashboard', roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'fin.*'             },
      { id: 'growth-dashboard',    label: 'Growth & Data',    icon: 'trending_up',     path: '/admin/growth-dashboard',    roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'outreach.*'       },
    ],
  },
  {
    label: 'Content Pipeline',
    items: [
      { id: 'content',     label: 'Posts & Sermons', icon: 'movie',         path: '/admin/content',     roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'content.posts'        },
      { id: 'homepage-content', label: 'Homepage Content', icon: 'widgets', path: '/admin/homepage-content', roles: [UserRole.ADMIN] },
      { id: 'privacy-policy', label: 'Privacy Policy', icon: 'policy', path: '/admin/privacy-policy', roles: [UserRole.ADMIN] },
      { id: 'series',      label: 'Series',          icon: 'library_books', path: '/admin/series',      roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'content.series'       },
      // { id: 'drafts',      label: 'Post Drafts',     icon: 'edit_note',     path: '/admin/drafts',      roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'content.drafts'       },
      { id: 'weekly-flow', label: 'Weekly Flow',     icon: 'schedule',      path: '/admin/weekly-flow', roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'schedule.weekly_flow' },
      { id: 'podcasting',  label: 'Podcasting',      icon: 'podcasts',      path: '/admin/podcasting',  roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'schedule.podcasting'  },
    ],
  },
  {
    label: 'Community',
    items: [
      { id: 'users',        label: 'User Mgmt',    icon: 'groups',             path: '/admin/users',        roles: [UserRole.ADMIN] },
      { id: 'moderation',   label: 'Moderation',   icon: 'forum',              path: '/admin/moderation',   roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'community.moderation' },
      { id: 'small-groups', label: 'Small Groups', icon: 'groups_2',           path: '/admin/small-groups', roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'community.groups'     },
      { id: 'prayer-wall',  label: 'Prayer Wall',  icon: 'volunteer_activism', path: '/admin/prayer-wall',  roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'community.prayer'     },
      { id: 'contact-inbox', label: 'Contact Inbox', icon: 'mail', path: '/admin/contact-inbox', roles: [UserRole.ADMIN, UserRole.MODERATOR] },
    ],
  },
  {
    label: 'Ministry',
    items: [
      { id: 'events',     label: 'Events Calendar', icon: 'event',              path: '/admin/events',     roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'schedule.events'      },
      { id: 'seed',       label: 'Seed Manager',    icon: 'volunteer_activism', path: '/admin/seed',       roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'fin.seed'             },
      { id: 'volunteers', label: 'Volunteers',      icon: 'manage_accounts',    path: '/admin/volunteers', roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'community.volunteers' },
    ],
  },
  {
    label: 'Financial',
    items: [
      { id: 'financial-hub',     label: 'Financial Hub',     icon: 'analytics', path: '/admin/financial-hub',     roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'fin.hub'      },
      { id: 'payments',          label: 'Payment Records',   icon: 'payments',   path: '/admin/payments',          roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'fin.payments' },
      // { id: 'financial-reports', label: 'Financial Reports', icon: 'bar_chart',  path: '/admin/financial-reports', roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'fin.reports'  },
    ],
  },
  {
    label: 'Growth & Data',
    items: [
      { id: 'email',    label: 'Email Campaigns', icon: 'campaign',  path: '/admin/email',    roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'outreach.email'    },
      { id: 'reports',  label: 'Reports',         icon: 'bar_chart', path: '/admin/reports',  roles: [UserRole.ADMIN, UserRole.MODERATOR], permCode: 'analytics.reports' },
      { id: 'settings', label: 'Settings',        icon: 'settings',  path: '/admin/settings', roles: [UserRole.ADMIN] },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout, hasPermission } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const handleLogout = async () => { await logout(); navigate('/'); };
  const initials = () => {
    const f = user?.firstName?.charAt(0) || '';
    const l = user?.lastName?.charAt(0)  || '';
    return (f + l).toUpperCase() || 'U';
  };

  // Helper: Check permission (supports wildcard patterns like 'fin.*')
  const checkPermission = (permCode: string): boolean => {
    if (permCode.endsWith('.*')) {
      // Wildcard pattern - check if user has ANY permission in that category
      const categoryMap: Record<string, string[]> = {
        'fin.*': ['fin.payments', 'fin.reports', 'fin.seed'],
        'content.*': ['content.posts', 'content.series', 'content.drafts', 'content.daily_word'],
        'schedule.*': ['schedule.weekly_flow', 'schedule.events', 'schedule.podcasting'],
        'community.*': ['community.moderation', 'community.groups', 'community.prayer', 'community.volunteers'],
        'outreach.*': ['outreach.email', 'analytics.reports'],
      };
      return categoryMap[permCode]?.some(p => hasPermission(p)) ?? false;
    }
    // Exact permission match
    return hasPermission(permCode);
  };

  const isActive = (path: string, id: string) =>
    id === 'overview'
      ? location.pathname === '/admin' || location.pathname === '/admin/'
      : location.pathname === path || location.pathname.startsWith(path + '/');

  const go = (path: string) => { navigate(path); onClose(); };

  const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono',monospace" };

  return (
    <nav
      className="flex flex-col h-full w-64 no-scrollbar"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)', overflow: 'hidden' }}
    >
      {/* ── Nav ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto admin-scroll no-scrollbar" style={{ padding: '10px 10px 0' }}>
        {navGroups.map(group => {
          const visible = group.items.filter(item => {
            if (!item.roles.includes(user?.role as UserRole)) return false;
            if (user?.role === UserRole.ADMIN) return true;
            if ((item as any).permCode) return checkPermission((item as any).permCode);
            return true;
          });
          if (!visible.length) return null;

          return (
            <div key={group.label} style={{ marginBottom: 16 }}>
              {group.label !== 'Overview' && (
                <p className="sidebar-group-label" style={{ margin: '0 -10px 6px', borderRadius: 0 }}>
                  {group.label}
                </p>
              )}
              {visible.map(item => {
                const active = isActive(item.path, item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => go(item.path)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      width: '100%', padding: '8px 10px',
                      borderRadius: 8, border: '1px solid transparent',
                      background: active ? 'var(--sidebar-active)' : 'none',
                      boxShadow: active ? 'inset 3px 0 0 var(--em)' : 'none',
                      color: active ? 'var(--em)' : 'var(--sidebar-text)',
                      cursor: 'pointer', textAlign: 'left', marginBottom: 1,
                      ...mono,
                      fontSize: 12.5, fontWeight: active ? 600 : 500,
                      transition: 'background .12s ease, color .12s ease, box-shadow .12s ease',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text-active)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = 'none';
                        (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)';
                      }
                    }}
                  >
                    <Icon
                      name={item.icon}
                      size={16}
                      style={{ color: active ? 'var(--em)' : 'var(--text-tertiary)', flexShrink: 0 } as any}
                    />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                    {active && (
                      <span className="pulse-dot" style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: 'var(--em)', flexShrink: 0,
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div style={{ padding: '10px', borderTop: '1px solid var(--sidebar-border)', flexShrink: 0 }}>

        {/* Context switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
          {[
            { label: 'Public',  icon: 'public', path: '/',       newTab: true },
            { label: 'Member',  icon: 'home',   path: '/member', newTab: false },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={() => btn.newTab ? window.open(btn.path, '_blank') : navigate(btn.path)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '6px 0', borderRadius: 7, cursor: 'pointer',
                border: '1px solid var(--sidebar-border)',
                background: 'none', color: 'var(--sidebar-text)',
                ...mono, fontSize: 11.5, fontWeight: 600,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--em)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--em-border)';
                (e.currentTarget as HTMLElement).style.background = 'var(--emd)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--sidebar-border)';
                (e.currentTarget as HTMLElement).style.background = 'none';
              }}
            >
              <Icon name={btn.icon} size={13} />
              {btn.label}
            </button>
          ))}
        </div>

        {/* User row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 8,
          background: 'var(--sidebar-hover)',
          border: '1px solid var(--sidebar-border)',
        }}>
          {/* Avatar */}
          <div style={{
            width: 30, height: 30, borderRadius: 7, flexShrink: 0, overflow: 'hidden',
            border: '1px solid var(--em-border)', background: 'var(--emd)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--em)', fontSize: 11, fontWeight: 700,
          }}>
            {user?.profilePicture
              ? <img src={user.profilePicture} alt="Profile" className="admin-avatar-img" />
              : initials()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 700,
              color: 'var(--sidebar-text-active)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
            }}>
              {user?.firstName} {user?.lastName}
            </p>
            <p style={{ ...mono, fontSize: 9.5, color: 'var(--sidebar-text)',
                        textTransform: 'uppercase', letterSpacing: '.07em', margin: '1px 0 0' }}>
              {user?.role}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out"
            className="tb-btn"
            style={{ width: 28, height: 28, flexShrink: 0 }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#ef4444';
              (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)';
              (e.currentTarget as HTMLElement).style.background = 'none';
            }}
          >
            <Icon name="logout" size={15} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
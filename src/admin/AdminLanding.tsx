import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '../types/auth.types';
import Icon from '../components/common/Icon';

interface ModuleCard {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  path: string;
  permCode?: string;
  available: boolean;
}

const AdminLanding: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Helper: Check if user has ANY permission in a category (for dashboards)
  const hasCategoryPermission = (category: string): boolean => {
    const categoryMap: Record<string, string[]> = {
      'finance': ['fin.payments', 'fin.reports', 'fin.seed'],
      'content': ['content.posts', 'content.series', 'content.drafts', 'content.daily_word'],
      'scheduling': ['schedule.weekly_flow', 'schedule.events', 'schedule.podcasting'],
      'community': ['community.moderation', 'community.groups', 'community.prayer', 'community.volunteers'],
      'outreach': ['outreach.email', 'analytics.reports'],
    };
    const perms = categoryMap[category] || [];
    return perms.some(perm => hasPermission(perm));
  };

  // Define all available module cards
  const allModules: ModuleCard[] = useMemo(() => [
    {
      id: 'content',
      label: 'Content Pipeline',
      description: 'Manage posts, sermons, series, and scheduled content',
      icon: 'movie',
      color: '#6366f1',
      path: '/admin/content-dashboard',
      permCode: 'content.*',
      available: user?.role === UserRole.ADMIN || (user?.role === UserRole.MODERATOR && hasCategoryPermission('content')),
    },
    {
      id: 'community',
      label: 'Community',
      description: 'Moderate interactions, comments, and community engagement',
      icon: 'groups',
      color: '#ec4899',
      path: '/admin/community-dashboard',
      permCode: 'community.*',
      available: user?.role === UserRole.ADMIN || (user?.role === UserRole.MODERATOR && hasCategoryPermission('community')),
    },
    {
      id: 'ministry',
      label: 'Ministry',
      description: 'Oversee events, volunteers, campaigns, and schedules',
      icon: 'church',
      color: '#f59e0b',
      path: '/admin/ministry-dashboard',
      permCode: 'schedule.*',
      available: user?.role === UserRole.ADMIN || (user?.role === UserRole.MODERATOR && hasCategoryPermission('scheduling')),
    },
    /* {
      id: 'financial',
      label: 'Financial',
      description: 'Track payments, seed campaigns, and giving analytics',
      icon: 'account_balance',
      color: '#10b981',
      path: '/admin/financial-dashboard',
      permCode: 'fin.*',
      available: user?.role === UserRole.ADMIN || (user?.role === UserRole.MODERATOR && hasCategoryPermission('finance')),
    }, */
    {
      id: 'growth',
      label: 'Growth & Data',
      description: 'Email campaigns, analytics reports, and engagement metrics',
      icon: 'trending_up',
      color: '#3b82f6',
      path: '/admin/growth-dashboard',
      permCode: 'outreach.*',
      available: user?.role === UserRole.ADMIN || (user?.role === UserRole.MODERATOR && hasCategoryPermission('outreach')),
    },
  ], [user?.role, hasPermission]);

  // Filter to only available modules
  const availableModules = useMemo(() => allModules.filter(m => m.available), [allModules]);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const getRoleDisplayName = () => {
    if (user?.role === UserRole.ADMIN) return 'Administrator';
    if (user?.role === UserRole.MODERATOR) return 'Moderator';
    return 'Staff';
  };

  const noAccessMessage = availableModules.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Welcome, {user?.firstName}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              {user?.role === UserRole.ADMIN 
                ? 'Full platform administration access'
                : 'Your assigned management areas'}
            </p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Role
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
              {getRoleDisplayName()}
            </p>
          </div>
        </div>

        {/* Info Box for MODERATORs */}
        {user?.role === UserRole.MODERATOR && !noAccessMessage && (
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
            <div className="flex gap-3">
              <Icon name="info" size={18} style={{ color: '#0ea5e9', flexShrink: 0 } as any} />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  Your Permissions
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                  You have access to {availableModules.length} management area{availableModules.length !== 1 ? 's' : ''}. 
                  Click any module below to get started, or use the sidebar to navigate.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No Access Message */}
        {noAccessMessage && (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
            <div className="flex gap-3">
              <Icon name="warning" size={18} style={{ color: '#f59e0b', flexShrink: 0 } as any} />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  No Module Access
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                  You have not been assigned access to any management modules. 
                  Contact an administrator to request the required permissions.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Available Modules Grid */}
      {!noAccessMessage && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Your Management Areas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {availableModules.map((module) => (
              <button
                key={module.id}
                onClick={() => handleNavigate(module.path)}
                className="group text-left transition-all hover:shadow-lg p-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <div className="flex items-start gap-4 mb-3">
                  <div
                    className="p-3 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: `${module.color}15` }}
                  >
                    <Icon 
                      name={module.icon} 
                      size={24} 
                      style={{ color: module.color } as any}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {module.label}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                      {module.permCode}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {module.description}
                </p>
                <div className="mt-3 flex items-center gap-2 text-sm font-medium" style={{ color: module.color }}>
                  <span>Access Dashboard</span>
                  <Icon name="arrow_forward" size={16} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Admin-Only: Quick Stats */}
      {user?.role === UserRole.ADMIN && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            System Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Dashboards</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">5</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">All systems operational</p>
            </div>
            <div className="p-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Admin User</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">Unlimited</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Full platform access</p>
            </div>
            <div className="p-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Quick Action</p>
              <button 
                onClick={() => navigate('/admin/users')}
                className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2 hover:underline"
              >
                Manage Users →
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Assign roles & permissions</p>
            </div>
          </div>
        </div>
      )}

      {/* Permission Reference (Developer/Admin Info) */}
      {user?.role === UserRole.ADMIN && (
        <div className="mt-12 p-6 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Permission Codes Reference</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allModules.map((module) => (
              <div key={module.id} className="flex items-start gap-3 p-3 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <code className="text-xs font-bold text-purple-600 dark:text-purple-400 flex-shrink-0">
                  {module.permCode}
                </code>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {module.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLanding;

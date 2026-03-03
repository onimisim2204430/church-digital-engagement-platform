// AdminSettings.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/common/Icon';
import './styles/AdminSettings.css';

// ============================================================================
// Types & Constants
// ============================================================================

type SettingsTab = 
  | 'overview'
  | 'content-types'
  | 'users'
  | 'roles'
  | 'security'
  | 'features'
  | 'integrations'
  | 'backup'
  | 'audit'
  | 'email'
  | 'api'
  | 'appearance'
  | 'moderation'
  | 'notifications';

interface SettingsNavItem {
  id: SettingsTab;
  label: string;
  icon: string;
  badge?: string | number;
}

interface FeatureToggle {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  hasConfig?: boolean;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  status: 'connected' | 'disconnected';
  configurable: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: number;
  users: number;
  isSystem?: boolean;
}

interface AuditLog {
  id: string;
  user: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'SUSPEND' | 'LOGIN';
  description: string;
  ip: string;
  timestamp: string;
}

interface ContentType {
  id: string;
  name: string;
  slug: string;
  description: string;
  isSystem: boolean;
  isEnabled: boolean;
  postsCount: number;
  sortOrder: number;
}

// ============================================================================
// Navigation Items
// ============================================================================

const NAV_ITEMS: SettingsNavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'content-types', label: 'Content Types', icon: 'file_copy', badge: 8 },
  { id: 'users', label: 'User Management', icon: 'people' },
  { id: 'roles', label: 'Roles & Permissions', icon: 'security' },
  { id: 'security', label: 'Security', icon: 'lock' },
  { id: 'features', label: 'Feature Toggles', icon: 'toggle_on' },
  { id: 'integrations', label: 'Integrations', icon: 'link', badge: 3 },
  { id: 'backup', label: 'Backup & Export', icon: 'backup' },
  { id: 'audit', label: 'Audit Logs', icon: 'history' },
  { id: 'email', label: 'Email', icon: 'email' },
  { id: 'api', label: 'API & Keys', icon: 'api' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'moderation', label: 'Moderation', icon: 'gavel' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
];

// ============================================================================
// Mock Data
// ============================================================================

const FEATURE_TOGGLES: FeatureToggle[] = [
  { key: 'email_verification', name: 'Email Verification', description: 'Require users to verify their email address before accessing content.', enabled: true, category: 'Authentication' },
  { key: 'user_registration', name: 'User Registration', description: 'Allow new users to create accounts via the portal.', enabled: true, category: 'Authentication' },
  { key: 'social_login', name: 'Social Login', description: 'Allow sign in with Apple, Google, or Facebook.', enabled: false, category: 'Authentication', hasConfig: true },
  { key: 'two_factor', name: 'Two-Factor Authentication', description: 'Require 2FA for administrator accounts.', enabled: true, category: 'Security' },
  { key: 'comments', name: 'Comments', description: 'Enable discussions on sermons and articles.', enabled: true, category: 'Content' },
  { key: 'moderation_queue', name: 'Moderation Queue', description: 'Require manual approval for all new comments.', enabled: true, category: 'Content' },
  { key: 'offline_downloads', name: 'Offline Downloads', description: 'Allow mobile app users to download sermon audio.', enabled: false, category: 'Mobile' },
  { key: 'auto_publish', name: 'Auto-Publish', description: 'Automatically publish scheduled content.', enabled: true, category: 'Content' },
];

const INTEGRATIONS: Integration[] = [
  { id: 'analytics', name: 'Web Analytics', description: 'Track visitor behavior and engagement metrics.', icon: 'bar_chart', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', status: 'connected', configurable: true },
  { id: 'slack', name: 'Communication Hub', description: 'Receive notifications for member registrations and prayer requests.', icon: 'chat', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', status: 'connected', configurable: true },
  { id: 'mailchimp', name: 'Email Newsletter', description: 'Sync platform users with your newsletter subscriber lists.', icon: 'mail', iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600', status: 'connected', configurable: true },
  { id: 'zapier', name: 'Workflow Automation', description: 'Connect to over 3,000+ apps to automate tasks.', icon: 'bolt', iconBg: 'bg-orange-50', iconColor: 'text-orange-600', status: 'disconnected', configurable: true },
  { id: 'calendar', name: 'Google Calendar', description: 'Sync events with your church calendar.', icon: 'calendar_month', iconBg: 'bg-blue-50', iconColor: 'text-blue-600', status: 'disconnected', configurable: true },
  { id: 'donations', name: 'Stripe', description: 'Process donations and track giving history.', icon: 'payments', iconBg: 'bg-purple-50', iconColor: 'text-purple-600', status: 'disconnected', configurable: true },
];

const ROLES: Role[] = [
  { id: 'admin', name: 'Admin', description: 'Full system access', color: '#ef4444', permissions: 42, users: 3, isSystem: true },
  { id: 'moderator', name: 'Moderator', description: 'Content & user moderation', color: '#f59e0b', permissions: 28, users: 5, isSystem: true },
  { id: 'editor', name: 'Editor', description: 'Can edit content and schedule events', color: '#10b981', permissions: 18, users: 12, isSystem: true },
  { id: 'member', name: 'Member', description: 'Standard member access', color: '#3b82f6', permissions: 8, users: 128, isSystem: true },
  { id: 'visitor', name: 'Visitor', description: 'Limited public access', color: '#6b7280', permissions: 3, users: 0, isSystem: true },
];

const AUDIT_LOGS: AuditLog[] = [
  { id: '1', user: 'John Doe', action: 'UPDATE', description: 'Updated sermon content', ip: '192.168.1.1', timestamp: '2024-10-24T14:34:00' },
  { id: '2', user: 'Sarah Miller', action: 'CREATE', description: 'Created new user account', ip: '45.12.8.241', timestamp: '2024-10-24T13:15:00' },
  { id: '3', user: 'Admin', action: 'DELETE', description: 'Removed old log entries', ip: '8.8.8.8', timestamp: '2024-10-24T11:02:00' },
  { id: '4', user: 'Mark S.', action: 'PUBLISH', description: 'Published sermon series', ip: '102.11.22.4', timestamp: '2024-10-23T23:58:00' },
  { id: '5', user: 'Jane Cooper', action: 'LOGIN', description: 'Successful login', ip: '192.168.1.2', timestamp: '2024-10-23T22:30:00' },
];

const CONTENT_TYPES: ContentType[] = [
  { id: '1', name: 'Post', slug: 'post', description: 'General posts and announcements', isSystem: true, isEnabled: true, postsCount: 128, sortOrder: 10 },
  { id: '2', name: 'Sermon', slug: 'sermon', description: 'Sermon recordings and notes', isSystem: true, isEnabled: true, postsCount: 45, sortOrder: 20 },
  { id: '3', name: 'Event', slug: 'event', description: 'Church events and gatherings', isSystem: true, isEnabled: true, postsCount: 67, sortOrder: 30 },
  { id: '4', name: 'Devotion', slug: 'devotion', description: 'Daily devotionals', isSystem: false, isEnabled: true, postsCount: 89, sortOrder: 40 },
  { id: '5', name: 'Prayer', slug: 'prayer', description: 'Prayer requests', isSystem: false, isEnabled: false, postsCount: 23, sortOrder: 50 },
];

// ============================================================================
// Helper Components
// ============================================================================

const Toggle: React.FC<{ enabled: boolean; onChange: () => void; size?: 'sm' | 'md' }> = ({ enabled, onChange, size = 'md' }) => {
  const width = size === 'sm' ? 'w-9' : 'w-11';
  const height = size === 'sm' ? 'h-5' : 'h-6';
  const dotSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const translateX = size === 'sm' ? 'translate-x-4' : 'translate-x-5';

  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex ${width} ${height} items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 ${
        enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
      }`}
    >
      <span
        className={`inline-block ${dotSize} transform rounded-full bg-white shadow-sm transition-transform ${
          enabled ? translateX : 'translate-x-0.5'
        }`}
      />
    </button>
  );
};

const StatCard: React.FC<{ icon: string; label: string; value: string | number; change?: string; color: string }> = ({
  icon, label, value, change, color
}) => (
  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 ${color} bg-opacity-10 rounded-xl flex items-center justify-center`}>
        <Icon name={icon} size={24} className={color.replace('bg-', 'text-')} />
      </div>
      {change && (
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          {change}
        </span>
      )}
    </div>
    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{label}</p>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
  </div>
);

const ActionBadge: React.FC<{ action: AuditLog['action'] }> = ({ action }) => {
  const colors = {
    CREATE: 'bg-green-100 text-green-700 border-green-200',
    UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
    DELETE: 'bg-red-100 text-red-700 border-red-200',
    PUBLISH: 'bg-purple-100 text-purple-700 border-purple-200',
    SUSPEND: 'bg-orange-100 text-orange-700 border-orange-200',
    LOGIN: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${colors[action]}`}>
      {action}
    </span>
  );
};

// ============================================================================
// Main Component
// ============================================================================

const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // State
  const [features, setFeatures] = useState(FEATURE_TOGGLES);
  const [passwordLength, setPasswordLength] = useState(12);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [retentionDays, setRetentionDays] = useState(30);
  const [autoBackup, setAutoBackup] = useState(true);

  const handleToggleFeature = (key: string) => {
    setFeatures(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
    setSuccessMessage('Feature updated successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const getActionIcon = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE': return 'add_circle';
      case 'UPDATE': return 'edit';
      case 'DELETE': return 'delete';
      case 'PUBLISH': return 'publish';
      case 'SUSPEND': return 'block';
      case 'LOGIN': return 'login';
      default: return 'circle';
    }
  };

  const getActionColor = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-600';
      case 'UPDATE': return 'bg-blue-100 text-blue-600';
      case 'DELETE': return 'bg-red-100 text-red-600';
      case 'PUBLISH': return 'bg-purple-100 text-purple-600';
      case 'SUSPEND': return 'bg-orange-100 text-orange-600';
      case 'LOGIN': return 'bg-slate-100 text-slate-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  // ============================================================================
  // Section Renderers
  // ============================================================================

  const renderOverview = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon="people" label="Total Users" value="1,284" change="+12%" color="bg-blue-500" />
        <StatCard icon="description" label="Content Items" value="3,842" change="+8%" color="bg-emerald-500" />
        <StatCard icon="toggle_on" label="Active Features" value="14" change="+2" color="bg-purple-500" />
        <StatCard icon="security" label="Security Score" value="96%" color="bg-amber-500" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: 'person_add', label: 'Add User', tab: 'users' },
            { icon: 'description', label: 'New Content Type', tab: 'content-types' },
            { icon: 'backup', label: 'Run Backup', tab: 'backup' },
            { icon: 'security', label: 'Security Check', tab: 'security' },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => setActiveTab(action.tab as SettingsTab)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon name={action.icon} size={24} className="text-primary" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
          <button onClick={() => setActiveTab('audit')} className="text-sm text-primary hover:underline">
            View All
          </button>
        </div>
        <div className="space-y-4">
          {AUDIT_LOGS.slice(0, 3).map(log => (
            <div key={log.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className={`w-10 h-10 rounded-full ${getActionColor(log.action)} flex items-center justify-center`}>
                <Icon name={getActionIcon(log.action)} size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{log.description}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {log.user} • {new Date(log.timestamp).toLocaleString()}
                </p>
              </div>
              <span className="text-xs text-slate-400">{log.ip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContentTypes = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Content Types</h2>
        <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20">
          <Icon name="add" size={18} />
          New Type
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Slug</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Posts</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {CONTENT_TYPES.map(type => (
                <tr key={type.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">{type.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{type.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{type.slug}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      type.isEnabled 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {type.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{type.postsCount}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-primary hover:text-blue-700 mr-3">
                      <Icon name="edit" size={18} />
                    </button>
                    {!type.isSystem && (
                      <button className="text-red-500 hover:text-red-700">
                        <Icon name="delete" size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderRoles = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Roles & Permissions</h2>
        <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/20">
          <Icon name="add" size={18} className="mr-1" />
          Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ROLES.map(role => (
          <div
            key={role.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${role.color}20` }}>
                  <span className="text-xl" style={{ color: role.color }}>●</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{role.name}</h3>
                  {role.isSystem && (
                    <span className="text-[10px] font-medium text-slate-400 uppercase">System</span>
                  )}
                </div>
              </div>
              {!role.isSystem && (
                <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Icon name="more_vert" size={18} className="text-slate-400 hover:text-primary" />
                </button>
              )}
            </div>
            
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{role.description}</p>
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{role.permissions}</span>
                <span className="text-xs text-slate-500">permissions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{role.users}</span>
                <span className="text-xs text-slate-500">users</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Security Configuration</h2>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">Authentication Policy</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Email Verification</p>
              <p className="text-sm text-slate-500 mt-1">Require users to verify their email before access</p>
            </div>
            <Toggle enabled={true} onChange={() => {}} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">User Registration</p>
              <p className="text-sm text-slate-500 mt-1">Allow new users to create accounts via the portal</p>
            </div>
            <Toggle enabled={true} onChange={() => {}} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Two-Factor Authentication</p>
              <p className="text-sm text-slate-500 mt-1">Require 2FA for all administrator accounts</p>
            </div>
            <Toggle enabled={true} onChange={() => {}} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">Password Requirements</h3>
        </div>
        <div className="p-6 space-y-8">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Minimum Length:</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPasswordLength(prev => Math.max(8, prev - 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50"
              >
                <Icon name="remove" size={14} />
              </button>
              <span className="w-12 text-center font-semibold">{passwordLength}</span>
              <button 
                onClick={() => setPasswordLength(prev => Math.min(32, prev + 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50"
              >
                <Icon name="add" size={14} />
              </button>
              <span className="text-sm text-slate-500 ml-2">characters</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Required Characters:</p>
            <div className="grid grid-cols-2 gap-3">
              {['Uppercase (A-Z)', 'Numbers (0-9)', 'Special (!@#)', 'No Common Words'].map(req => (
                <label key={req} className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary" defaultChecked={req !== 'No Common Words'} />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{req}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFeatures = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Feature Toggles</h2>
        <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/20">
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {Object.entries(
          features.reduce((acc, f) => {
            if (!acc[f.category]) acc[f.category] = [];
            acc[f.category].push(f);
            return acc;
          }, {} as Record<string, FeatureToggle[]>)
        ).map(([category, toggles]) => (
          <div key={category} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">{category}</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {toggles.map(feature => (
                <div key={feature.key} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex-1 max-w-2xl">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-slate-900 dark:text-white">{feature.name}</p>
                      {feature.hasConfig && (
                        <button className="text-xs font-medium text-primary hover:underline">
                          Configure
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{feature.description}</p>
                  </div>
                  <Toggle enabled={feature.enabled} onChange={() => handleToggleFeature(feature.key)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Service Integrations</h2>
        <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20">
          <Icon name="add" size={18} />
          Add Integration
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INTEGRATIONS.map(integration => (
          <div
            key={integration.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 ${integration.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon name={integration.icon} size={24} className={integration.iconColor} />
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                integration.status === 'connected'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                  integration.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}></span>
                {integration.status === 'connected' ? 'Connected' : 'Not Active'}
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{integration.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{integration.description}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              {integration.status === 'connected' ? (
                <>
                  <button className="text-xs font-semibold text-primary hover:underline">Configure</button>
                  <button className="text-xs font-semibold text-red-400 hover:text-red-500">Disconnect</button>
                </>
              ) : (
                <button className="text-xs font-semibold text-primary hover:underline">Connect Now</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBackup = () => (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Backup & Export</h2>

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-primary">
            <Icon name="check_circle" size={24} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Last backup completed successfully</p>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">100%</span>
            </div>
            <div className="w-full bg-blue-100 dark:bg-blue-900/30 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-full"></div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Today at 04:00 AM</p>
            <p className="text-[10px] text-blue-400">245.8 MB</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: 'database', title: 'Database Backup', desc: 'Complete SQL backup', format: 'SQL', color: 'bg-blue-50 text-blue-600' },
          { icon: 'description', title: 'Content Export', desc: 'All sermons & articles', format: 'JSON', color: 'bg-indigo-50 text-indigo-600' },
          { icon: 'people', title: 'Users Export', desc: 'Member directory', format: 'CSV', color: 'bg-emerald-50 text-emerald-600' },
        ].map(option => (
          <div key={option.title} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
            <div className={`w-12 h-12 ${option.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <Icon name={option.icon} size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{option.title}</h3>
            <p className="text-sm text-slate-500 mb-6">{option.desc}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-400">{option.format}</span>
              <button className="text-sm font-semibold text-primary hover:text-blue-700 flex items-center gap-1">
                Start
                <Icon name="arrow_forward" size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">Scheduled Backups</h3>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Auto Backup</p>
                  <p className="text-xs text-slate-500">Enable daily automated snapshots</p>
                </div>
                <Toggle enabled={autoBackup} onChange={() => setAutoBackup(!autoBackup)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Backup Frequency</label>
                <select 
                  value={backupFrequency}
                  onChange={(e) => setBackupFrequency(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="daily">Daily at 04:00 AM</option>
                  <option value="weekly">Weekly on Sundays</option>
                  <option value="hourly">Every 12 Hours</option>
                </select>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Retention Period (Days)</label>
                <input
                  type="number"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-xs text-slate-400">Older backups will be deleted</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Storage Destination</label>
                <div className="flex gap-3">
                  <button className="flex-1 border-2 border-primary bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <Icon name="cloud" size={20} className="text-primary mx-auto mb-1 block" />
                    <span className="text-[10px] font-bold text-primary block">Cloud</span>
                  </button>
                  <button className="flex-1 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center">
                    <Icon name="storage" size={20} className="text-slate-400 mx-auto mb-1 block" />
                    <span className="text-[10px] font-bold text-slate-400 block">Local</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500">Operation</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500">Date & Time</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">Automatic Backup</td>
                <td className="px-6 py-4 text-sm text-slate-500">Oct 24 · 04:00 AM</td>
                <td className="px-6 py-4"><span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Success</span></td>
                <td className="px-6 py-4 text-right"><button className="text-primary hover:text-blue-700 text-sm font-semibold">Download</button></td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">Users Export</td>
                <td className="px-6 py-4 text-sm text-slate-500">Oct 23 · 02:15 PM</td>
                <td className="px-6 py-4"><span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Success</span></td>
                <td className="px-6 py-4 text-right"><button className="text-primary hover:text-blue-700 text-sm font-semibold">Download</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAudit = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Audit Logs</h2>
        <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/20">
          <Icon name="download" size={18} className="mr-1" />
          Export Logs
        </button>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon name="search" size={20} />
        </span>
        <input
          type="text"
          placeholder="Search logs, users, or actions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="space-y-8">
        {['Today', 'Yesterday'].map((day, idx) => (
          <div key={day} className="relative">
            <div className="sticky top-0 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-lg mb-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{day}</h4>
            </div>
            <div className="space-y-3">
              {AUDIT_LOGS.slice(idx * 2, idx * 2 + 2).map(log => (
                <div key={log.id} className="relative flex gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                  <div className={`w-10 h-10 rounded-full ${getActionColor(log.action)} flex items-center justify-center flex-shrink-0`}>
                    <Icon name={getActionIcon(log.action)} size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{log.description}</p>
                      <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ActionBadge action={log.action} />
                      <span className="text-xs text-slate-400">{log.user}</span>
                      <span className="text-xs text-slate-400">IP: {log.ip}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEmail = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Email Configuration</h2>
      
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="space-y-6">
          {[
            { label: 'SMTP Host', value: 'smtp.gmail.com', type: 'text' },
            { label: 'SMTP Port', value: '587', type: 'text' },
            { label: 'SMTP Username', value: 'noreply@church.org', type: 'text' },
            { label: 'SMTP Password', value: '••••••••', type: 'password' },
            { label: 'Default From Email', value: 'Church <noreply@church.org>', type: 'text' },
          ].map(field => (
            <div key={field.label} className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 w-32">{field.label}</label>
              <input
                type={field.type}
                defaultValue={field.value}
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Test</button>
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold">Save Changes</button>
        </div>
      </div>
    </div>
  );

  const renderAPI = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">API & Keys</h2>
      
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">REST API Enabled</p>
              <p className="text-xs text-slate-500">Enable API access for integrations</p>
            </div>
            <Toggle enabled={true} onChange={() => {}} />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Rate Limiting</p>
              <p className="text-xs text-slate-500">Requests per minute</p>
            </div>
            <input type="number" defaultValue="60" className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-center" />
          </div>
          
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">API Keys</h4>
            <div className="space-y-3">
              {['Production Key', 'Development Key'].map(key => (
                <div key={key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{key}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">••••••••••••••••</span>
                    <button className="text-primary">
                      <Icon name="visibility" size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Appearance</h2>
      
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Theme Mode</label>
            <div className="flex gap-4">
              {['Light', 'Dark', 'System'].map(theme => (
                <button key={theme} className={`flex-1 p-3 rounded-lg border-2 ${theme === 'Light' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50'} transition-colors`}>
                  <span className={`text-sm font-medium ${theme === 'Light' ? 'text-primary' : 'text-slate-600'}`}>{theme}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">Brand Color</label>
            <div className="flex items-center gap-4">
              <input type="color" defaultValue="#2268f5" className="w-12 h-12 rounded-lg border border-slate-200" />
              <input type="text" defaultValue="#2268f5" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModeration = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Moderation</h2>
      
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="space-y-6">
          {[
            { label: 'Enable Moderation Queue', desc: 'Review content before publishing', enabled: true },
            { label: 'Auto-Approve Members', desc: 'Members\' content auto-approved', enabled: false },
            { label: 'Flag Threshold', desc: 'Flags before auto-hiding', input: true, value: 5 },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              {item.input ? (
                <input type="number" defaultValue={item.value} className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-center" />
              ) : (
                <Toggle enabled={item.enabled ?? false} onChange={() => {}} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Notifications</h2>
      
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="space-y-4">
          {[
            { label: 'New User Registration', enabled: true },
            { label: 'Content Published', enabled: true },
            { label: 'New Comment', enabled: false },
            { label: 'Flagged Content', enabled: true },
            { label: 'Weekly Summary', enabled: true },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
              <Toggle enabled={item.enabled} onChange={() => {}} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'content-types': return renderContentTypes();
      case 'users': return <div className="p-8 text-center text-slate-400">User Management UI (to be implemented)</div>;
      case 'roles': return renderRoles();
      case 'security': return renderSecurity();
      case 'features': return renderFeatures();
      case 'integrations': return renderIntegrations();
      case 'backup': return renderBackup();
      case 'audit': return renderAudit();
      case 'email': return renderEmail();
      case 'api': return renderAPI();
      case 'appearance': return renderAppearance();
      case 'moderation': return renderModeration();
      case 'notifications': return renderNotifications();
      default: return renderOverview();
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Success Toast */}
      {successMessage && (
        <div className="toast-success">
          <Icon name="check_circle" size={18} />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col flex-shrink-0 ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Icon name="settings" size={18} />
            {!sidebarCollapsed && <span className="font-bold text-lg text-slate-900 dark:text-white">Settings</span>}
          </div>
          <button
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Icon name={sidebarCollapsed ? 'chevron_right' : 'chevron_left'} size={18} className="text-slate-500" />
          </button>
        </div>

        <nav className="p-4 space-y-1 flex-shrink-0">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 w-full rounded px-3 py-2 font-medium transition-all text-left ${
                activeTab === item.id
                  ? 'bg-primary text-white font-semibold'
                  : 'text-slate-soft hover:bg-slate-50 hover:text-primary'
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon name={item.icon} size={18} className={activeTab === item.id ? 'text-white' : ''} />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-sm font-medium text-left">{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-xs font-bold bg-primary/10 text-primary rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {NAV_ITEMS.find(i => i.id === activeTab)?.label || 'Settings'}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-slate-500 hover:text-slate-700 relative">
                <Icon name="notifications" size={20} className="text-slate-500" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold shadow-lg shadow-primary/20">
                Save Changes
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-8 overscroll-contain">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default AdminSettings;
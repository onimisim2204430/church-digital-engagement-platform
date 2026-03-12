import {
  AuditLog,
  BackupExportOption,
  ContentType,
  FeatureToggle,
  Integration,
  Role,
  SettingsEmailField,
  SettingsNavItem,
  SettingsQuickAction,
} from '../types/admin-settings.types';

export const NAV_ITEMS: SettingsNavItem[] = [
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

export const QUICK_ACTIONS: SettingsQuickAction[] = [
  { icon: 'person_add', label: 'Add User', tab: 'users' },
  { icon: 'description', label: 'New Content Type', tab: 'content-types' },
  { icon: 'backup', label: 'Run Backup', tab: 'backup' },
  { icon: 'security', label: 'Security Check', tab: 'security' },
];

export const FEATURE_TOGGLES: FeatureToggle[] = [
  { key: 'email_verification', name: 'Email Verification', description: 'Require users to verify their email address before accessing content.', enabled: true, category: 'Authentication' },
  { key: 'user_registration', name: 'User Registration', description: 'Allow new users to create accounts via the portal.', enabled: true, category: 'Authentication' },
  { key: 'social_login', name: 'Social Login', description: 'Allow sign in with Apple, Google, or Facebook.', enabled: false, category: 'Authentication', hasConfig: true },
  { key: 'two_factor', name: 'Two-Factor Authentication', description: 'Require 2FA for administrator accounts.', enabled: true, category: 'Security' },
  { key: 'comments', name: 'Comments', description: 'Enable discussions on sermons and articles.', enabled: true, category: 'Content' },
  { key: 'moderation_queue', name: 'Moderation Queue', description: 'Require manual approval for all new comments.', enabled: true, category: 'Content' },
  { key: 'offline_downloads', name: 'Offline Downloads', description: 'Allow mobile app users to download sermon audio.', enabled: false, category: 'Mobile' },
  { key: 'auto_publish', name: 'Auto-Publish', description: 'Automatically publish scheduled content.', enabled: true, category: 'Content' },
];

export const INTEGRATIONS: Integration[] = [
  { id: 'analytics', name: 'Web Analytics', description: 'Track visitor behavior and engagement metrics.', icon: 'bar_chart', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', status: 'connected', configurable: true },
  { id: 'slack', name: 'Communication Hub', description: 'Receive notifications for member registrations and prayer requests.', icon: 'chat', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', status: 'connected', configurable: true },
  { id: 'mailchimp', name: 'Email Newsletter', description: 'Sync platform users with your newsletter subscriber lists.', icon: 'mail', iconBg: 'bg-yellow-50', iconColor: 'text-yellow-600', status: 'connected', configurable: true },
  { id: 'zapier', name: 'Workflow Automation', description: 'Connect to over 3,000+ apps to automate tasks.', icon: 'bolt', iconBg: 'bg-orange-50', iconColor: 'text-orange-600', status: 'disconnected', configurable: true },
  { id: 'calendar', name: 'Google Calendar', description: 'Sync events with your church calendar.', icon: 'calendar_month', iconBg: 'bg-blue-50', iconColor: 'text-blue-600', status: 'disconnected', configurable: true },
  { id: 'donations', name: 'Stripe', description: 'Process donations and track giving history.', icon: 'payments', iconBg: 'bg-purple-50', iconColor: 'text-purple-600', status: 'disconnected', configurable: true },
];

export const ROLES: Role[] = [
  { id: 'admin', name: 'Admin', description: 'Full system access', color: '#ef4444', permissions: 42, users: 3, isSystem: true },
  { id: 'moderator', name: 'Moderator', description: 'Content & user moderation', color: '#f59e0b', permissions: 28, users: 5, isSystem: true },
  { id: 'editor', name: 'Editor', description: 'Can edit content and schedule events', color: '#10b981', permissions: 18, users: 12, isSystem: true },
  { id: 'member', name: 'Member', description: 'Standard member access', color: '#3b82f6', permissions: 8, users: 128, isSystem: true },
  { id: 'visitor', name: 'Visitor', description: 'Limited public access', color: '#6b7280', permissions: 3, users: 0, isSystem: true },
];

export const AUDIT_LOGS: AuditLog[] = [
  { id: '1', user: 'John Doe', action: 'UPDATE', description: 'Updated sermon content', ip: '192.168.1.1', timestamp: '2024-10-24T14:34:00' },
  { id: '2', user: 'Sarah Miller', action: 'CREATE', description: 'Created new user account', ip: '45.12.8.241', timestamp: '2024-10-24T13:15:00' },
  { id: '3', user: 'Admin', action: 'DELETE', description: 'Removed old log entries', ip: '8.8.8.8', timestamp: '2024-10-24T11:02:00' },
  { id: '4', user: 'Mark S.', action: 'PUBLISH', description: 'Published sermon series', ip: '102.11.22.4', timestamp: '2024-10-23T23:58:00' },
  { id: '5', user: 'Jane Cooper', action: 'LOGIN', description: 'Successful login', ip: '192.168.1.2', timestamp: '2024-10-23T22:30:00' },
];

export const CONTENT_TYPES: ContentType[] = [
  { id: '1', name: 'Post', slug: 'post', description: 'General posts and announcements', isSystem: true, isEnabled: true, postsCount: 128, sortOrder: 10 },
  { id: '2', name: 'Sermon', slug: 'sermon', description: 'Sermon recordings and notes', isSystem: true, isEnabled: true, postsCount: 45, sortOrder: 20 },
  { id: '3', name: 'Event', slug: 'event', description: 'Church events and gatherings', isSystem: true, isEnabled: true, postsCount: 67, sortOrder: 30 },
  { id: '4', name: 'Devotion', slug: 'devotion', description: 'Daily devotionals', isSystem: false, isEnabled: true, postsCount: 89, sortOrder: 40 },
  { id: '5', name: 'Prayer', slug: 'prayer', description: 'Prayer requests', isSystem: false, isEnabled: false, postsCount: 23, sortOrder: 50 },
];

export const BACKUP_EXPORT_OPTIONS: BackupExportOption[] = [
  { icon: 'database', title: 'Database Backup', desc: 'Complete SQL backup', format: 'SQL', color: 'bg-blue-50 text-blue-600' },
  { icon: 'description', title: 'Content Export', desc: 'All sermons & articles', format: 'JSON', color: 'bg-indigo-50 text-indigo-600' },
  { icon: 'people', title: 'Users Export', desc: 'Member directory', format: 'CSV', color: 'bg-emerald-50 text-emerald-600' },
];

export const EMAIL_FIELDS: SettingsEmailField[] = [
  { label: 'SMTP Host', value: 'smtp.gmail.com', type: 'text' },
  { label: 'SMTP Port', value: '587', type: 'text' },
  { label: 'SMTP Username', value: 'noreply@church.org', type: 'text' },
  { label: 'SMTP Password', value: '••••••••', type: 'password' },
  { label: 'Default From Email', value: 'Church <noreply@church.org>', type: 'text' },
];

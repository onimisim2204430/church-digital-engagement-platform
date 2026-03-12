export type SettingsTab =
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

export interface SettingsNavItem {
  id: SettingsTab;
  label: string;
  icon: string;
  badge?: string | number;
}

export interface FeatureToggle {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  hasConfig?: boolean;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  status: 'connected' | 'disconnected';
  configurable: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: number;
  users: number;
  isSystem?: boolean;
}

export interface AuditLog {
  id: string;
  user: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'SUSPEND' | 'LOGIN';
  description: string;
  ip: string;
  timestamp: string;
}

export interface ContentType {
  id: string;
  name: string;
  slug: string;
  description: string;
  isSystem: boolean;
  isEnabled: boolean;
  postsCount: number;
  sortOrder: number;
}

export interface BackupExportOption {
  icon: string;
  title: string;
  desc: string;
  format: string;
  color: string;
}

export interface SettingsQuickAction {
  icon: string;
  label: string;
  tab: SettingsTab;
}

export interface SettingsEmailField {
  label: string;
  value: string;
  type: string;
}

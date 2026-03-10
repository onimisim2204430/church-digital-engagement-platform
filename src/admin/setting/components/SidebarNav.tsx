import React from 'react';
import Icon from '../../../components/common/Icon';
import { SettingsNavItem, SettingsTab } from '../types/admin-settings.types';

interface SidebarNavProps {
  navItems: SettingsNavItem[];
  activeTab: SettingsTab;
  sidebarCollapsed: boolean;
  onSelectTab: (tab: SettingsTab) => void;
  onToggleCollapsed: () => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({
  navItems,
  activeTab,
  sidebarCollapsed,
  onSelectTab,
  onToggleCollapsed,
}) => {
  return (
    <aside
      className={`settings-sidebar-nav transition-all duration-300 flex flex-col flex-shrink-0 h-full ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
      style={{
        background: 'var(--admin-sidebar-bg)',
        borderRight: '1px solid var(--admin-sidebar-border)',
      }}
    >
      <div 
        className="p-6 flex items-center justify-between flex-shrink-0"
        style={{
          borderBottom: '1px solid var(--admin-sidebar-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <Icon name="settings" size={18} style={{ color: 'var(--admin-sidebar-text-active)' }} />
          {!sidebarCollapsed && (
            <span 
              className="font-bold text-lg"
              style={{ color: 'var(--admin-sidebar-text-active)' }}
            >
              Settings
            </span>
          )}
        </div>
        <button 
          className="p-1.5 rounded-lg transition-colors" 
          onClick={onToggleCollapsed}
          style={{
            color: 'var(--admin-sidebar-text)',
            background: 'transparent',
          }}
        >
          <Icon name={sidebarCollapsed ? 'chevron_right' : 'chevron_left'} size={18} />
        </button>
      </div>

      <nav className="p-4 space-y-1 flex-1 min-h-0 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex items-center gap-3 w-full rounded px-3 py-2 font-medium transition-all text-left`}
            style={{
              background: activeTab === item.id ? 'var(--admin-sidebar-active)' : 'transparent',
              color: activeTab === item.id ? 'var(--admin-sidebar-text-active)' : 'var(--admin-sidebar-text)',
              borderLeft: activeTab === item.id ? '3px solid var(--admin-primary)' : '3px solid transparent',
            }}
            title={sidebarCollapsed ? item.label : undefined}
          >
            <Icon 
              name={item.icon} 
              size={18} 
              style={{ color: activeTab === item.id ? 'var(--admin-primary)' : 'inherit' }} 
            />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-sm font-medium text-left">{item.label}</span>
                {item.badge && (
                  <span 
                    className="px-1.5 py-0.5 text-xs font-bold rounded-full"
                    style={{
                      background: 'var(--admin-primary)',
                      color: 'white',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default React.memo(SidebarNav);

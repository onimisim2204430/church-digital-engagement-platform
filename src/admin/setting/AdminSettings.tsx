import React, { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FEATURE_TOGGLES, NAV_ITEMS } from './constants/admin-settings.constants';
import SidebarNav from './components/SidebarNav';
import SuccessToast from './components/SuccessToast';
import TabSkeleton from './components/TabSkeleton';
import { FeatureToggle, SettingsTab } from './types/admin-settings.types';
import '../styles/AdminSettings.css';

const OverviewTab = lazy(() => import('./tabs/OverviewTab'));
const ContentTypesTab = lazy(() => import('./tabs/ContentTypesTab'));
const UsersTab = lazy(() => import('./tabs/UsersTab'));
const RolesTab = lazy(() => import('./tabs/RolesTab'));
const SecurityTab = lazy(() => import('./tabs/SecurityTab'));
const FeaturesTab = lazy(() => import('./tabs/FeaturesTab'));
const IntegrationsTab = lazy(() => import('./tabs/IntegrationsTab'));
const BackupTab = lazy(() => import('./tabs/BackupTab'));
const AuditTab = lazy(() => import('./tabs/AuditTab'));
const EmailTab = lazy(() => import('./tabs/EmailTab'));
const ApiTab = lazy(() => import('./tabs/ApiTab'));
const AppearanceTab = lazy(() => import('./tabs/AppearanceTab'));
const ModerationTab = lazy(() => import('./tabs/ModerationTab'));
const NotificationsTab = lazy(() => import('./tabs/NotificationsTab'));

const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [features, setFeatures] = useState<FeatureToggle[]>(FEATURE_TOGGLES);
  const [passwordLength, setPasswordLength] = useState(12);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [retentionDays, setRetentionDays] = useState(30);
  const [autoBackup, setAutoBackup] = useState(true);

  const clearSuccess = useCallback(() => {
    window.setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const handleToggleFeature = useCallback(
    (key: string) => {
      setFeatures((prev) => prev.map((feature) => (feature.key === key ? { ...feature, enabled: !feature.enabled } : feature)));
      setSuccessMessage('Feature updated successfully');
      clearSuccess();
    },
    [clearSuccess],
  );

  const handleDecreasePasswordLength = useCallback(() => {
    setPasswordLength((prev) => Math.max(8, prev - 1));
  }, []);

  const handleIncreasePasswordLength = useCallback(() => {
    setPasswordLength((prev) => Math.min(32, prev + 1));
  }, []);

  const handleToggleAutoBackup = useCallback(() => {
    setAutoBackup((prev) => !prev);
  }, []);

  const handleChangeBackupFrequency = useCallback((value: string) => {
    setBackupFrequency(value);
  }, []);

  const handleChangeRetentionDays = useCallback((value: number) => {
    setRetentionDays(Number.isNaN(value) ? 0 : value);
  }, []);

  const handleSearchQueryChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleSelectTab = useCallback((tab: SettingsTab) => {
    setActiveTab(tab);
  }, []);

  const handleNavigateTab = useCallback((tab: SettingsTab) => {
    setActiveTab(tab);
  }, []);

  const handleToggleCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const pageTitle = useMemo(() => NAV_ITEMS.find((item) => item.id === activeTab)?.label || 'Settings', [activeTab]);

  const activeContent = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab onNavigateTab={handleNavigateTab} />;
      case 'content-types':
        return <ContentTypesTab />;
      case 'users':
        return <UsersTab />;
      case 'roles':
        return <RolesTab />;
      case 'security':
        return (
          <SecurityTab
            passwordLength={passwordLength}
            onDecreasePasswordLength={handleDecreasePasswordLength}
            onIncreasePasswordLength={handleIncreasePasswordLength}
          />
        );
      case 'features':
        return <FeaturesTab features={features} onToggleFeature={handleToggleFeature} />;
      case 'integrations':
        return <IntegrationsTab />;
      case 'backup':
        return (
          <BackupTab
            autoBackup={autoBackup}
            backupFrequency={backupFrequency}
            retentionDays={retentionDays}
            onToggleAutoBackup={handleToggleAutoBackup}
            onChangeBackupFrequency={handleChangeBackupFrequency}
            onChangeRetentionDays={handleChangeRetentionDays}
          />
        );
      case 'audit':
        return <AuditTab searchQuery={searchQuery} onSearchQueryChange={handleSearchQueryChange} />;
      case 'email':
        return <EmailTab />;
      case 'api':
        return <ApiTab />;
      case 'appearance':
        return <AppearanceTab />;
      case 'moderation':
        return <ModerationTab />;
      case 'notifications':
        return <NotificationsTab />;
      default:
        return <OverviewTab onNavigateTab={handleNavigateTab} />;
    }
  }, [
    activeTab,
    autoBackup,
    backupFrequency,
    features,
    handleChangeBackupFrequency,
    handleChangeRetentionDays,
    handleDecreasePasswordLength,
    handleIncreasePasswordLength,
    handleNavigateTab,
    handleSearchQueryChange,
    handleToggleAutoBackup,
    handleToggleFeature,
    passwordLength,
    retentionDays,
    searchQuery,
  ]);

  // Tabs that manage their own scroll/layout — no padding or overflow-y wrapper
  const FULL_BLEED_TABS: SettingsTab[] = ['roles', 'users'];
  const isFullBleed = FULL_BLEED_TABS.includes(activeTab);

  return (
    <div 
      className="flex h-full min-h-0 overflow-hidden"
      style={{
        background: 'var(--admin-bg-secondary)',
      }}
    >
      <SuccessToast message={successMessage} />

      <aside className="flex flex-col flex-shrink-0 min-h-0 overflow-hidden">
        <SidebarNav
          navItems={NAV_ITEMS}
          activeTab={activeTab}
          sidebarCollapsed={sidebarCollapsed}
          onSelectTab={handleSelectTab}
          onToggleCollapsed={handleToggleCollapsed}
        />
      </aside>

      <main 
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
        style={{
          background: 'var(--admin-bg-secondary)',
        }}
      >
        {isFullBleed ? (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <Suspense fallback={<TabSkeleton />}>
              {activeContent}
            </Suspense>
          </div>
        ) : (
          <div
            className="overflow-y-auto flex-1 min-h-0 p-8 overscroll-contain"
            style={{ background: 'var(--admin-bg-secondary)' }}
          >
            <Suspense fallback={<TabSkeleton />}>
              {activeContent}
            </Suspense>
          </div>
        )}
      </main>
    </div>
  );
};

export default React.memo(AdminSettings);
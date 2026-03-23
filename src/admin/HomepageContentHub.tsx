import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../components/common/Icon';
import FeaturedSeriesTab from './homepage-content/tabs/FeaturedSeriesTab';
import CurrentSpotlightTab from './homepage-content/tabs/CurrentSpotlightTab';
import SpiritualPracticesTab from './homepage-content/tabs/SpiritualPracticesTab';
import CommunityStoriesTab from './homepage-content/tabs/CommunityStoriesTab';

type HomepageTab = 'featured-series' | 'current-spotlight' | 'spiritual-practices' | 'community-stories';

interface TabConfig {
  key: HomepageTab;
  label: string;
  icon: string;
  description: string;
  accent: string;
  accentBg: string;
  accentText: string;
}

const TAB_CONFIGS: TabConfig[] = [
  {
    key: 'featured-series',
    label: 'Featured Series',
    icon: 'star',
    description: '3 archive cards shown publicly',
    accent: 'border-amber-400 bg-amber-50 dark:bg-amber-950/20',
    accentBg: 'bg-amber-100 dark:bg-amber-900/30',
    accentText: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'current-spotlight',
    label: 'Current Spotlight',
    icon: 'bolt',
    description: 'Spotlight series & part status',
    accent: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20',
    accentBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    accentText: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'spiritual-practices',
    label: 'Spiritual Practices',
    icon: 'self_improvement',
    description: 'Practice cards & visibility',
    accent: 'border-violet-400 bg-violet-50 dark:bg-violet-950/20',
    accentBg: 'bg-violet-100 dark:bg-violet-900/30',
    accentText: 'text-violet-600 dark:text-violet-400',
  },
  {
    key: 'community-stories',
    label: 'Community Stories',
    icon: 'movie',
    description: 'Testimony cards on homepage',
    accent: 'border-sky-400 bg-sky-50 dark:bg-sky-950/20',
    accentBg: 'bg-sky-100 dark:bg-sky-900/30',
    accentText: 'text-sky-600 dark:text-sky-400',
  },
];

const FALLBACK_TAB: HomepageTab = 'featured-series';

const resolveTab = (value: string | null): HomepageTab => {
  if (!value) return FALLBACK_TAB;
  const found = TAB_CONFIGS.find((tab) => tab.key === value);
  return found ? found.key : FALLBACK_TAB;
};

const HomepageContentHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = resolveTab(searchParams.get('tab'));
  const activeConfig = TAB_CONFIGS.find((t) => t.key === activeTab)!;

  const setTab = (tab: HomepageTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const renderTabContent = () => {
    if (activeTab === 'featured-series') return <FeaturedSeriesTab />;
    if (activeTab === 'current-spotlight') return <CurrentSpotlightTab />;
    if (activeTab === 'spiritual-practices') return <SpiritualPracticesTab />;
    return <CommunityStoriesTab />;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="px-6 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-1 rounded-full bg-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Homepage Content
            </h1>
          </div>
          <p className="ml-4 text-sm text-slate-500 dark:text-slate-400">
            Control every public-facing section from a single place.
          </p>
        </div>

        {/* Tab Strip */}
        <div className="px-6">
          <div className="flex gap-1 overflow-x-auto pb-px scrollbar-none">
            {TAB_CONFIGS.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  onClick={() => setTab(tab.key)}
                  type="button"
                  className={[
                    'relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-150 border-b-2 -mb-px',
                    isActive
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300',
                  ].join(' ')}
                >
                  <Icon
                    name={tab.icon}
                    size={16}
                    className={isActive ? 'text-emerald-500' : 'text-slate-400'}
                  />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Tab Context Banner */}
      <div className={`border-b ${activeConfig.accent} dark:border-slate-700`}>
        <div className="px-6 py-2.5 flex items-center gap-2">
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded ${activeConfig.accentBg}`}>
            <Icon name={activeConfig.icon} size={12} className={activeConfig.accentText} />
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-300">{activeConfig.description}</span>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-0">{renderTabContent()}</div>
    </div>
  );
};

export default HomepageContentHub;
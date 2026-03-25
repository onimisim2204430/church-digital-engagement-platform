/**
 * Member Bottom Tab Bar — Mobile Navigation
 * SOVEREIGN: shown only on mobile (≤768px), replaces sidebar.
 * Max 5 tabs. Uses --m- tokens from member.tokens.css.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Tab {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

const TABS: Tab[] = [
  { id: 'overview',  label: 'Home',    icon: 'grid_view' },
  { id: 'sermons',   label: 'Sermons', icon: 'play_circle' },
  { id: 'events',    label: 'Events',  icon: 'event' },
  { id: 'community', label: 'Connect', icon: 'forum' },
  { id: 'settings',  label: 'Account', icon: 'person' },
];

interface BottomTabBarProps {
  activeView: string;
}

const MemberBottomTabBar: React.FC<BottomTabBarProps> = ({ activeView }) => {
  const navigate = useNavigate();

  const handleTab = (id: string) => {
    const path = id === 'overview' ? '/member' : `/member/${id}`;
    navigate(path);
  };

  return (
    <nav className="m-bottom-tab-bar" aria-label="Mobile navigation">
      <div className="m-bottom-tab-bar-inner">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`m-tab-btn${activeView === tab.id ? ' active' : ''}`}
            onClick={() => handleTab(tab.id)}
            aria-current={activeView === tab.id ? 'page' : undefined}
            aria-label={tab.label}
          >
            <span className="m-tab-btn-icon">
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '22px',
                  fontVariationSettings: activeView === tab.id
                    ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24"
                    : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                }}
                aria-hidden="true"
              >
                {tab.icon}
              </span>
              {tab.badge && tab.badge > 0 && (
                <span className="m-tab-btn-badge" aria-hidden="true">
                  {tab.badge}
                </span>
              )}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MemberBottomTabBar;

/**
 * Member Bottom Tab Bar — Mobile Navigation
 * SOVEREIGN: shown only on mobile (≤768px), replaces sidebar.
 * Max 5 tabs. Uses --m- tokens from member.tokens.css.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import MemberIcon, { type MemberIconName } from '../components/MemberIcon';

interface Tab {
  id: string;
  label: string;
  icon: MemberIconName;
  badge?: number;
}

const TABS: Tab[] = [
  { id: 'overview',  label: 'Home',    icon: 'dashboard' },
  { id: 'sermons',   label: 'Sermons', icon: 'sermons' },
  { id: 'events',    label: 'Events',  icon: 'events' },
  { id: 'community', label: 'Connect', icon: 'community' },
  { id: 'settings',  label: 'Account', icon: 'user' },
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
              <MemberIcon name={tab.icon} size={21} />
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

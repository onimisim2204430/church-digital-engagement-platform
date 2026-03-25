/**
 * Member Layout — Shell Component
 * The outermost frame for all member pages.
 * Imports the sovereign member design system.
 *
 * Structure:
 *   member-shell
 *     ├── MemberTopBar  (fixed, 64px)
 *     └── member-shell-body
 *           ├── MemberSidebar  (256px desktop / 64px collapsed / hidden mobile)
 *           └── member-content-slot
 *                 └── member-page-area  (page content via <Outlet />)
 */

import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MemberSidebar from './MemberSidebar';
import MemberTopBar from './MemberTopBar';
import MemberBottomTabBar from './MemberBottomTabBar';

/* Member sovereign design system — import order matters */
import '../styles/member.tokens.css';
import '../styles/member.typography.css';
import '../styles/member.layout.css';
import '../styles/member.components.css';
import './MemberLayout.css';

interface MemberLayoutProps {
  children?: React.ReactNode;
}

const MemberLayout: React.FC<MemberLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const getActiveView = (): string => {
    const path = location.pathname;
    if (path === '/member' || path === '/member/') return 'overview';
    const match = path.match(/^\/member\/([^/]+)/);
    return match ? match[1] : 'overview';
  };

  return (
    <div className="member-shell">
      {/* Fixed topbar — always on top */}
      <MemberTopBar
        onMenuClick={() => setIsSidebarOpen(prev => !prev)}
      />

      {/* Body: sidebar + content */}
      <div className="member-shell-body">
        <MemberSidebar
          activeView={getActiveView()}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="member-content-slot" id="member-main" tabIndex={-1}>
          {/* Skip-to-content target */}
          <a href="#member-main" className="m-skip-link" tabIndex={0}>
            Skip to main content
          </a>

          <div className="member-page-area">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <MemberBottomTabBar activeView={getActiveView()} />
    </div>
  );
};

export default MemberLayout;

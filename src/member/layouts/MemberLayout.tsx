/**
 * Member Layout — Sanctuary Shell Component
 * The outermost frame for all member pages.
 * Imports the sovereign member design system.
 *
 * Structure:
 *   member-shell
 *     ├── MemberTopBar   (fixed, 72px, full-width on mobile / starts at 320px on desktop)
 *     └── member-shell-body
 *           ├── MemberSidebar     (320px fixed desktop / drawer mobile)
 *           ├── member-sidebar-slot  (320px spacer, hidden mobile)
 *           └── member-content-slot  (flex:1, page content via <Outlet />)
 *
 *   MemberBottomTabBar  (fixed bottom, mobile only ≤768px)
 */

import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('member-theme', 'light');
  }, []);

  /* Derive active view from pathname */
  const getActiveView = (): string => {
    const path = location.pathname;
    if (path === '/member' || path === '/member/') return 'overview';
    const match = path.match(/^\/member\/([^/]+)/);
    return match ? match[1] : 'overview';
  };

  const activeView = getActiveView();
  const topBarTitle = activeView === 'settings' ? 'Settings' : undefined;

  return (
    <div className="member-shell">
      {/* Fixed topbar — always on top */}
      <MemberTopBar
        title={topBarTitle}
        onMenuClick={() => setIsSidebarOpen(prev => !prev)}
      />

      {/* Body: sidebar + content */}
      <div className="member-shell-body">
        {/* Fixed sidebar — 320px desktop, drawer mobile */}
        <MemberSidebar
          activeView={activeView}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Flow spacer — pushes content right by 320px (hidden on mobile) */}
        <div className="member-sidebar-slot" aria-hidden="true" />

        {/* Main content */}
        <main
          className={`member-content-slot member-content-slot-${activeView}`}
          id="member-main"
          tabIndex={-1}
        >


          <div className={`member-page-area member-page-area-${activeView}`}>
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar — only visible ≤768px */}
      {/* <MemberBottomTabBar activeView={activeView} /> */}
    </div>
  );
};

export default MemberLayout;
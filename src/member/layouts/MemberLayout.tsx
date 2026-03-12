/**
 * Member Layout Component
 * Main layout wrapper for all member pages
 * Replicates Admin design structure but with member-specific content
 */

import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MemberSidebar from './MemberSidebar';
import MemberTopBar from './MemberTopBar';
import './MemberLayout.css';

interface MemberLayoutProps {
  children?: React.ReactNode;
}

const MemberLayout: React.FC<MemberLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Determine active view from current route
  const getActiveView = () => {
    const path = location.pathname;
    if (path === '/member' || path === '/member/') {
      return 'overview';
    }
    // Extract view from /member/{view}
    const match = path.match(/^\/member\/([^\/]+)/);
    return match ? match[1] : 'overview';
  };

  const handleMenuClick = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="member-layout">
      <MemberSidebar
        activeView={getActiveView()}
        isOpen={isSidebarOpen}
        onClose={handleSidebarClose}
      />
      
      <div className="member-main-content">
        <MemberTopBar onMenuClick={handleMenuClick} />
        
        <main className="member-content-area">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default MemberLayout;

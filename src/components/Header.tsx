/**
 * Header Component
 * Responsive navigation that adapts based on authentication status
 * Includes context switching for ADMIN and MODERATOR roles
 */
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '../types/auth.types';
import './Header.css';

const Header: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowDropdown(false);
  };

  // Determine if user is in admin context
  const isInAdminContext = location.pathname.startsWith('/admin');
  const isInMemberContext = location.pathname.startsWith('/member');
  
  // Check if user can access admin
  const canAccessAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR;

  const handleContextSwitch = () => {
    if (canAccessAdmin) {
      // ADMIN/MODERATOR: Toggle between public and admin
      if (isInAdminContext) {
        navigate('/');
      } else {
        navigate('/admin');
      }
    } else {
      // MEMBER: Toggle between public and member dashboard
      if (isInMemberContext) {
        navigate('/');
      } else {
        navigate('/member');
      }
    }
  };

  // Determine button text and icon
  const getContextButtonContent = () => {
    if (canAccessAdmin) {
      return isInAdminContext 
        ? { icon: '🌐', label: 'Public Site' }
        : { icon: '🔧', label: 'Admin Dashboard' };
    } else {
      return isInMemberContext
        ? { icon: '🌐', label: 'Public Site' }
        : { icon: '🏠', label: 'Member Dashboard' };
    }
  };

  const buttonContent = getContextButtonContent();

  return (
    <header className="app-header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          <h1>Church Digital Platform</h1>
        </Link>

        <nav className="header-nav">
          {!isAuthenticated ? (
            // Visitor navigation
            <>
              <Link to="/content" className="nav-link">Browse Content</Link>
              <Link to="/login" className="nav-link">Sign In</Link>
              <Link to="/register" className="btn-primary">Get Started</Link>
            </>
          ) : (
            // Authenticated member/admin navigation
            <>
              <Link to="/content" className="nav-link">Content</Link>
              
              {/* Context Switch Button - All authenticated users */}
              <button 
                onClick={handleContextSwitch}
                className="context-switch-btn"
                title={buttonContent.label}
              >
                <span className="context-icon">{buttonContent.icon}</span>
                <span className="context-label">{buttonContent.label}</span>
              </button>

              <div className="user-menu">
                <button 
                  className="user-menu-trigger"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <span className="user-name">{user?.firstName || 'User'}</span>
                  <span className="dropdown-icon">▼</span>
                </button>

                {showDropdown && (
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <div className="user-info">
                        <strong>{user?.firstName} {user?.lastName}</strong>
                        <small>{user?.email}</small>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <Link 
                      to="/profile" 
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      <span className="dropdown-icon-text">👤</span> Profile
                    </Link>
                    <Link 
                      to="/settings" 
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      <span className="dropdown-icon-text">⚙️</span> Settings
                    </Link>
                    <Link 
                      to="/notifications" 
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      <span className="dropdown-icon-text">🔔</span> Notifications
                    </Link>
                    <div className="dropdown-divider"></div>
                    
                    {/* Context Navigation */}
                    <Link 
                      to="/member" 
                      className="dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      <span className="dropdown-icon-text">🏠</span> Member Dashboard
                    </Link>
                    {(user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR) && (
                      <Link 
                        to="/admin" 
                        className="dropdown-item admin-item"
                        onClick={() => setShowDropdown(false)}
                      >
                        <span className="dropdown-icon-text">🔧</span> Admin Dashboard
                      </Link>
                    )}
                    <div className="dropdown-divider"></div>
                    <button 
                      className="dropdown-item logout-item"
                      onClick={handleLogout}
                    >
                      <span className="dropdown-icon-text">🚪</span> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;

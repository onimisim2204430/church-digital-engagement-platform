/**
 * Member Top Bar Component
 * Professional header with mobile hamburger, theme toggle, user menu
 * Real-time notifications via WebSocket + REST API fallback
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNotificationWebSocket } from '../../hooks/useNotificationWebSocket';
import notificationService, { Notification } from '../../services/notification.service';
import {
  SunIcon,
  MoonIcon,
  MenuIcon,
  BellIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
  ChevronDownIcon
} from '../../shared/components/Icons';
import './MemberTopBar.css';

interface Breadcrumb {
  label: string;
  onClick?: () => void;
}

interface TopBarProps {
  title?: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  onMenuClick?: () => void;
}

const MemberTopBar: React.FC<TopBarProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  onMenuClick
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('member-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    const themeValue = newTheme ? 'dark' : 'light';
    localStorage.setItem('member-theme', themeValue);
    document.documentElement.setAttribute('data-theme', themeValue);
  };

  // Fetch notifications on mount and when dropdown opens
  const fetchNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const response = await notificationService.getUnreadNotifications(1, 10);
      setNotifications(response.results || []);
      setUnreadCount(response.unread_count || 0);
    } catch (error) {
      console.error('[Notifications] Failed to fetch:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  // Fallback poll: refresh unread count every 60 s in case a WebSocket message
  // was missed (e.g. browser was backgrounded, connection briefly dropped).
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(async () => {
      try {
        const r = await notificationService.getUnreadNotifications(1, 1);
        setUnreadCount(r.unread_count ?? 0);
      } catch {
        // silent — network may be temporarily unavailable
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // WebSocket integration
  const handleWebSocketNotification = useCallback((notification: Notification) => {
    console.log('[TopBar] WebSocket notification received:', notification);
    
    // Show toast notification
    const notifType = notification.notification_type || '';
    if (notifType.includes('PAYMENT_SUCCESS')) {
      toast.success(`${notification.title}`, 5000);
    } else if (notifType.includes('PAYMENT_FAILED')) {
      toast.error(`${notification.title}`, 5000);
    } else {
      toast.info(`${notification.title}`, 5000);
    }
    
    // Update local notification list
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, [toast]);

  useNotificationWebSocket({
    onNotification: handleWebSocketNotification,
    onConnect: () => console.log('[TopBar] WebSocket connected'),
    onDisconnect: () => console.log('[TopBar] WebSocket disconnected'),
    enabled: Boolean(user?.id),
  });

  // Handle notification dropdown toggle
  const handleNotificationToggle = useCallback(() => {
    const newState = !showNotifications;
    setShowNotifications(newState);
    
    // Refresh notifications when opening
    if (newState && user?.id) {
      fetchNotifications();
    }
  }, [showNotifications, user?.id, fetchNotifications]);

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    try {
      // Mark as read
      await notificationService.markAsRead(notification.id);
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Navigate based on notification type
      const notifType = notification.notification_type || '';
      
      if (notifType.includes('PAYMENT')) {
        // Navigate to giving history with payment ID from metadata
        const paymentId = notification.metadata?.payment_id || notification.metadata?.reference;
        if (paymentId) {
          navigate(`/member/giving?payment=${paymentId}`);
        } else {
          navigate('/member/giving');
        }
      }
      
      // Close dropdown
      setShowNotifications(false);
    } catch (error) {
      console.error('[Notifications] Failed to handle click:', error);
    }
  }, [navigate]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getUserInitials = () => {
    if (!user) return 'M';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName.substring(0, 2).toUpperCase();
    if (user.email) return user.email.substring(0, 2).toUpperCase();
    return 'M';
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <header className="member-topbar">
      <div className="topbar-container">
        {/* Left Side */}
        <div className="topbar-left">
          {/* Mobile Menu Button */}
          <button 
            className="topbar-menu-btn" 
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <MenuIcon size={20} />
          </button>

          {/* Title/Breadcrumbs */}
          <div className="topbar-title-section">
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav className="breadcrumbs" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <span className="breadcrumb-separator">/</span>}
                    {crumb.onClick ? (
                      <button className="breadcrumb-link" onClick={crumb.onClick}>
                        {crumb.label}
                      </button>
                    ) : (
                      <span className="breadcrumb-current">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            ) : (
              <>
                {title && <h1 className="topbar-title">{title}</h1>}
                {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
              </>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="topbar-right">
          {/* Custom Actions */}
          {actions && <div className="topbar-actions">{actions}</div>}

          {/* Theme Toggle */}
          <button 
            className="topbar-icon-btn" 
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </button>

          {/* Notifications */}
          <div className="topbar-dropdown" ref={notifMenuRef}>
            <button 
              className="topbar-icon-btn notif-btn-wrapper"
              onClick={handleNotificationToggle}
              title="Notifications"
            >
              <BellIcon size={18} />
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <div className="dropdown-menu notifications-menu">
                <div className="dropdown-header">
                  <h3>Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="unread-count">{unreadCount} unread</span>
                  )}
                </div>
                
                <div className="notifications-list">
                  {loadingNotifications ? (
                    <div className="notification-loading">
                      <p>Loading...</p>
                    </div>
                  ) : notifications.length > 0 ? (
                    <>
                      {notifications.map((notif) => {
                        const isPayment = notif.notification_type?.includes('PAYMENT');
                        const isSystem = notif.notification_type?.includes('SYSTEM');
                        
                        return (
                          <div 
                            key={notif.id} 
                            className={`notification-item ${isPayment ? 'payment' : ''}`}
                            onClick={() => handleNotificationClick(notif)}
                          >
                            <div className="notification-content">
                              <div className="notification-header">
                                <h4 className="notification-title">{notif.title}</h4>
                                <span className="notification-time">
                                  {formatNotificationTime(notif.created_at)}
                                </span>
                              </div>
                              <p className="notification-message">{notif.message}</p>
                              {isPayment && (
                                <span className="notification-badge">Payment</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="notification-empty">
                      <BellIcon size={32} />
                      <p>No new notifications</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="topbar-dropdown" ref={userMenuRef}>
            <button
              className="topbar-user-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {user?.profilePicture ? (
                <div className="user-avatar-small user-avatar-img">
                  <img src={user.profilePicture} alt={user.firstName} />
                </div>
              ) : (
                <div className="user-avatar-small">
                  {getUserInitials()}
                </div>
              )}
              <span className="user-name-desktop">{user?.firstName}</span>
              <ChevronDownIcon size={16} />
            </button>

            {showUserMenu && (
              <div className="dropdown-menu user-menu">
                <div className="user-menu-header">
                  {user?.profilePicture ? (
                    <div className="user-avatar-large user-avatar-img">
                      <img src={user.profilePicture} alt={user.firstName} />
                    </div>
                  ) : (
                    <div className="user-avatar-large">
                      {getUserInitials()}
                    </div>
                  )}
                  <div className="user-menu-info">
                    <div className="user-menu-name">{user?.firstName} {user?.lastName}</div>
                    <div className="user-menu-email">{user?.email}</div>
                  </div>
                </div>

                <div className="dropdown-divider"></div>

                <button className="dropdown-item" onClick={() => navigate('/member')}>
                  <UserIcon size={16} />
                  <span>My Profile</span>
                </button>

                <button className="dropdown-item" onClick={() => navigate('/member')}>
                  <SettingsIcon size={16} />
                  <span>Settings</span>
                </button>

                <div className="dropdown-divider"></div>

                <button className="dropdown-item danger" onClick={handleLogout}>
                  <LogOutIcon size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default MemberTopBar;

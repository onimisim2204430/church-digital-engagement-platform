import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/common/Icon';
import notificationService, { Notification } from '../../../services/notification.service';

interface NotificationItem extends Notification {
  displayAge: string;
}

const NotificationsPanel = memo(() => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const maxVisible = 5; // Max 5 visible before scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications(1, 50);
      
      if (response?.results) {
        const withAge = response.results.map((n) => ({
          ...n,
          displayAge: getTimeAgo(n.created_at),
        }));
        setNotifications(withAge);
        setUnreadCount(response.unread_count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchNotifications();
    // Poll every 10 seconds for new notifications
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification: NotificationItem) => {
    try {
      if (!notification.is_read) {
        await notificationService.markAsRead(notification.id);
      }
      // Navigate to notifications page
      navigate('/admin/notifications', { state: { from: 'dashboard' } });
    } catch (err) {
      console.error('Error handling notification:', err);
    }
  }, [navigate]);

  // Handle "View All" button
  const handleViewAll = useCallback(() => {
    navigate('/admin/notifications', { state: { from: 'dashboard' } });
  }, [navigate]);

  // Get time ago string
  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const secondsAgo = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (secondsAgo < 60) return 'just now';
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
    return `${Math.floor(secondsAgo / 86400)}d ago`;
  };

  return (
    <div className="rounded-lg border border-border-light dark:border-slate-700 bg-white dark:bg-slate-800/60 flex flex-col h-[360px] overflow-hidden">
      {/* Header */}
      <div className="border-b border-border-light dark:border-slate-700 px-4 py-3 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-[9px] font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={handleViewAll}
          className="text-[9px] font-mono font-bold text-primary dark:text-primary hover:underline transition-colors"
          title="View all notifications"
        >
          VIEW ALL
        </button>
      </div>

      {/* Notifications List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        style={{
          scrollBehavior: 'smooth',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(16, 185, 129, 0.3) transparent',
        }}
      >
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-[11px]">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-[11px]">
            No notifications
          </div>
        ) : (
          notifications.slice(0, 50).map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full text-left p-2.5 rounded-md border transition-all hover:border-primary/50 ${
                notification.is_read
                  ? 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                  : 'bg-blue-50 dark:bg-slate-700/50 border-blue-200 dark:border-blue-900/50'
              }`}
            >
              <div className="flex items-start gap-2">
                {/* Icon by notification type */}
                <div className="flex-shrink-0 mt-0.5">
                  <Icon
                    name={getIconForType(notification.notification_type)}
                    size={14}
                    className={notification.is_read ? 'text-slate-400' : 'text-blue-500'}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className={`text-[10px] font-bold leading-tight truncate ${
                      notification.is_read
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {notification.message}
                  </p>
                  <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-1">
                    {notification.displayAge}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
});

NotificationsPanel.displayName = 'NotificationsPanel';

function getIconForType(type: string): string {
  const iconMap: Record<string, string> = {
    comment: 'chat_bubble',
    reaction: 'favorite',
    follow: 'person_add',
    mention: 'alternate_email',
    payment: 'payment',
    system: 'notifications_active',
    warning: 'warning',
    success: 'check_circle',
    info: 'info',
  };
  return iconMap[type] || 'notifications';
}

export default NotificationsPanel;

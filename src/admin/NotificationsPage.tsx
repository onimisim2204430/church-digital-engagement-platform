import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../components/common/Icon';
import notificationService, { Notification } from '../services/notification.service';

interface NotificationItem extends Notification {
  displayAge: string;
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch notifications
  const fetchNotifications = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      let response;

      if (filter === 'unread') {
        response = await notificationService.getUnreadNotifications(pageNum, pageSize);
      } else {
        response = await notificationService.getNotifications(pageNum, pageSize);
      }

      if (response?.results) {
        const withAge = response.results.map((n: Notification) => ({
          ...n,
          displayAge: getTimeAgo(n.created_at),
        }));

        if (pageNum === 1) {
          setNotifications(withAge);
        } else {
          setNotifications((prev) => [...prev, ...withAge]);
        }

        setHasMore(!!response.next);
        setTotalCount(response.count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, pageSize]);

  // Load on mount
  useEffect(() => {
    setPage(1);
    fetchNotifications(1);
  }, [filter, fetchNotifications]);

  // Get time ago string
  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const secondsAgo = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (secondsAgo < 60) return 'just now';
    if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)}m ago`;
    if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)}h ago`;
    if (secondsAgo < 604800) return `${Math.floor(secondsAgo / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Handle notification click
  const handleNotificationClick = useCallback(async (notification: Notification & { displayAge: string }) => {
    try {
      if (!notification.is_read) {
        await notificationService.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
      }
    } catch (err) {
      console.error('Error handling notification:', err);
    }
  }, []);

  // Handle Mark All as Read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, []);

  // Load more
  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage);
  }, [page, fetchNotifications]);

  // Restrict access - only allow if coming from dashboard or topnav
  const shouldAllow = location.state?.from === 'dashboard' || location.state?.from === 'topnav' || location.state?.from === 'notification';
  if (!shouldAllow && notifications.length === 0 && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
        <div className="rounded-lg border-2 border-border-light dark:border-slate-700 bg-white dark:bg-slate-800/60 p-12 text-center max-w-md">
          <Icon name="block" size={56} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
            Access denied. Notifications can only be accessed from the dashboard or notification bell.
          </p>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="w-full px-6 py-3 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Icon name="notifications" size={32} className="text-primary" />
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
              Notifications
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {totalCount} {totalCount === 1 ? 'notification' : 'notifications'} • {unreadCount} unread
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          {/* Filters */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all border-2 ${
                filter === 'all'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-border-light dark:border-slate-700 hover:border-primary dark:hover:border-primary'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all border-2 relative ${
                filter === 'unread'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-border-light dark:border-slate-700 hover:border-primary dark:hover:border-primary'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Mark All Read Button */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-primary font-bold hover:underline transition-colors whitespace-nowrap"
              title="Mark all notifications as read"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Icon name="hourglass_empty" size={32} className="text-slate-400 animate-spin" />
              <p className="text-slate-500">Loading notifications...</p>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-lg border-2 border-border-light dark:border-slate-700 bg-white dark:bg-slate-800/60 flex flex-col items-center justify-center py-20 px-6">
            <Icon name="notifications_off" size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-600 dark:text-slate-400 text-center">
              {filter === 'unread' ? 'All caught up! No unread notifications.' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left hover:border-primary/50 ${
                    notification.is_read
                      ? 'bg-white dark:bg-slate-800 border-border-light dark:border-slate-700'
                      : 'bg-blue-50 dark:bg-slate-700/40 border-blue-300 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Notification Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-colors ${
                      notification.is_read
                        ? 'bg-slate-100 dark:bg-slate-700/50 border-border-light dark:border-slate-600'
                        : 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800'
                    }`}>
                      <Icon
                        name={getIconForType(notification.notification_type)}
                        size={20}
                        className={notification.is_read ? 'text-slate-500' : 'text-blue-600 dark:text-blue-400'}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <h3 className={`font-bold text-sm ${
                          notification.is_read
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <span className="flex-shrink-0 inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                        )}
                      </div>

                      <p className={`text-sm line-clamp-2 mb-2 ${
                        notification.is_read
                          ? 'text-slate-600 dark:text-slate-500'
                          : 'text-slate-700 dark:text-slate-400'
                      }`}>
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-slate-500 dark:text-slate-500 font-mono">
                          {notification.displayAge}
                        </span>
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 rounded text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-slight">
                          {notification.source_module || 'system'}
                        </span>
                        {notification.priority && (
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                            notification.priority === 'high'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              : notification.priority === 'medium'
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}>
                            {notification.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-8 py-3 bg-white dark:bg-slate-800 border-2 border-primary text-primary rounded-lg font-bold text-sm hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

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

export default NotificationsPage;

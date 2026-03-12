# Notification System - Frontend Integration Guide

## Overview
The notification system provides REST API endpoints for frontend integration. This guide shows how to implement a bell icon with unread count and notification list.

## API Endpoints

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### 1. List All Notifications
```http
GET /api/v1/notifications/
```

**Response:**
```json
{
  "count": 25,
  "next": "http://127.0.0.1:8000/api/v1/notifications/?page=2",
  "previous": null,
  "unread_count": 5,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "notification_type": "PAYMENT_SUCCESS",
      "title": "Payment Successful",
      "message": "Your payment of ₦5000 was successful",
      "priority": "HIGH",
      "source_module": "PAYMENTS",
      "is_read": false,
      "metadata": {
        "payment_id": "pay_123456",
        "amount": 5000
      },
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `page_size` - Items per page (default: 20, max: 100)

---

### 2. List Unread Notifications Only
```http
GET /api/v1/notifications/unread/
```

**Response:** Same structure as above, but only unread notifications

---

### 3. Mark Single Notification as Read
```http
POST /api/v1/notifications/read/<notification_id>/
```

**Response:**
```json
{
  "message": "Notification marked as read",
  "notification_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 4. Mark All Notifications as Read
```http
POST /api/v1/notifications/read-all/
```

**Response:**
```json
{
  "message": "All notifications marked as read",
  "marked_count": 5
}
```

---

### 5. Create Test Notification (Development Only)
```http
POST /api/v1/notifications/test/
Content-Type: application/json

{
  "notification_type": "PAYMENT_SUCCESS",
  "title": "Test Notification",
  "message": "This is a test",
  "priority": "MEDIUM",
  "source_module": "SYSTEM"
}
```

**Available Values:**
- `notification_type`: PAYMENT_SUCCESS, PAYMENT_FAILED, SYSTEM_ALERT, CONTENT_PUBLISHED, SERMON_UPLOADED, NEW_COMMENT, NEW_REPLY, DONATION_RECEIVED, OTHER
- `priority`: LOW, MEDIUM, HIGH, URGENT
- `source_module`: PAYMENTS, CONTENT, INTERACTIONS, SERIES, GIVING, SYSTEM, OTHER

---

## Frontend Implementation Examples

### React/TypeScript Bell Icon Component

```typescript
import { useState, useEffect } from 'react';
import { FiBell } from 'react-icons/fi';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  priority: string;
  source_module: string;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

interface NotificationResponse {
  count: number;
  unread_count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token'); // Adjust based on your auth
      const response = await fetch('http://127.0.0.1:8000/api/v1/notifications/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data: NotificationResponse = await response.json();
        setNotifications(data.results);
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/notifications/read/${notificationId}/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        // Update local state
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        'http://127.0.0.1:8000/api/v1/notifications/read-all/',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900"
      >
        <FiBell size={24} />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-center text-gray-500">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-center text-gray-500">No notifications</p>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    !notif.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm">{notif.title}</h4>
                    {!notif.is_read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-1"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

### Service Hook for Reusability

```typescript
// hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

export const useNotifications = (autoRefresh = true, refreshInterval = 30000) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const getAuthToken = () => localStorage.getItem('access_token');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/notifications/`, {
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.results);
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`${API_BASE}/notifications/read/${notificationId}/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications/read-all/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    
    if (autoRefresh) {
      const interval = setInterval(fetchNotifications, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications, autoRefresh, refreshInterval]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
};
```

**Usage:**
```typescript
import { useNotifications } from './hooks/useNotifications';

const MyComponent = () => {
  const { unreadCount, markAsRead } = useNotifications();
  
  return <div>You have {unreadCount} unread notifications</div>;
};
```

---

## Notification Types & Icons

Map notification types to appropriate icons:

```typescript
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'PAYMENT_SUCCESS':
      return <FiCheckCircle className="text-green-500" />;
    case 'PAYMENT_FAILED':
      return <FiXCircle className="text-red-500" />;
    case 'SYSTEM_ALERT':
      return <FiAlertTriangle className="text-yellow-500" />;
    case 'CONTENT_PUBLISHED':
      return <FiFileText className="text-blue-500" />;
    case 'SERMON_UPLOADED':
      return <FiMic className="text-purple-500" />;
    case 'NEW_COMMENT':
    case 'NEW_REPLY':
      return <FiMessageSquare className="text-blue-500" />;
    case 'DONATION_RECEIVED':
      return <FiDollarSign className="text-green-500" />;
    default:
      return <FiBell className="text-gray-500" />;
  }
};
```

---

## Error Handling

Always handle API errors gracefully:

```typescript
try {
  const response = await fetch(endpoint, options);
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired, redirect to login
      window.location.href = '/login';
    } else if (response.status === 404) {
      console.warn('Notification not found');
    } else {
      console.error('API error:', response.status);
    }
  }
} catch (error) {
  // Network error
  console.error('Network error:', error);
  // Optionally show user-friendly message
}
```

---

## Pagination

Handle paginated results for notification list pages:

```typescript
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(false);

const loadMore = async () => {
  const response = await fetch(
    `${API_BASE}/notifications/?page=${page + 1}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  if (response.ok) {
    const data = await response.json();
    setNotifications(prev => [...prev, ...data.results]);
    setPage(prev => prev + 1);
    setHasMore(data.next !== null);
  }
};
```

---

## WebSocket Integration (Future Enhancement)

For real-time notifications, consider WebSocket:

```javascript
// Future implementation with Django Channels
const socket = new WebSocket('ws://127.0.0.1:8000/ws/notifications/');

socket.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  setNotifications(prev => [notification, ...prev]);
  setUnreadCount(prev => prev + 1);
};
```

---

## Summary

1. **Bell Icon:** Use GET `/notifications/` with `unread_count`
2. **Mark as Read:** POST `/notifications/read/<id>/` when user clicks
3. **Auto-refresh:** Poll every 30-60 seconds for new notifications
4. **Pagination:** Use `page` and `page_size` query parameters
5. **Error Handling:** Always handle 401 (auth) and network errors
6. **Testing:** Use POST `/notifications/test/` to create test notifications

All endpoints are fail-safe and won't break even if the notification system has issues.

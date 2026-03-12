# Real-Time WebSocket Notification System - Frontend Integration Guide

## Overview

This document provides complete Frontend integration for the real-time notification system using Django Channels and WebSockets.

The system provides:
- **Real-time delivery** via WebSocket (instant push)
- **Fallback to REST API** if WebSocket fails
- **Automatic reconnection** with exponential backoff
- **User isolation** (only receive your notifications)
- **Message queuing** during disconnection (can be implemented client-side)

## WebSocket Endpoint

**Development:**
```
ws://127.0.0.1:8000/ws/notifications/
```

**Production (HTTPS):**
```
wss://yourdomain.com/ws/notifications/
```

## Authentication

WebSocket connections use existing Django sessions for authentication:
- Unauthenticated users are **immediately rejected** with close code 4001
- Authentication is handled by `AuthMiddlewareStack` in the ASGI configuration
- The browser automatically sends session cookies with the WebSocket connection

## Event Format

### Incoming Events from Server

All incoming events are JSON objects with these fields:

**Connection Established:**
```json
{
  "type": "connection_established",
  "message": "Connected to notification stream",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Notification:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "Payment Successful",
  "message": "Your payment of ₦5000 was successful",
  "notification_type": "PAYMENT_SUCCESS",
  "priority": "HIGH",
  "source_module": "PAYMENTS",
  "is_read": false,
  "created_at": "2024-01-15T10:30:00Z",
  "metadata": {
    "payment_id": "pay_123456",
    "amount": 5000
  }
}
```

**Pong (Response to ping):**
```json
{
  "type": "pong",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## JavaScript Implementation

### Basic WebSocket Client

```javascript
/**
 * Basic WebSocket notification client with auto-reconnection
 */
class NotificationWebSocket {
  constructor(url = 'ws://127.0.0.1:8000/ws/notifications/') {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectBackoff = 1000; // Start with 1 second
    this.maxBackoff = 30000; // Max 30 seconds
    this.listeners = {
      message: [],
      connect: [],
      disconnect: [],
      error: []
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.ws) {
      console.warn('Already connected');
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => this._handleOpen();
      this.ws.onmessage = (event) => this._handleMessage(event);
      this.ws.onerror = (event) => this._handleError(event);
      this.ws.onclose = (event) => this._handleClose(event);
      
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this._scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a message to the server (e.g., ping for keepalive)
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (event in this.listeners) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (event in this.listeners) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Internal: Handle connection open
   */
  _handleOpen() {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    
    // Emit connect event
    this.listeners.connect.forEach(cb => cb({ type: 'connect' }));
  }

  /**
   * Internal: Handle incoming message
   */
  _handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Emit message event
      this.listeners.message.forEach(cb => cb(data));
      
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  /**
   * Internal: Handle error
   */
  _handleError(event) {
    console.error('WebSocket error:', event);
    this.listeners.error.forEach(cb => cb({
      type: 'error',
      error: event
    }));
  }

  /**
   * Internal: Handle connection close
   */
  _handleClose(event) {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.ws = null;
    
    // Emit disconnect event
    this.listeners.disconnect.forEach(cb => cb({
      type: 'disconnect',
      code: event.code,
      reason: event.reason
    }));
    
    // Check if we should reconnect
    if (event.code === 4001) {
      // Authentication error - don't reconnect
      console.error('Authentication failed');
      return;
    }
    
    if (event.code !== 1000) {
      // Abnormal closure - try to reconnect
      this._scheduleReconnect();
    }
  }

  /**
   * Internal: Schedule reconnection with exponential backoff
   */
  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectBackoff * Math.pow(2, this.reconnectAttempts - 1),
      this.maxBackoff
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => this.connect(), delay);
  }

  /**
   * Check connection status
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Usage Example:
const notificationClient = new NotificationWebSocket('ws://127.0.0.1:8000/ws/notifications/');

notificationClient.on('connect', () => {
  console.log('Connected to notification server');
});

notificationClient.on('message', (notification) => {
  console.log('Received notification:', notification);
  
  // Update UI with notification
  if (notification.notification_type === 'PAYMENT_SUCCESS') {
    showSuccessMessage(notification.message);
  }
});

notificationClient.on('disconnect', (event) => {
  console.log('Disconnected from server');
});

notificationClient.on('error', (event) => {
  console.error('WebSocket error');
});

notificationClient.connect();
```

## React Implementation

### Hook for WebSocket Notifications

```typescript
// hooks/useWebSocketNotifications.ts

import { useEffect, useRef, useCallback, useState } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  source_module: string;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, any>;
}

interface UseWebSocketNotificationsOptions {
  url?: string;
  onNotification?: (notification: Notification) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoConnect?: boolean;
}

export const useWebSocketNotifications = ({
  url = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') +
    '//' + window.location.host + '/ws/notifications/',
  onNotification,
  onConnect,
  onDisconnect,
  autoConnect = true,
}: UseWebSocketNotificationsOptions = {}) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<Notification | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected');
      return;
    }

    try {
      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectCountRef.current = 0;
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data) as Notification;
          
          if (notification.notification_type && notification.notification_type !== 'connection_established') {
            setLastNotification(notification);
            onNotification?.(notification);
          }
        } catch (error) {
          console.error('Failed to parse notification:', error);
        }
      };

      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event);
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        onDisconnect?.();
        wsRef.current = null;

        // Reconnect on abnormal closure (not 1000 or 4001)
        if (event.code !== 1000 && event.code !== 4001) {
          scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      scheduleReconnect();
    }
  }, [url, onConnect, onDisconnect, onNotification]);

  const scheduleReconnect = useCallback(() => {
    const maxAttempts = 5;
    if (reconnectCountRef.current >= maxAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    reconnectCountRef.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectCountRef.current - 1), 30000);

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Reconnecting... (attempt ${reconnectCountRef.current})`);
      connect();
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, autoConnect]);

  return {
    isConnected,
    lastNotification,
    connect,
    disconnect,
  };
};
```

### Bell Icon Component with WebSocket

```typescript
// components/NotificationBell.tsx

import React, { useState } from 'react';
import { FiBell, FiX, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';
import { useWebSocketNotifications } from '../hooks/useWebSocketNotifications';

interface ToastNotification {
  id: string;
  notification: Notification;
  timestamp: number;
}

export const NotificationBell: React.FC = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { isConnected } = useWebSocketNotifications({
    onNotification: (notification) => {
      // Add toast and increment unread count
      const toast: ToastNotification = {
        id: notification.id,
        notification,
        timestamp: Date.now(),
      };

      setToasts(prev => [...prev, toast]);
      setUnreadCount(prev => prev + 1);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== notification.id));
      }, 5000);

      // Play notification sound if available
      playNotificationSound();
    },
    onConnect: () => {
      console.log('Connected to notification server');
    },
    onDisconnect: () => {
      console.log('Disconnected from notification server');
    },
  });

  return (
    <div className="notification-container">
      {/* Connection Indicator */}
      <div className="connection-indicator">
        <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        <span className="status-text">
          {isConnected ? 'Connected' : 'Connecting...'}
        </span>
      </div>

      {/* Bell Icon */}
      <button className="bell-button">
        <FiBell size={24} />
        {unreadCount > 0 && (
          <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <NotificationToast
            key={toast.id}
            notification={toast.notification}
            onDismiss={() => {
              setToasts(prev => prev.filter(t => t.id !== toast.id));
            }}
          />
        ))}
      </div>
    </div>
  );
};

const NotificationToast: React.FC<{
  notification: Notification;
  onDismiss: () => void;
}> = ({ notification, onDismiss }) => {
  const getIcon = () => {
    switch (notification.notification_type) {
      case 'PAYMENT_SUCCESS':
        return <FiCheckCircle className="text-green-500" />;
      case 'PAYMENT_FAILED':
        return <FiXCircle className="text-red-500" />;
      case 'SYSTEM_ALERT':
        return <FiAlertTriangle className="text-yellow-500" />;
      default:
        return <FiBell className="text-blue-500" />;
    }
  };

  return (
    <div className={`toast ${notification.priority.toLowerCase()}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-content">
        <h4 className="toast-title">{notification.title}</h4>
        <p className="toast-message">{notification.message}</p>
      </div>
      <button className="toast-close" onClick={onDismiss}>
        <FiX />
      </button>
    </div>
  );
};

const playNotificationSound = () => {
  // Use Web Audio API or simple audio element
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRkYAAAA...');
    audio.play().catch(err => console.log('Audio play failed:', err));
  } catch (error) {
    console.log('Cannot play notification sound');
  }
};
```

## Hybrid Strategy: WebSocket + REST API Fallback

```typescript
// services/notificationService.ts

class NotificationService {
  private ws: WebSocket | null = null;
  private notifications: Notification[] = [];
  private isWebSocketAvailable = false;

  constructor() {
    this.setupWebSocket();
    this.setupPolling();
  }

  private setupWebSocket() {
    // Try to connect to WebSocket
    try {
      this.ws = new WebSocket(this.getWebSocketUrl());
      
      this.ws.onopen = () => {
        console.log('WebSocket connected - real-time mode active');
        this.isWebSocketAvailable = true;
      };

      this.ws.onmessage = (event) => {
        const notification = JSON.parse(event.data);
        this.handleNotification(notification);
      };

      this.ws.onclose = () => {
        this.isWebSocketAvailable = false;
        console.log('WebSocket closed - falling back to polling');
      };
    } catch (error) {
      console.log('WebSocket unavailable - using REST API polling');
    }
  }

  private setupPolling() {
    // Poll REST API every 10 seconds as fallback
    setInterval(() => {
      if (!this.isWebSocketAvailable) {
        this.pollNotifications();
      }
    }, 10000);
  }

  private async pollNotifications() {
    try {
      const response = await fetch('/api/v1/notifications/');
      const data = await response.json();
      
      // Compare with existing notifications
      const newNotifications = data.results.filter(
        (n: Notification) => !this.notifications.find(existing => existing.id === n.id)
      );

      newNotifications.forEach(notification => {
        this.handleNotification(notification);
      });

      this.notifications = data.results;
    } catch (error) {
      console.error('Failed to poll notifications:', error);
    }
  }

  private handleNotification(notification: Notification) {
    console.log('New notification:', notification);
    // Update UI, play sound, etc.
  }

  private getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/notifications/`;
  }
}

export const notificationService = new NotificationService();
```

## Error Handling & Recovery

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 1000 | Normal closure | Don't reconnect |
| 1001 | Going away | Try to reconnect |
| 1002 | Protocol error | Try to reconnect |
| 1006 | Abnormal closure | Try to reconnect |
| 4001 | Authentication failed | Don't reconnect, redirect to login |
| 4002 | Rate limited | Delay reconnection |

### Production Deployment Checklist

- [ ] WebSocket endpoint configured in Nginx/reverse proxy
- [ ] SSL/TLS certificates installed (use `wss://` in production)
- [ ] Daphne ASGI server running with proper worker count
- [ ] Redis channel layer configured and accessible
- [ ] Firewall rules allow WebSocket connections (port 443 for wss://)
- [ ] CORS origin validators configured in ASGI
- [ ] Client-side reconnection logic implemented
- [ ] Fallback to REST API polling if WebSocket fails
- [ ] Monitor WebSocket connection metrics
- [ ] Test load with multiple concurrent connections

## Summary

1. **Real-time**: WebSocket delivers notifications instantly
2. **Reliable**: Automatic reconnection with exponential backoff
3. **Secure**: Only authenticated users, user-isolated groups
4. **Fault-tolerant**: REST API fallback if WebSocket fails
5. **Scalable**: Redis channel layer supports horizontal scaling
6. **Production-ready**: Works with Daphne, Nginx, Docker

## Support & Debugging

### Check WebSocket Connection in Browser

```javascript
// Open browser console
const ws = new WebSocket('ws://127.0.0.1:8000/ws/notifications/');
ws.onopen = () => console.log('Connected!');
ws.onmessage = e => console.log('Message:', JSON.parse(e.data));
ws.onerror = e => console.error('Error:', e);
```

### Verify Server-Side Logging

```bash
# Check Django logs for WebSocket connection
docker logs -f <django_container>

# Should see: "WebSocket connection established" messages
```

### Monitor Redis Channel Layer

```bash
# Connect to Redis and check channels
redis-cli
> CHANNELS *notifications*
> CHANNEL_NUMPAT  # See pattern subscriptions
```

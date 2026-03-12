import { useCallback, useEffect, useRef, useState } from 'react';
import { Notification } from '../services/notification.service';

interface UseNotificationWebSocketOptions {
  onNotification?: (notification: Notification) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error?: string;
}

const RECONNECT_DELAY_MS = 5000;

const getAuthToken = (): string => {
  const authData = localStorage.getItem('authTokens');
  if (!authData) return '';

  try {
    const tokens = JSON.parse(authData);
    return tokens?.access || '';
  } catch (error) {
    console.error('[WebSocket] Failed to parse auth tokens:', error);
    return '';
  }
};

const resolveBackendOrigin = (): string => {
  const fallbackOrigin = 'http://localhost:8000';
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  if (!apiBaseUrl) {
    return fallbackOrigin;
  }

  try {
    if (/^https?:\/\//i.test(apiBaseUrl)) {
      return new URL(apiBaseUrl).origin;
    }

    if (apiBaseUrl.startsWith('/')) {
      return new URL(apiBaseUrl, window.location.origin).origin;
    }

    return new URL(`http://${apiBaseUrl}`).origin;
  } catch {
    return fallbackOrigin;
  }
};

const buildWebSocketUrl = (): string => {
  const backendOrigin = resolveBackendOrigin();
  const backendUrl = new URL(backendOrigin);
  const wsProtocol = backendUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const token = getAuthToken();

  const wsUrl = new URL('/ws/notifications/', `${wsProtocol}//${backendUrl.host}`);
  if (token) {
    wsUrl.searchParams.set('token', token);
  }

  return wsUrl.toString();
};

export const useNotificationWebSocket = (
  options: UseNotificationWebSocketOptions = {}
) => {
  const {
    onNotification,
    onConnect,
    onDisconnect,
    onError,
    enabled = true,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnectingRef = useRef(false);
  const intentionalCloseRef = useRef(false);
  const enabledRef = useRef(enabled);
  const callbacksRef = useRef({
    onNotification,
    onConnect,
    onDisconnect,
    onError,
  });

  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
  });

  useEffect(() => {
    callbacksRef.current = {
      onNotification,
      onConnect,
      onDisconnect,
      onError,
    };
  }, [onNotification, onConnect, onDisconnect, onError]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabledRef.current) return;

    const existing = wsRef.current;
    if (
      existing &&
      (existing.readyState === WebSocket.OPEN ||
        existing.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (isConnectingRef.current) return;

    clearReconnectTimeout();
    intentionalCloseRef.current = false;
    isConnectingRef.current = true;

    try {
      const ws = new WebSocket(buildWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        isConnectingRef.current = false;
        setStatus({ connected: true, reconnecting: false });
        callbacksRef.current.onConnect?.();

        // Send a ping every 45 s so the connection stays alive through
        // browser idle-connection timeouts and NAT keep-alive windows.
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try { ws.send(JSON.stringify({ type: 'ping' })); } catch { /* ignore */ }
          }
        }, 45000);
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          // Ignore control frames from the server
          if (data?.type === 'connection_established' || data?.type === 'ping' || data?.type === 'pong') {
            return;
          }

          if (data?.id && data?.title) {
            callbacksRef.current.onNotification?.(data as Notification);
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onerror = (error: Event) => {
        setStatus((prev) => ({ ...prev, error: 'Connection error' }));
        callbacksRef.current.onError?.(error);
      };

      ws.onclose = () => {
        isConnectingRef.current = false;
        wsRef.current = null;
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        callbacksRef.current.onDisconnect?.();

        const shouldReconnect = !intentionalCloseRef.current && enabledRef.current;
        setStatus({
          connected: false,
          reconnecting: shouldReconnect,
          error: undefined,
        });

        if (shouldReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY_MS);
        }
      };
    } catch (error) {
      isConnectingRef.current = false;
      wsRef.current = null;
      setStatus({
        connected: false,
        reconnecting: false,
        error: 'Failed to connect',
      });
      console.error('[WebSocket] Failed to create connection:', error);
    }
  }, [clearReconnectTimeout]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    clearReconnectTimeout();

    const ws = wsRef.current;
    wsRef.current = null;
    isConnectingRef.current = false;

    if (
      ws &&
      (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
    ) {
      ws.close();
    }

    setStatus({ connected: false, reconnecting: false, error: undefined });
  }, [clearReconnectTimeout]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }
  }, [enabled, connect, disconnect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    connect,
    disconnect,
  };
};

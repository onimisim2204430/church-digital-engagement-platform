/**
 * Notification Service - REST API client for notifications
 * 
 * Features:
 * - Fetch notifications (paginated)
 * - Fetch unread count
 * - Mark notification as read
 * - Mark all notifications as read
 * - WebSocket NOT handled here (see useNotificationWebSocket hook)
 */

import apiService from './api.service';

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  source_module: string;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
  metadata?: Record<string, any>;
}

export interface NotificationListResponse {
  status: 'success' | 'error';
  count: number;
  unread_count: number;
  results: Notification[];
  next?: string | null;
  previous?: string | null;
}

class NotificationService {
  /**
   * Get all notifications (paginated)
   */
  async getNotifications(page = 1, pageSize = 20): Promise<NotificationListResponse> {
    return apiService.get<NotificationListResponse>(
      `/notifications/?page=${page}&page_size=${pageSize}`
    );
  }

  /**
   * Get unread notifications only
   */
  async getUnreadNotifications(page = 1, pageSize = 20): Promise<NotificationListResponse> {
    return apiService.get<NotificationListResponse>(
      `/notifications/unread/?page=${page}&page_size=${pageSize}`
    );
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await apiService.post(`/notifications/read/${notificationId}/`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await apiService.post('/notifications/read-all/');
  }
}

export const notificationService = new NotificationService();
export default notificationService;

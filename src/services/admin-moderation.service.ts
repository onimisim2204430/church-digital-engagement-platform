/**
 * Admin Moderation Service
 * API calls for audit logs and content reports
 */

import { apiService } from './api.service';

export interface AuditLog {
  id: string;
  user: string | null;
  user_email: string;
  user_name: string;
  action_type: string;
  description: string;
  ip_address: string | null;
  user_agent: string;
  metadata: any;
  created_at: string;
}

export interface Report {
  id: string;
  reporter: string;
  reporter_name: string;
  reporter_email: string;
  content_type: number;
  object_id: string;
  reason: string;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  resolution_notes: string;
  created_at: string;
  updated_at: string;
}

class AdminModerationService {
  /**
   * Get audit logs with filters
   */
  async getAuditLogs(params?: {
    action_type?: string;
    user?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AuditLog[]> {
    return await apiService.get('/admin/moderation/audit-logs/', { params });
  }

  /**
   * Get reports with filters
   */
  async getReports(params?: {
    is_resolved?: boolean;
  }): Promise<Report[]> {
    return await apiService.get('/admin/moderation/reports/', { params });
  }

  /**
   * Resolve a report
   */
  async resolveReport(id: string, resolution_notes?: string): Promise<Report> {
    return await apiService.post(`/admin/moderation/reports/${id}/resolve/`, {
      resolution_notes,
    });
  }
}

export const adminModerationService = new AdminModerationService();

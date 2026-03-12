/**
 * Admin Email Campaign Service
 * API calls for creating and managing email campaigns
 */

import { apiService } from './api.service';

export interface EmailCampaign {
  id: string;
  created_by: string;
  created_by_name: string;
  created_by_email: string;
  subject: string;
  content: string;
  html_content: string;
  send_to_all: boolean;
  send_to_members_only: boolean;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_failed: number;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaignCreate {
  subject: string;
  content: string;
  html_content?: string;
  send_to_all?: boolean;
  send_to_members_only?: boolean;
  scheduled_at?: string;
}

export interface CampaignAnalytics {
  campaign_id: string;
  subject: string;
  status: string;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_failed: number;
  sent_at: string | null;
}

class AdminEmailService {
  /**
   * Get all campaigns with filters
   */
  async getCampaigns(params?: {
    status?: string;
  }): Promise<EmailCampaign[]> {
    return await apiService.get('/admin/email/campaigns/', { params });
  }

  /**
   * Get a single campaign
   */
  async getCampaign(id: string): Promise<EmailCampaign> {
    return await apiService.get(`/admin/email/campaigns/${id}/`);
  }

  /**
   * Create a new campaign
   */
  async createCampaign(data: EmailCampaignCreate): Promise<EmailCampaign> {
    return await apiService.post('/admin/email/campaigns/', data);
  }

  /**
   * Update a campaign
   */
  async updateCampaign(id: string, data: Partial<EmailCampaignCreate>): Promise<EmailCampaign> {
    return await apiService.patch(`/admin/email/campaigns/${id}/`, data);
  }

  /**
   * Send a campaign
   */
  async sendCampaign(id: string): Promise<{ message: string; campaign: EmailCampaign }> {
    return await apiService.post(`/admin/email/campaigns/${id}/send/`);
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(id: string): Promise<CampaignAnalytics> {
    return await apiService.get(`/admin/email/campaigns/${id}/analytics/`);
  }

  /**
   * Get email subscriptions
   */
  async getSubscriptions(params?: {
    is_subscribed?: boolean;
  }): Promise<any[]> {
    return await apiService.get('/admin/email/subscriptions/', { params });
  }
}

export const adminEmailService = new AdminEmailService();

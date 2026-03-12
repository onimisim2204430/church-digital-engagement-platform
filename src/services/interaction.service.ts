/**
 * Interaction Service
 * Handles API calls for comments, questions, and flagged content
 */

import { apiService } from './api.service';

export interface InteractionUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface InteractionPost {
  id: string;
  title: string;
  author: number;
  author_name: string;
}

export interface Interaction {
  id: string;
  post: InteractionPost;
  user: InteractionUser;
  content: string;
  type: 'COMMENT' | 'QUESTION' | 'FLAGGED';
  type_display: string;
  is_question: boolean;
  status: 'OPEN' | 'ANSWERED' | 'CLOSED' | 'PENDING' | 'REVIEWED' | 'ACTIONED';
  status_display: string;
  is_flagged: boolean;
  flagged_by_email?: string;
  flagged_at?: string;
  flag_reason?: string;
  responded_by_email?: string;
  responded_at?: string;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface InteractionDetail extends Interaction {
  parent?: string;
  flagged_by?: InteractionUser;
  responded_by?: InteractionUser;
  is_deleted: boolean;
  replies: Interaction[];
  can_respond: boolean;
}

export interface InteractionStats {
  unanswered_questions: number;
  answered_questions: number;
  flagged_pending: number;
  flagged_reviewed: number;
  total_comments: number;
}

export interface InteractionFilters {
  type?: 'COMMENT' | 'QUESTION' | 'FLAGGED';
  status?: 'OPEN' | 'ANSWERED' | 'CLOSED' | 'PENDING' | 'REVIEWED' | 'ACTIONED';
  is_question?: boolean;
  is_flagged?: boolean;
  post_id?: string;
}

class InteractionService {
  private baseUrl = '/admin/content/interactions';

  /**
   * Get all interactions with optional filters
   */
  async getAll(filters?: InteractionFilters): Promise<{ results: Interaction[]; count: number }> {
    const params = new URLSearchParams();
    
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.is_question !== undefined) params.append('is_question', String(filters.is_question));
    if (filters?.is_flagged !== undefined) params.append('is_flagged', String(filters.is_flagged));
    if (filters?.post_id) params.append('post_id', filters.post_id);
    
    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/?${queryString}` : `${this.baseUrl}/`;
    
    return apiService.get(url);
  }

  /**
   * Get interaction by ID with full details
   */
  async getById(id: string): Promise<InteractionDetail> {
    return apiService.get(`${this.baseUrl}/${id}/`);
  }

  /**
   * Get interaction statistics
   */
  async getStats(): Promise<InteractionStats> {
    return apiService.get(`${this.baseUrl}/stats/`);
  }

  /**
   * Create new interaction (comment or question)
   */
  async create(data: {
    post: string;
    content: string;
    is_question?: boolean;
    parent?: string;
  }): Promise<InteractionDetail> {
    return apiService.post(`${this.baseUrl}/`, data);
  }

  /**
   * Respond to a question
   */
  async respond(id: string, content: string): Promise<InteractionDetail> {
    return apiService.post(`${this.baseUrl}/${id}/respond/`, { content });
  }

  /**
   * Flag an interaction
   */
  async flag(id: string, reason?: string): Promise<{ message: string }> {
    return apiService.post(`${this.baseUrl}/${id}/flag/`, { reason });
  }

  /**
   * Mark flagged interaction as reviewed (admin only)
   */
  async markReviewed(id: string): Promise<Interaction> {
    return apiService.post(`${this.baseUrl}/${id}/mark_reviewed/`);
  }

  /**
   * Hide interaction from public view (admin only)
   */
  async hide(id: string): Promise<Interaction> {
    return apiService.post(`${this.baseUrl}/${id}/hide/`);
  }

  /**
   * Unhide interaction (admin only)
   */
  async unhide(id: string): Promise<Interaction> {
    return apiService.post(`${this.baseUrl}/${id}/unhide/`);
  }

  /**
   * Close interaction
   */
  async close(id: string): Promise<Interaction> {
    return apiService.post(`${this.baseUrl}/${id}/close/`);
  }

  /**
   * Update interaction status or visibility
   */
  async update(id: string, data: { status?: string; is_hidden?: boolean }): Promise<Interaction> {
    return apiService.patch(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Delete interaction (soft delete, admin only)
   */
  async delete(id: string): Promise<void> {
    return apiService.delete(`${this.baseUrl}/${id}/`);
  }

  /**
   * Bulk action on multiple interactions (admin only)
   */
  async bulkAction(ids: string[], action: 'hide' | 'delete' | 'mark_reviewed'): Promise<{ message: string; count: number }> {
    return apiService.post(`${this.baseUrl}/bulk_action/`, { ids, action });
  }
}

const interactionService = new InteractionService();
export default interactionService;

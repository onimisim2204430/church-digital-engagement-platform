/**
 * Admin Interaction Service
 * API calls for moderating comments, reactions, and questions
 */

import { apiService } from './api.service';

export interface Comment {
  id: string;
  post: string;
  user: string;
  user_name: string;
  user_email: string;
  content: string;
  parent: string | null;
  is_flagged: boolean;
  flagged_reason: string;
  replies_count: number;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  post: string | null;
  user: string;
  user_name: string;
  user_email: string;
  subject: string;
  question_text: string;
  answer_text: string;
  answered_by: string | null;
  answered_by_name: string | null;
  answered_at: string | null;
  is_closed: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

class AdminInteractionService {
  /**
   * Get all comments with filters
   */
  async getComments(params?: {
    is_flagged?: boolean;
    post?: string;
  }): Promise<Comment[]> {
    return await apiService.get('/admin/interactions/comments/', { params });
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(id: string): Promise<void> {
    await apiService.delete(`/admin/interactions/comments/${id}/`);
  }

  /**
   * Flag a comment
   */
  async flagComment(id: string, reason: string): Promise<{ message: string }> {
    return await apiService.post(`/admin/interactions/comments/${id}/flag/`, { reason });
  }

  /**
   * Unflag a comment
   */
  async unflagComment(id: string): Promise<{ message: string }> {
    return await apiService.post(`/admin/interactions/comments/${id}/unflag/`);
  }

  /**
   * Get all questions with filters
   */
  async getQuestions(params?: {
    is_closed?: boolean;
    unanswered?: boolean;
  }): Promise<Question[]> {
    return await apiService.get('/admin/interactions/questions/', { params });
  }

  /**
   * Answer a question
   */
  async answerQuestion(
    id: string,
    answer_text: string,
    is_public: boolean = false
  ): Promise<Question> {
    return await apiService.post(`/admin/interactions/questions/${id}/answer/`, {
      answer_text,
      is_public,
    });
  }

  /**
   * Close a question
   */
  async closeQuestion(id: string): Promise<{ message: string }> {
    return await apiService.post(`/admin/interactions/questions/${id}/close/`);
  }
}

export const adminInteractionService = new AdminInteractionService();

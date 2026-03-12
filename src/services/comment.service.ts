/**
 * Comment Service
 * API client for comment operations (public read, authenticated write)
 */
import { apiService } from './api.service';

export interface CommentUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  profile_picture?: string;
}

export interface Comment {
  id: string;
  post: string;
  user: CommentUser;
  content: string;
  parent: string | null;
  is_deleted: boolean;
  is_question: boolean;
  question_status: 'OPEN' | 'ANSWERED' | 'CLOSED';
  answered_by: CommentUser | null;
  answered_at: string | null;
  created_at: string;
  updated_at: string;
  replies: Comment[];
  reply_count: number;
}

export interface CreateCommentData {
  content: string;
  post: string;
  parent?: string;
  is_question?: boolean;
}

class CommentService {
  /**
   * Get all comments for a post (public - no auth required)
   */
  async getPostComments(postId: string): Promise<Comment[]> {
    const response = await apiService.get(`/public/comments/?post_id=${postId}`);
    // Handle both paginated and non-paginated responses
    if (response && Array.isArray(response.results)) {
      return response.results;
    }
    return Array.isArray(response) ? response : [];
  }

  /**
   * Create a new comment (authenticated members only)
   */
  async createComment(data: CreateCommentData): Promise<Comment> {
    return await apiService.post('/comments/', data);
  }

  /**
   * Reply to a comment (authenticated members only)
   */
  async replyToComment(parentId: string, content: string, postId: string, isQuestion?: boolean): Promise<Comment> {
    return await apiService.post(`/comments/${parentId}/reply/`, {
      content,
      post: postId,
      is_question: isQuestion || false
    });
  }

  /**
   * Delete a comment (admin only)
   */
  async deleteComment(commentId: string): Promise<void> {
    await apiService.delete(`/admin/comments/${commentId}/`);
  }

  /**
   * Restore a deleted comment (admin only)
   */
  async restoreComment(commentId: string): Promise<Comment> {
    return await apiService.patch(`/admin/comments/${commentId}/restore/`);
  }

  /**
   * Format comment date for display
   */
  formatCommentDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials(user: CommentUser): string {
    const first = user.first_name?.charAt(0) || '';
    const last = user.last_name?.charAt(0) || '';
    return (first + last).toUpperCase() || user.email.charAt(0).toUpperCase();
  }

  /**
   * Get user full name
   */
  getUserFullName(user: CommentUser): string {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return fullName || user.email.split('@')[0];
  }
}

const commentService = new CommentService();
export default commentService;

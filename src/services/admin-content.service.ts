/**
 * Admin Content Service
 * API calls for content management (posts, sermons, articles)
 */

import { apiService } from './api.service';

export interface Post {
  id: string;
  title: string;
  content: string;
  post_type: 'SERMON' | 'ANNOUNCEMENT' | 'ARTICLE' | 'DEVOTIONAL';
  author: string;
  author_name: string;
  author_email: string;
  is_published: boolean;
  published_at: string | null;
  comments_enabled: boolean;
  reactions_enabled: boolean;
  featured_image?: string;
  video_url?: string;
  audio_url?: string;
  views_count: number;
  comments_count: number;
  reactions_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostCreate {
  title: string;
  content: string;
  post_type: 'SERMON' | 'ANNOUNCEMENT' | 'ARTICLE' | 'DEVOTIONAL';
  comments_enabled?: boolean;
  reactions_enabled?: boolean;
  featured_image?: string;
  video_url?: string;
  audio_url?: string;
}

class AdminContentService {
  /**
   * Get all posts with optional filters
   */
  async getPosts(params?: {
    post_type?: string;
    is_published?: boolean;
    search?: string;
  }): Promise<Post[]> {
    const response = await apiService.get('/admin/content/posts/', { params });
    return response;
  }

  /**
   * Get a single post by ID
   */
  async getPost(id: string): Promise<Post> {
    return await apiService.get(`/admin/content/posts/${id}/`);
  }

  /**
   * Create a new post
   */
  async createPost(data: PostCreate): Promise<Post> {
    return await apiService.post('/admin/content/posts/', data);
  }

  /**
   * Update an existing post
   */
  async updatePost(id: string, data: Partial<PostCreate>): Promise<Post> {
    return await apiService.patch(`/admin/content/posts/${id}/`, data);
  }

  /**
   * Delete a post (soft delete)
   */
  async deletePost(id: string): Promise<void> {
    await apiService.delete(`/admin/content/posts/${id}/`);
  }

  /**
   * Publish or unpublish a post
   */
  async togglePublish(id: string, is_published: boolean): Promise<Post> {
    return await apiService.post(`/admin/content/posts/${id}/publish/`, { is_published });
  }

  /**
   * Toggle comments on a post
   */
  async toggleComments(id: string): Promise<{ comments_enabled: boolean }> {
    return await apiService.patch(`/admin/content/posts/${id}/toggle_comments/`);
  }

  /**
   * Toggle reactions on a post
   */
  async toggleReactions(id: string): Promise<{ reactions_enabled: boolean }> {
    return await apiService.patch(`/admin/content/posts/${id}/toggle_reactions/`);
  }
}

export const adminContentService = new AdminContentService();

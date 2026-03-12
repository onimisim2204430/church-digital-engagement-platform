/**
 * Post Service
 * Handles admin content management API calls
 */

import axios, { AxiosInstance } from 'axios';

const API_URL = 'http://localhost:8000/api/v1/admin/content/posts';

export interface Post {
  id: string;
  title: string;
  content: string;
  // Legacy field - kept for backward compatibility
  post_type: 'SERMON' | 'ARTICLE' | 'ANNOUNCEMENT';
  // New dynamic content type (preferred)
  content_type: string | null;  // UUID of PostContentType
  content_type_name: string;     // Display name
  content_type_slug: string;     // Slug
  author: string;
  author_name: string;
  author_email: string;
  is_published: boolean;
  published_at: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  comments_enabled: boolean;
  reactions_enabled: boolean;
  featured_image?: string;
  video_url?: string;
  audio_url?: string;
  views_count: number;
  comments_count: number;
  reactions_count: number;
  is_deleted?: boolean;
  deleted_at?: string | null;
  // Series relationship
  series?: string | null;  // UUID of Series
  series_order?: number;   // Part number within series
  series_title?: string;   // Display series title
  series_slug?: string;    // Series slug for navigation
  created_at: string;
  updated_at: string;
}

export interface PostCreateData {
  title: string;
  content: string;
  // Use either content_type (new) or post_type (legacy)
  content_type?: string;  // UUID of PostContentType (preferred)
  post_type?: 'SERMON' | 'ARTICLE' | 'ANNOUNCEMENT';  // Legacy fallback
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  published_at?: string | null;
  comments_enabled?: boolean;
  reactions_enabled?: boolean;
  featured_image?: string;
  video_url?: string;
  audio_url?: string;
  // Series relationship
  series?: string | null;  // UUID of Series
  series_order?: number;   // Part number within series
}

export interface PostUpdateData extends Partial<PostCreateData> {}

class PostService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include JWT token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token') || localStorage.getItem('auth_tokens');
        if (token) {
          // If auth_tokens, parse it to get access token
          if (token.startsWith('{')) {
            try {
              const tokens = JSON.parse(token);
              config.headers.Authorization = `Bearer ${tokens.access}`;
            } catch {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } else {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all posts (with optional filters)
   */
  async getAllPosts(filters?: { post_type?: string; is_published?: boolean; search?: string; is_deleted?: boolean }): Promise<Post[]> {
    const params = new URLSearchParams();
    if (filters?.post_type) params.append('post_type', filters.post_type);
    if (filters?.is_published !== undefined) params.append('is_published', String(filters.is_published));
    if (filters?.search) params.append('search', filters.search);
    if (filters?.is_deleted !== undefined) params.append('is_deleted', String(filters.is_deleted));

    const response = await this.api.get(`/?${params.toString()}`);
    
    // Handle both paginated and non-paginated responses
    if (response.data.results !== undefined) {
      return response.data.results;
    }
    
    return Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Get single post by ID
   */
  async getPost(id: string): Promise<Post> {
    const response = await this.api.get(`/${id}/`);
    return response.data;
  }

  /**
   * Create new post
   */
  async createPost(data: PostCreateData): Promise<Post> {
    const response = await this.api.post('/', data);
    return response.data;
  }

  /**
   * Update existing post
   */
  async updatePost(id: string, data: PostUpdateData): Promise<Post> {
    const response = await this.api.patch(`/${id}/`, data);
    return response.data;
  }

  /**
   * Delete post (soft delete)
   */
  async deletePost(id: string): Promise<void> {
    await this.api.delete(`/${id}/`);
  }

  /**
   * Publish a post
   */
  async publishPost(id: string): Promise<Post> {
    const response = await this.api.post(`/${id}/publish/`);
    return response.data.post;
  }

  /**
   * Unpublish a post
   */
  async unpublishPost(id: string): Promise<Post> {
    const response = await this.api.post(`/${id}/unpublish/`);
    return response.data.post;
  }

  /**
   * Toggle comments on a post
   */
  async toggleComments(id: string): Promise<void> {
    await this.api.patch(`/${id}/toggle_comments/`);
  }

  /**
   * Toggle reactions on a post
   */
  async toggleReactions(id: string): Promise<void> {
    await this.api.patch(`/${id}/toggle_reactions/`);
  }

  /**
   * Schedule a post for future publication
   */
  async schedulePost(id: string, publishedAt: string): Promise<Post> {
    const response = await this.api.post(`/${id}/schedule/`, {
      published_at: publishedAt
    });
    return response.data.post;
  }

  /**
   * Cancel scheduled publication
   */
  async cancelSchedule(id: string): Promise<Post> {
    const response = await this.api.post(`/${id}/cancel-schedule/`);
    return response.data.post;
  }

  /**
   * Upload an image file and return the stored URL
   */
  async uploadImage(file: File): Promise<string> {
    const token = localStorage.getItem('access_token') || localStorage.getItem('auth_tokens');
    let authHeader = '';
    if (token) {
      if (token.startsWith('{')) {
        try { authHeader = `Bearer ${JSON.parse(token).access}`; } catch { authHeader = `Bearer ${token}`; }
      } else {
        authHeader = `Bearer ${token}`;
      }
    }
    const formData = new FormData();
    formData.append('image', file);
    const response = await this.api.post('http://localhost:8000/api/v1/admin/content/upload/image/', formData, {
      headers: { 'Content-Type': 'multipart/form-data', Authorization: authHeader },
    });
    return response.data.url;
  }
}

export const postService = new PostService();
export default postService;

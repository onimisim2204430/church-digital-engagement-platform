/**
 * Draft Service
 * Handles auto-save draft functionality for post creation/editing
 * Prevents data loss from browser crashes, network issues, or accidental navigation
 */

import axios, { AxiosInstance } from 'axios';

const API_URL = 'http://localhost:8000/api/v1/admin/content/drafts';

export interface Draft {
  id: string;
  user: string;
  user_name: string;
  user_email: string;
  post: string | null;
  post_title: string | null;
  draft_title: string;
  draft_data: DraftData;
  content_type: string | null;
  content_type_name: string | null;
  version: number;
  is_published_draft: boolean;
  created_at: string;
  last_autosave_at: string;
  preview: string;
  time_since_save: string;
}

export interface DraftData {
  title: string;
  content: string;
  content_type?: string;
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  comments_enabled?: boolean;
  reactions_enabled?: boolean;
  featured_image?: string;
  video_url?: string;
  audio_url?: string;
  is_featured?: boolean;
  featured_priority?: number;
  series?: string | null;
  series_order?: number;
}

export interface DraftCreateData {
  draft_data: DraftData;
  content_type?: string | null;
  post?: string | null;
}

export interface DraftUpdateData {
  draft_data: DraftData;
  content_type?: string | null;
}

export interface DraftSyncData {
  drafts: DraftCreateData[];
}

export interface DraftSyncResponse {
  synced: string[];
  synced_count: number;
  errors: Array<{ index: number; error: string }>;
  error_count: number;
}

class DraftService {
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
   * Get all drafts for current user
   */
  async getAllDrafts(): Promise<Draft[]> {
    try {
      const response = await this.api.get('/');
      return response.data;
    } catch (error) {
      console.error('Error fetching drafts:', error);
      throw error;
    }
  }

  /**
   * Get specific draft by ID
   */
  async getDraft(id: string): Promise<Draft> {
    try {
      const response = await this.api.get(`/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching draft:', error);
      throw error;
    }
  }

  /**
   * Check if draft exists for new post or specific post
   * @param postId - 'new' for new post, UUID for existing post
   */
  async checkDraft(postId: string = 'new'): Promise<Draft | null> {
    try {
      const response = await this.api.get(`/check/${postId}/`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error checking draft:', error);
      throw error;
    }
  }

  /**
   * Create new draft
   */
  async createDraft(data: DraftCreateData): Promise<Draft> {
    try {
      const response = await this.api.post('/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating draft:', error);
      throw error;
    }
  }

  /**
   * Update existing draft (auto-save)
   */
  async updateDraft(id: string, data: DraftUpdateData): Promise<Draft> {
    try {
      const response = await this.api.patch(`/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating draft:', error);
      throw error;
    }
  }

  /**
   * Delete draft
   */
  async deleteDraft(id: string): Promise<void> {
    try {
      await this.api.delete(`/${id}/`);
    } catch (error) {
      console.error('Error deleting draft:', error);
      throw error;
    }
  }

  /**
   * Bulk sync multiple drafts (used for offline sync)
   */
  async syncDrafts(data: DraftSyncData): Promise<DraftSyncResponse> {
    try {
      const response = await this.api.post('/sync/', data);
      return response.data;
    } catch (error) {
      console.error('Error syncing drafts:', error);
      throw error;
    }
  }

  /**
   * Convert draft to published post
   */
  async publishDraft(id: string): Promise<any> {
    try {
      const response = await this.api.post(`/${id}/publish/`);
      return response.data;
    } catch (error) {
      console.error('Error publishing draft:', error);
      throw error;
    }
  }

  /**
   * Admin: Cleanup old drafts
   */
  async cleanupOldDrafts(days: number = 30): Promise<{ deleted_count: number; message: string }> {
    try {
      const response = await this.api.post('/cleanup_old/', { days });
      return response.data;
    } catch (error) {
      console.error('Error cleaning up drafts:', error);
      throw error;
    }
  }
}

const draftService = new DraftService();

export default draftService;

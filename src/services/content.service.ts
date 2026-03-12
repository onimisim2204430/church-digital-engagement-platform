/**
 * Public Content Service
 * Handles public API calls for viewing published content
 * No authentication required
 */

import axios, { AxiosInstance } from 'axios';

const API_URL = 'http://localhost:8000/api/v1/public/posts';
const PUBLIC_API_BASE = 'http://localhost:8000/api/v1/public';

export interface PublicPost {
  id: string;
  title: string;
  content: string;
  post_type: 'SERMON' | 'ARTICLE' | 'ANNOUNCEMENT';
  author_name: string;
  is_published: boolean;
  published_at: string;
  comments_enabled: boolean;
  reactions_enabled: boolean;
  featured_image?: string;
  video_url?: string;
  audio_url?: string;
  views_count: number;
  comments_count: number;
  reactions_count: number;
  created_at: string;
}

export interface PublicPostListItem {
  id: string;
  title: string;
  post_type: string;
  author_name: string;
  published_at: string;
  views_count: number;
  comments_count: number;
  reactions_count: number;
}

export interface ContentType {
  id: string;
  slug: string;
  name: string;
  count: number;
  is_system: boolean;
  sort_order: number;
}

export interface ContentTypesResponse {
  results: ContentType[];
  count: number;
}

class ContentService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get all published posts (with optional filters)
   */
  async getAllPosts(filters?: { type?: string; page?: number }): Promise<PublicPostListItem[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.page) params.append('page', String(filters.page));

    const response = await this.api.get(`/?${params.toString()}`);
    
    // Handle paginated response
    if (response.data && typeof response.data === 'object' && 'results' in response.data) {
      return response.data.results;
    }
    return response.data;
  }

  /**
   * Get single post by ID
   */
  async getPost(id: string): Promise<PublicPost> {
    const response = await this.api.get(`/${id}/`);
    return response.data;
  }

  /**
   * Get all available content types with post counts
   * Fetches from the public API to ensure only enabled types with published posts are shown
   */
  async getContentTypes(): Promise<ContentType[]> {
    try {
      const response = await axios.get(`${PUBLIC_API_BASE}/content-types/`);
      if (response.data && response.data.results) {
        return response.data.results;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch content types:', error);
      return [];
    }
  }

  /**
   * Get excerpt from content (first 150 characters)
   */
  getExcerpt(content: string, length: number = 150): string {
    if (content.length <= length) return content;
    return content.substring(0, length).trim() + '...';
  }
}

export const contentService = new ContentService();
export default contentService;

/**
 * Public Content Service
 * Handles public content API calls (no authentication required)
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1/public';

export interface PublicContentType {
  id: string;
  slug: string;
  name: string;
  count: number;
  is_system: boolean;
  sort_order: number;
}

export interface PublicPost {
  id: string;
  title: string;
  content: string;
  content_type: string | null;
  content_type_name: string;
  content_type_slug: string;
  author: string;
  author_name: string;
  author_email: string;
  published_at: string | null;
  featured_image?: string;
  video_url?: string;
  audio_url?: string;
  views_count: number;
  comments_count: number;
  reactions_count: number;
  comments_enabled?: boolean;
  series_title?: string;
  series_order?: number;
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface PublicPostsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PublicPost[];
}

class PublicContentService {
  /**
   * Get all enabled content types with post counts
   * Public endpoint - no authentication required
   */
  async getContentTypes(): Promise<PublicContentType[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/content-types/`);
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching content types:', error);
      throw error;
    }
  }

  /**
   * Get published posts
   * @param type - Optional content type slug to filter by
   * @param page - Page number (default: 1)
   * @param pageSize - Number of items per page (default: 12)
   * @param category - Optional category to filter by
   */
  async getPosts(type?: string, page: number = 1, pageSize: number = 12, category?: string): Promise<PublicPostsResponse> {
    try {
      const params: any = {
        page,
        page_size: pageSize
      };
      
      if (type) {
        params.type = type;
      }

      if (category) {
        params.category = category;
      }

      const response = await axios.get(`${API_BASE_URL}/posts/`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  }

  /**
   * Get a single post by ID
   */
  async getPostById(id: string): Promise<PublicPost> {
    try {
      const response = await axios.get(`${API_BASE_URL}/posts/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching post:', error);
      throw error;
    }
  }
}

const publicContentService = new PublicContentService();
export default publicContentService;

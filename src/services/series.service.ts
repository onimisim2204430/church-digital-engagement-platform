/**
 * Series Service - Premium Edition
 * Handles series-specific data operations and management
 */
import axios, { AxiosInstance } from 'axios';

const API_URL = 'http://localhost:8000/api/v1/admin/series';
const PUBLIC_API_URL = 'http://localhost:8000/api/v1/public/series';

// Enhanced interfaces for series
export interface SeriesAuthor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
  full_name: string;
}

export type SeriesVisibility = 'PUBLIC' | 'MEMBERS_ONLY' | 'HIDDEN';

export interface SeriesPost {
  id: string;
  title: string;
  excerpt: string;
  published_at: string;
  series_order: number;
  featured_image?: string;
  video_url?: string;
  audio_url?: string;
  views_count: number;
  reactions_count: number;
  comments_count: number;
  post_type: 'SERMON' | 'ANNOUNCEMENT' | 'ARTICLE' | 'DEVOTIONAL';
  
  // Additional properties for compatibility
  content_type_name: string;
  author_name: string;
  is_published: boolean;
  created_at: string;
}

export interface Series {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image?: string;
  
  // Author information
  author: SeriesAuthor;
  author_name?: string;
  author_email?: string;
  
  // Visibility and features
  visibility: 'PUBLIC' | 'MEMBERS_ONLY' | 'HIDDEN';
  is_featured: boolean;
  featured_priority: number;
  
  // Content organization
  posts: SeriesPost[];
  post_count: number;
  published_post_count: number;
  date_range: { start: string; end: string | null } | null;
  
  // Analytics
  total_views: number;
  total_reactions: number;
  total_comments: number;
  average_rating?: number;
  
  // Publishing
  is_active: boolean;
  started_at?: string;
  completed_at?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Computed properties
  duration_estimate?: string;
  completion_percentage?: number;
  last_updated?: string;
}

export interface SeriesDetail extends Series {
  next_part_number: number;
}

export interface SeriesCreateData {
  title: string;
  description?: string;
  cover_image?: string;
  visibility?: SeriesVisibility;
  is_featured?: boolean;
  featured_priority?: number;
}

export interface SeriesUpdateData extends Partial<SeriesCreateData> {}

export interface AddPostToSeriesData {
  post_id: string;
  series_order?: number;
}

export interface RemovePostFromSeriesData {
  post_id: string;
}

export interface ReorderSeriesPostsData {
  post_orders: Array<{
    post_id: string;
    order: number;
  }>;
}

export interface SetFeaturedSeriesData {
  series_ids: string[];
}

export interface CurrentSeriesSpotlight {
  id: number;
  series: Series | null;
  series_id?: string | null;
  section_label: string;
  latest_part_number: number;
  latest_part_status: 'AVAILABLE' | 'COMING_SOON';
  latest_part_label: string;
  description_override: string;
  cta_label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CurrentSeriesSpotlightUpdateData {
  series_id?: string | null;
  section_label?: string;
  latest_part_number?: number;
  latest_part_status?: 'AVAILABLE' | 'COMING_SOON';
  description_override?: string;
  cta_label?: string;
  is_active?: boolean;
}

export const SERIES_VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'MEMBERS_ONLY', label: 'Members Only' },
  { value: 'HIDDEN', label: 'Hidden' },
];

export interface SeriesListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: Series[];
}

export interface SeriesFilters {
  featured?: boolean;
  visibility?: 'PUBLIC' | 'MEMBERS_ONLY';
  author?: string;
  search?: string;
  ordering?: 'title' | 'created_at' | 'featured_priority' | 'total_views';
  page?: number;
  page_size?: number;
}

class SeriesService {
  private api: AxiosInstance;
  private publicApi: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.publicApi = axios.create({
      baseURL: PUBLIC_API_URL,
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
   * Get all series (admin)
   */
  async getAllSeries(filters?: {
    visibility?: string;
    is_featured?: boolean;
    search?: string;
  }): Promise<Series[]> {
    const params = new URLSearchParams();
    if (filters?.visibility) params.append('visibility', filters.visibility);
    if (filters?.is_featured !== undefined) params.append('is_featured', String(filters.is_featured));
    if (filters?.search) params.append('search', filters.search);

    const response = await this.api.get(`/?${params.toString()}`);
    
    // Handle both paginated and non-paginated responses
    if (response.data.results !== undefined) {
      return response.data.results;
    }
    
    return Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Get single series by ID (admin)
   */
  async getSeries(id: string): Promise<SeriesDetail> {
    const response = await this.api.get(`/${id}/`);
    return response.data;
  }

  /**
   * Create new series
   */
  async createSeries(data: SeriesCreateData): Promise<Series> {
    const response = await this.api.post('/', data);
    return response.data;
  }

  /**
   * Update existing series
   */
  async updateSeries(id: string, data: SeriesUpdateData): Promise<Series> {
    const response = await this.api.patch(`/${id}/`, data);
    return response.data;
  }

  /**
   * Delete series (soft delete)
   */
  async deleteSeries(id: string): Promise<void> {
    await this.api.delete(`/${id}/`);
  }

  /**
   * Get all posts in a series
   */
  async getSeriesPosts(id: string): Promise<SeriesPost[]> {
    const response = await this.api.get(`/${id}/posts/`);
    return response.data;
  }

  /**
   * Add a post to a series
   */
  async addPostToSeries(id: string, data: AddPostToSeriesData): Promise<{ message: string; series_order: number }> {
    const response = await this.api.post(`/${id}/add_post/`, data);
    return response.data;
  }

  /**
   * Remove a post from a series
   */
  async removePostFromSeries(id: string, data: RemovePostFromSeriesData): Promise<{ message: string }> {
    const response = await this.api.post(`/${id}/remove_post/`, data);
    return response.data;
  }

  /**
   * Reorder posts in a series
   */
  async reorderSeriesPosts(id: string, data: ReorderSeriesPostsData): Promise<{ message: string }> {
    const response = await this.api.post(`/${id}/reorder/`, data);
    return response.data;
  }

  /**
   * Atomically set exactly 3 featured series for homepage archive.
   */
  async setFeaturedSeriesSelection(data: SetFeaturedSeriesData): Promise<Series[]> {
    const response = await this.api.post('/set-featured/', data);
    if (response.data?.results !== undefined) {
      return response.data.results;
    }
    return Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Get admin current spotlight config.
   */
  async getCurrentSeriesSpotlightAdmin(): Promise<CurrentSeriesSpotlight> {
    const response = await this.api.get('/current-spotlight/');
    return response.data;
  }

  /**
   * Save admin current spotlight config.
   */
  async saveCurrentSeriesSpotlight(data: CurrentSeriesSpotlightUpdateData): Promise<CurrentSeriesSpotlight> {
    const response = await this.api.post('/current-spotlight/', data);
    return response.data;
  }

  // PUBLIC ENDPOINTS

  /**
   * Get public series list
   */
  async getPublicSeries(filters?: {
    visibility?: string;
    is_featured?: boolean;
    search?: string;
  }): Promise<Series[]> {
    const params = new URLSearchParams();
    if (filters?.visibility) params.append('visibility', filters.visibility);
    if (filters?.is_featured !== undefined) params.append('is_featured', String(filters.is_featured));
    if (filters?.search) params.append('search', filters.search);

    const response = await this.publicApi.get(`/?${params.toString()}`);
    
    // Handle both paginated and non-paginated responses
    if (response.data.results !== undefined) {
      return response.data.results;
    }
    
    return Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Get single public series by slug
   */
  async getPublicSeriesBySlug(slug: string): Promise<SeriesDetail> {
    const response = await this.publicApi.get(`/${slug}/`);
    return response.data;
  }

  /**
   * Get featured series for homepage
   */
  async getFeaturedSeries(): Promise<Series[]> {
    const response = await this.publicApi.get('/featured/');
    
    // Handle both paginated and non-paginated responses
    if (response.data.results !== undefined) {
      return response.data.results;
    }
    
    return Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Get public current spotlight config for homepage section.
   */
  async getPublicCurrentSeriesSpotlight(): Promise<CurrentSeriesSpotlight | null> {
    const response = await this.publicApi.get('/current-spotlight/');
    if (!response.data || Object.keys(response.data).length === 0) {
      return null;
    }
    return response.data;
  }
}

const seriesService = new SeriesService();

export default seriesService;

/**
 * Public Series Service - Premium Edition
 * Handles public series data for homepage and series browsing
 */
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1/public';

// Enhanced interfaces for public series
export interface SeriesAuthor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
  full_name: string;
}

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
}

export interface PublicSeries {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image?: string;
  
  // Author information
  author: SeriesAuthor;
  
  // Visibility and features
  visibility: 'PUBLIC' | 'MEMBERS_ONLY' | 'HIDDEN';
  is_featured: boolean;
  featured_priority: number;
  
  // Content organization
  posts: SeriesPost[];
  post_count: number;
  published_post_count: number;
  
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

export interface SeriesListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: PublicSeries[];
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

class PublicSeriesService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/series`,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    }
  });

  /**
   * Get all public series with filtering
   */
  async getSeries(filters: SeriesFilters = {}): Promise<SeriesListResponse> {
    try {
      const params = this.buildQueryParams(filters);
      const response = await this.api.get<SeriesListResponse>('/', { params });
      
      // Enhance each series with computed properties
      const enhancedResults = response.data.results.map(series => this.enhanceSeries(series));
      
      return {
        ...response.data,
        results: enhancedResults
      };
    } catch (error: any) {
      console.error('Series service error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get featured series for homepage
   */
  async getFeaturedSeries(limit: number = 6): Promise<PublicSeries[]> {
    try {
      const response = await this.getSeries({
        featured: true,
        ordering: 'featured_priority',
        page_size: limit
      });
      
      return response.results;
    } catch (error: any) {
      console.error('Featured series error:', error);
      return []; // Graceful degradation
    }
  }

  /**
   * Get trending series based on recent activity
   */
  async getTrendingSeries(limit: number = 8): Promise<PublicSeries[]> {
    try {
      const response = await this.getSeries({
        ordering: 'total_views',
        page_size: limit
      });
      
      return response.results.filter(series => series.total_views > 0);
    } catch (error: any) {
      console.error('Trending series error:', error);
      return [];
    }
  }

  /**
   * Get single series by slug with all posts
   */
  async getSeriesBySlug(slug: string): Promise<PublicSeries> {
    try {
      const response = await this.api.get<PublicSeries>(`/${slug}/`);
      return this.enhanceSeries(response.data);
    } catch (error: any) {
      console.error('Series by slug error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Search series by title and description
   */
  async searchSeries(query: string): Promise<PublicSeries[]> {
    if (!query.trim()) return [];
    
    try {
      const response = await this.getSeries({
        search: query.trim(),
        page_size: 20
      });
      
      return response.results;
    } catch (error: any) {
      console.error('Series search error:', error);
      return [];
    }
  }

  /**
   * Enhance series with computed properties
   */
  private enhanceSeries(series: PublicSeries): PublicSeries {
    const enhanced = { ...series };
    
    // Calculate completion percentage
    if (series.post_count > 0) {
      enhanced.completion_percentage = Math.round((series.published_post_count / series.post_count) * 100);
    }
    
    // Estimate duration based on post count
    if (series.published_post_count > 0) {
      const weeks = Math.ceil(series.published_post_count / 1); // Assuming 1 post per week
      enhanced.duration_estimate = `${weeks} week${weeks !== 1 ? 's' : ''}`;
    }
    
    // Last updated from posts
    if (series.posts && series.posts.length > 0) {
      const latestPost = series.posts.reduce((latest, post) => 
        new Date(post.published_at) > new Date(latest.published_at) ? post : latest
      );
      enhanced.last_updated = latestPost.published_at;
    }
    
    // Ensure author full name
    if (series.author && !series.author.full_name) {
      enhanced.author = {
        ...series.author,
        full_name: `${series.author.first_name} ${series.author.last_name}`.trim()
      };
    }
    
    return enhanced;
  }

  /**
   * Build query parameters for API calls
   */
  private buildQueryParams(filters: SeriesFilters): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (filters.featured !== undefined) params.is_featured = filters.featured;
    if (filters.visibility) params.visibility = filters.visibility;
    if (filters.author) params.author = filters.author;
    if (filters.search) params.search = filters.search;
    if (filters.ordering) params.ordering = filters.ordering;
    if (filters.page) params.page = filters.page;
    if (filters.page_size) params.page_size = filters.page_size;
    
    return params;
  }

  /**
   * Enhanced error handling
   */
  private handleError(error: any): Error {
    if (error.response?.status === 404) {
      return new Error('Series not found');
    }
    
    if (error.response?.status === 403) {
      return new Error('Access denied to this series');
    }
    
    if (error.response?.status >= 500) {
      return new Error('Server error. Please try again later.');
    }
    
    if (error.code === 'ECONNABORTED') {
      return new Error('Request timeout. Please check your internet connection.');
    }
    
    return new Error(error.response?.data?.detail || 'Failed to load series');
  }

  /**
   * Format series duration
   */
  formatDuration(series: PublicSeries): string {
    if (series.duration_estimate) {
      return series.duration_estimate;
    }
    
    if (series.post_count === 1) {
      return '1 post';
    }
    
    return `${series.post_count || 0} posts`;
  }

  /**
   * Format series status
   */
  getSeriesStatus(series: PublicSeries): {
    label: string;
    color: string;
    icon: string;
  } {
    if (series.completed_at) {
      return {
        label: 'Completed',
        color: '#10b981', // Success green
        icon: '✅'
      };
    }
    
    if (series.is_active && series.published_post_count > 0) {
      return {
        label: 'Ongoing',
        color: '#2268f5', // Primary blue
        icon: '🔄'
      };
    }
    
    if (series.published_post_count === 0) {
      return {
        label: 'Coming Soon',
        color: '#f59e0b', // Warning orange
        icon: '🚀'
      };
    }
    
    return {
      label: 'Active',
      color: '#2268f5',
      icon: '▶️'
    };
  }

  /**
   * Get engagement summary
   */
  getEngagementSummary(series: PublicSeries): string {
    const parts: string[] = [];
    
    if (series.total_views > 0) {
      parts.push(`${this.formatNumber(series.total_views)} views`);
    }
    
    if (series.total_reactions > 0) {
      parts.push(`${this.formatNumber(series.total_reactions)} reactions`);
    }
    
    if (series.total_comments > 0) {
      parts.push(`${this.formatNumber(series.total_comments)} comments`);
    }
    
    return parts.join(' • ') || 'No engagement yet';
  }

  /**
   * Format numbers with K/M suffixes
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }

  /**
   * Check if series is new (created within last 2 weeks)
   */
  isNewSeries(series: PublicSeries): boolean {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    return new Date(series.created_at) > twoWeeksAgo;
  }
}

const publicSeriesService = new PublicSeriesService();
export default publicSeriesService;
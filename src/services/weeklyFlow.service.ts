/**
 * Weekly Flow Service
 * Manages weekly event API calls
 */
import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

interface WeeklyEvent {
  id: string;
  day_of_week: number; // 0-6 (0=Monday, 6=Sunday)
  day_of_week_display: string;
  title: string;
  time: string;
  description: string;
  linked_post: string | null;
  linked_post_id: string | null;
  linked_post_title: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

class WeeklyFlowService {
  private api: AxiosInstance;

  constructor() {
    // Create axios instance
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include JWT token for authenticated requests
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token') || localStorage.getItem('auth_tokens');
        if (token) {
          try {
            // If auth_tokens, parse it to get access token
            if (token.startsWith('{')) {
              const tokens = JSON.parse(token);
              if (tokens.access) {
                config.headers.Authorization = `Bearer ${tokens.access}`;
              }
            } else {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } catch (e) {
            console.warn('Error parsing auth token:', e);
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }
  /**
   * Get all weekly events (public)
   */
  async getAll(): Promise<WeeklyEvent[]> {
    const response = await this.api.get('/public/weekly-events/');
    
    // Handle both paginated and non-paginated responses
    if (response.data.results) {
      return response.data.results;
    }
    return response.data;
  }

  /**
   * Create a new weekly event (admin only)
   */
  async create(data: {
    day_of_week: number;
    title: string;
    time: string;
    description?: string;
    linked_post?: string | null;
    sort_order?: number;
  }): Promise<WeeklyEvent> {
    const response = await this.api.post('/admin/content/weekly-events/', data);
    return response.data;
  }

  /**
   * Update a weekly event (admin only)
   */
  async update(id: string, data: Partial<WeeklyEvent>): Promise<WeeklyEvent> {
    const response = await this.api.patch(`/admin/content/weekly-events/${id}/`, data);
    return response.data;
  }

  /**
   * Delete a weekly event (admin only)
   */
  async delete(id: string): Promise<void> {
    await this.api.delete(`/admin/content/weekly-events/${id}/`);
  }

  /**
   * Get all weekly events with caching (client-side)
   */
  async getAllWithCache(): Promise<WeeklyEvent[]> {
    const cacheKey = 'weekly-events:all';
    
    // Try cache first
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }

    // Fetch from API
    const events = await this.getAll();

    // Cache for 24 hours
    try {
      localStorage.setItem(cacheKey, JSON.stringify(events));
    } catch (e) {
      console.warn('Cache write error:', e);
    }

    return events;
  }

  /**
   * Clear cache when events are updated
   */
  clearCache(): void {
    try {
      localStorage.removeItem('weekly-events:all');
    } catch (e) {
      console.warn('Cache clear error:', e);
    }
  }
}

export const weeklyFlowService = new WeeklyFlowService();
export default weeklyFlowService;
export type { WeeklyEvent };

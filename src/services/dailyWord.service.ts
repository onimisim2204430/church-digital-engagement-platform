/**
 * Daily Word Service
 * Manages daily devotional content API calls and caching
 */
import axios, { AxiosInstance } from 'axios';
import { DailyWord, DailyWordConflict, CalendarResponse, DailyWordCreateRequest, DailyWordUpdateRequest } from '../types/dailyWord.types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

class DailyWordService {
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
   * Get today's daily word (public)
   */
  async getToday(): Promise<DailyWord> {
    const response = await this.api.get('/public/daily-words/today/');
    return response.data;
  }

  /**
   * Get daily word for a specific date (public)
   */
  async getByDate(date: string): Promise<DailyWord> {
    // date format: YYYY-MM-DD
    const response = await this.api.get(`/public/daily-words/by-date/${date}/`);
    return response.data;
  }

  /**
   * Get calendar view for a month (public)
   */
  async getCalendar(month: number, year: number): Promise<CalendarResponse> {
    const response = await this.api.get('/public/daily-words/calendar/', {
      params: { month, year }
    });
    return response.data;
  }

  /**
   * Get calendar view for a month (admin - includes drafts)
   */
  async getCalendarAdmin(month: number, year: number): Promise<CalendarResponse> {
    const response = await this.api.get('/admin/content/daily-words/calendar/', {
      params: { month, year }
    });
    return response.data;
  }

  /**
   * Get daily word for a specific date (admin - includes drafts)
   */
  async getByDateAdmin(date: string): Promise<DailyWord> {
    // date format: YYYY-MM-DD
    const response = await this.api.get(`/admin/content/daily-words/by-date/${date}/`);
    return response.data;
  }

  /**
   * Create a new daily word (admin only)
   */
  async create(data: DailyWordCreateRequest): Promise<DailyWord | DailyWordConflict> {
    try {
      const response = await this.api.post('/admin/content/daily-words/', data);
      return response.data;
    } catch (error: any) {
      // Check for conflict response (409)
      if (error.response?.status === 409) {
        return error.response.data;
      }
      throw error;
    }
  }

  /**
   * Update an existing daily word (admin only)
   */
  async update(
    id: string,
    data: DailyWordUpdateRequest
  ): Promise<DailyWord> {
    const response = await this.api.patch(`/admin/content/daily-words/${id}/`, data);
    return response.data;
  }

  /**
   * Delete a daily word (admin only)
   */
  async delete(id: string): Promise<void> {
    await this.api.delete(`/admin/content/daily-words/${id}/`);
  }

  /**
   * Publish a daily word (admin only)
   */
  async publish(id: string): Promise<DailyWord> {
    const response = await this.api.post(`/admin/content/daily-words/${id}/publish/`);
    return response.data;
  }

  /**
   * Get monthly calendar view for admin (admin only)
   */
  async getAdminCalendar(month: number, year: number): Promise<CalendarResponse> {
    const response = await this.api.get('/admin/content/daily-words/calendar/', {
      params: { month, year }
    });
    return response.data;
  }

  /**
   * Get today's word with caching (client-side)
   */
  async getTodayWithCache(): Promise<DailyWord> {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `daily-word:${today}`;
    
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
    const word = await this.getToday();

    // Cache for 6 hours
    try {
      localStorage.setItem(cacheKey, JSON.stringify(word));
    } catch (e) {
      console.warn('Cache write error:', e);
    }

    return word;
  }
}

export const dailyWordService = new DailyWordService();
export default dailyWordService;

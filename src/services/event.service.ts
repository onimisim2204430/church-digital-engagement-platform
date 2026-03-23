import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

export type EventStatus = 'DRAFT' | 'PUBLISHED';
export type EventTimeFilter = 'upcoming' | 'past' | 'all';

export interface SpecialEvent {
  id: string;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string | null;
  location: string;
  banner_image: string | null;
  status: EventStatus;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const emptyPage = <T>(results: T[] = []): PaginatedResponse<T> => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

class EventService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token') || localStorage.getItem('auth_tokens');
        if (token) {
          if (token.startsWith('{')) {
            try {
              const tokens = JSON.parse(token);
              if (tokens.access) {
                config.headers.Authorization = `Bearer ${tokens.access}`;
              }
            } catch {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } else {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  async getPublicEvents(params?: { time?: EventTimeFilter; page?: number }): Promise<PaginatedResponse<SpecialEvent>> {
    const response = await this.api.get('public/events/', {
      params: {
        time: params?.time ?? 'upcoming',
        page: params?.page,
      },
    });

    if (response.data?.results) {
      return response.data as PaginatedResponse<SpecialEvent>;
    }

    if (Array.isArray(response.data)) {
      return emptyPage(response.data as SpecialEvent[]);
    }

    return emptyPage<SpecialEvent>([]);
  }

  async getAdminEvents(params?: { status?: EventStatus | 'ALL'; page?: number }): Promise<PaginatedResponse<SpecialEvent>> {
    const response = await this.api.get('admin/content/events/', {
      params: {
        status: params?.status && params.status !== 'ALL' ? params.status : undefined,
        page: params?.page,
      },
    });

    if (response.data?.results) {
      return response.data as PaginatedResponse<SpecialEvent>;
    }

    if (Array.isArray(response.data)) {
      return emptyPage(response.data as SpecialEvent[]);
    }

    return emptyPage<SpecialEvent>([]);
  }

  async createAdminEvent(payload: FormData): Promise<SpecialEvent> {
    const response = await this.api.post('admin/content/events/', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async updateAdminEvent(eventId: string, payload: FormData): Promise<SpecialEvent> {
    const response = await this.api.patch(`admin/content/events/${eventId}/`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async deleteAdminEvent(eventId: string): Promise<void> {
    await this.api.delete(`admin/content/events/${eventId}/`);
  }
}

export const eventService = new EventService();
export default eventService;

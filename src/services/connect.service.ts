import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

export type ConnectCardType = 'group' | 'serve' | 'event';
export type ConnectStyleVariant =
  | 'featured_group'
  | 'sand_serve'
  | 'standard_group'
  | 'outlined_serve'
  | 'featured_event';

export interface ConnectMinistry {
  id: string;
  title: string;
  slug: string;
  description: string;
  card_type: ConnectCardType;
  style_variant: ConnectStyleVariant;
  category_label: string;
  schedule_label: string;
  location_label: string;
  date_label: string;
  icon_name: string;
  image_url: string;
  cta_label: string;
  cta_url: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

export interface ConnectMinistryPayload {
  title: string;
  slug?: string;
  description: string;
  card_type: ConnectCardType;
  style_variant: ConnectStyleVariant;
  category_label?: string;
  schedule_label?: string;
  location_label?: string;
  date_label?: string;
  icon_name?: string;
  image_url?: string;
  cta_label?: string;
  cta_url?: string;
  is_active?: boolean;
  display_order: number;
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

class ConnectService {
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

  async getPublicConnectMinistries(params?: { card_type?: ConnectCardType }): Promise<PaginatedResponse<ConnectMinistry>> {
    const response = await this.api.get('public/connect-ministries/', {
      params: {
        card_type: params?.card_type,
      },
    });

    if (response.data?.results) {
      return response.data as PaginatedResponse<ConnectMinistry>;
    }

    if (Array.isArray(response.data)) {
      return emptyPage(response.data as ConnectMinistry[]);
    }

    return emptyPage<ConnectMinistry>([]);
  }

  async getAdminConnectMinistries(params?: {
    card_type?: ConnectCardType;
    is_active?: boolean;
  }): Promise<PaginatedResponse<ConnectMinistry>> {
    const response = await this.api.get('admin/content/connect-ministries/', {
      params: {
        card_type: params?.card_type,
        is_active: typeof params?.is_active === 'boolean' ? params.is_active : undefined,
      },
    });

    if (response.data?.results) {
      return response.data as PaginatedResponse<ConnectMinistry>;
    }

    if (Array.isArray(response.data)) {
      return emptyPage(response.data as ConnectMinistry[]);
    }

    return emptyPage<ConnectMinistry>([]);
  }

  async createAdminConnectMinistry(payload: ConnectMinistryPayload): Promise<ConnectMinistry> {
    const response = await this.api.post('admin/content/connect-ministries/', payload);
    return response.data;
  }

  async updateAdminConnectMinistry(id: string, payload: Partial<ConnectMinistryPayload>): Promise<ConnectMinistry> {
    const response = await this.api.patch(`admin/content/connect-ministries/${id}/`, payload);
    return response.data;
  }

  async deleteAdminConnectMinistry(id: string): Promise<void> {
    await this.api.delete(`admin/content/connect-ministries/${id}/`);
  }
}

export const connectService = new ConnectService();
export default connectService;

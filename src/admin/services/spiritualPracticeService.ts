import apiService from '../../services/api.service';

export interface SpiritualPracticeData {
  id?: number;
  title: string;
  slug?: string;
  short_description: string;
  duration_label: string;
  icon_name: string;
  accent_color: 'accent-sage' | 'primary' | 'accent-sand';
  full_content?: string;
  cover_image?: string | File | null;
  audio_url?: string;
  is_active: boolean;
  display_order: number;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

class SpiritualPracticeService {
  private baseUrl = 'admin/content/spiritual-practices';

  async getAll(): Promise<SpiritualPracticeData[]> {
    const response = await apiService.get(this.baseUrl + '/');
    return response.results || response;
  }

  async create(data: Omit<SpiritualPracticeData, 'id'>): Promise<SpiritualPracticeData> {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined || key === 'id') {
        return;
      }

      if (value instanceof File) {
        formData.append(key, value);
      } else {
        formData.append(key, String(value));
      }
    });

    return apiService.post(this.baseUrl + '/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async update(id: number, data: Partial<SpiritualPracticeData>): Promise<SpiritualPracticeData> {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined || key === 'id') {
        return;
      }

      if (key === 'cover_image') {
        if (value instanceof File) {
          formData.append(key, value);
        }
        return;
      }

      formData.append(key, String(value));
    });

    return apiService.patch(`${this.baseUrl}/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  async delete(id: number): Promise<void> {
    await apiService.delete(`${this.baseUrl}/${id}/`);
  }
}

export const spiritualPracticeService = new SpiritualPracticeService();

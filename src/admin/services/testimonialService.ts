import apiService from '../../services/api.service';

export interface TestimonialData {
  id?: number;
  title: string;
  name: string;
  description?: string;
  thumbnail_image: string | File;
  video_file?: string | File | null;
  video_url?: string;
  is_active: boolean;
  display_order: number;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

class TestimonialService {
  private baseUrl = 'admin/content/testimonials';

  async getAll(): Promise<TestimonialData[]> {
    const response = await apiService.get(this.baseUrl + '/');
    return response.results || response;
  }

  async create(data: Omit<TestimonialData, 'id'>): Promise<TestimonialData> {
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

  async update(id: number, data: Partial<TestimonialData>): Promise<TestimonialData> {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined || key === 'id') {
        return;
      }

      if (key === 'thumbnail_image' || key === 'video_file') {
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

export const testimonialService = new TestimonialService();

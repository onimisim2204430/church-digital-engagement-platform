import apiService from './api.service';

export interface PublicSpiritualPractice {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  duration_label: string;
  icon_name: string;
  accent_color: 'accent-sage' | 'primary' | 'accent-sand';
  full_content: string;
  cover_image?: string | null;
  audio_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

class PublicSpiritualPracticeService {
  private baseUrl = 'public/spiritual-practices';

  async getAllActive(): Promise<PublicSpiritualPractice[]> {
    const response = await apiService.get(this.baseUrl + '/');
    return response.results || response;
  }

  async getBySlug(slug: string): Promise<PublicSpiritualPractice> {
    return apiService.get(`${this.baseUrl}/${slug}/`);
  }
}

export const publicSpiritualPracticeService = new PublicSpiritualPracticeService();

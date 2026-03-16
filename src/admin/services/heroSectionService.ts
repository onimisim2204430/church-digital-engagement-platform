import apiService from '../../services/api.service';

export interface HeroSectionData {
  id?: number;
  title: string;
  description: string;
  label: string;
  image: string | File;
  image_alt_text: string;
  button1_label: string;
  button1_url: string;
  button1_icon: string;
  button2_label: string;
  button2_url: string;
  button2_icon: string;
  hero_type: 'featured_sermon' | 'announcement' | 'event';
  is_active: boolean;
  display_order: number;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

class HeroSectionService {
  private baseUrl = 'content/hero-sections';
  private publicBaseUrl = 'public/hero-sections';

  /**
   * Get all hero sections (admin)
   */
  async getAll(): Promise<HeroSectionData[]> {
    try {
      const response = await apiService.get(this.baseUrl);
      return response.results || response;
    } catch (error) {
      console.error('Error fetching hero sections:', error);
      throw error;
    }
  }

  /**
   * Get a specific hero section by ID (admin)
   */
  async getById(id: number): Promise<HeroSectionData> {
    try {
      return await apiService.get(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error(`Error fetching hero section ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get the latest active hero section (public)
   */
  async getLatestPublic(): Promise<HeroSectionData | null> {
    try {
      const response = await apiService.get(this.publicBaseUrl);
      const data = response.results || response;
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching public hero section:', error);
      return null;
    }
  }

  /**
   * Create a new hero section (admin)
   */
  async create(data: Omit<HeroSectionData, 'id'>): Promise<HeroSectionData> {
    try {
      const formData = new FormData();

      // Add all fields to formData
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      });

      return await apiService.post(this.baseUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error) {
      console.error('Error creating hero section:', error);
      throw error;
    }
  }

  /**
   * Update an existing hero section (admin)
   */
  async update(id: number, data: Partial<HeroSectionData>): Promise<HeroSectionData> {
    try {
      const formData = new FormData();

      // Add all fields to formData
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined && key !== 'id') {
          if (value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      });

      return await apiService.patch(`${this.baseUrl}/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (error) {
      console.error(`Error updating hero section ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a hero section (admin)
   */
  async delete(id: number): Promise<void> {
    try {
      await apiService.delete(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error(`Error deleting hero section ${id}:`, error);
      throw error;
    }
  }

  /**
   * Toggle hero section active status
   */
  async toggleActive(id: number, isActive: boolean): Promise<HeroSectionData> {
    return this.update(id, { is_active: isActive });
  }
}

export const heroSectionService = new HeroSectionService();

/**
 * Content Type Service
 * Handles API calls for managing post content types
 */

import { apiService } from './api.service';

export interface ContentType {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_system: boolean;
  is_enabled: boolean;
  sort_order: number;
  posts_count: number;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateContentTypeData {
  slug: string;
  name: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateContentTypeData {
  name?: string;
  description?: string;
  is_enabled?: boolean;
  sort_order?: number;
}

class ContentTypeService {
  /**
   * Get all content types (system + custom)
   */
  async getAll(): Promise<ContentType[]> {
    const response: any = await apiService.get('/admin/content/content-types/');
    return response.results;
  }

  /**
   * Get only enabled content types (for post creation)
   */
  async getEnabled(): Promise<ContentType[]> {
    const response: any = await apiService.get('/admin/content/content-types/enabled/');
    return response.results;
  }

  /**
   * Get a single content type by ID
   */
  async getById(id: string): Promise<ContentType> {
    return await apiService.get(`/admin/content/content-types/${id}/`);
  }

  /**
   * Create a new custom content type (Admin only)
   */
  async create(data: CreateContentTypeData): Promise<ContentType> {
    return await apiService.post('/admin/content/content-types/', data);
  }

  /**
   * Update an existing custom content type (Admin only)
   * System types cannot be updated
   */
  async update(id: string, data: UpdateContentTypeData): Promise<ContentType> {
    return await apiService.patch(`/admin/content/content-types/${id}/`, data);
  }

  /**
   * Delete a custom content type (Admin only)
   * System types and types with posts cannot be deleted
   */
  async delete(id: string): Promise<void> {
    await apiService.delete(`/admin/content/content-types/${id}/`);
  }

  /**
   * Toggle enabled/disabled state for custom content types
   * System types cannot be disabled
   */
  async toggleEnabled(id: string): Promise<ContentType> {
    return await apiService.patch(`/admin/content/content-types/${id}/toggle-enabled/`);
  }
}

const contentTypeService = new ContentTypeService();
export default contentTypeService;

/**
 * Giving Service - API client for giving/seed catalog management
 * 
 * This service handles:
 * - Public listing of active giving items
 * - Admin CRUD operations for giving items
 * - Reordering giving items
 */

import apiService from './api.service';

export type GivingCategory = 'tithe' | 'offering' | 'project' | 'mission' | 'seed' | 'other';
export type GivingVisibility = 'public' | 'members_only' | 'hidden';
export type GivingStatus = 'draft' | 'active' | 'archived';

export interface GivingItem {
  id: string;
  category: GivingCategory;
  title: string;
  description: string;
  icon: string;
  visibility: GivingVisibility;
  status: GivingStatus;
  is_featured: boolean;
  is_recurring_enabled: boolean;
  suggested_amounts: number[];
  goal_amount?: number | null;
  raised_amount: number;
  deadline?: string | null;
  verse?: string;
  cover_image?: string;
  display_order: number;
  total_donations: number;
  donor_count: number;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface CreateGivingItemRequest {
  category: GivingCategory;
  title: string;
  description: string;
  icon?: string;
  visibility?: GivingVisibility;
  status?: GivingStatus;
  is_featured?: boolean;
  is_recurring_enabled?: boolean;
  suggested_amounts?: number[];
  goal_amount?: number | null;
  deadline?: string | null;
  verse?: string;
  cover_image?: string;
  display_order?: number;
}

export interface UpdateGivingItemRequest extends Partial<CreateGivingItemRequest> {}

export interface ReorderItem {
  id: string;
  display_order: number;
}

export interface ReorderRequest {
  items: ReorderItem[];
}

export interface ReorderResponse {
  message: string;
  updated_count: number;
}

interface ApiGivingItem {
  id: string;
  category: string;
  title: string;
  description: string;
  icon: string;
  visibility: string;
  status: string;
  is_featured: boolean;
  is_recurring_enabled: boolean;
  suggested_amounts: number[];
  goal_amount?: number | null;
  raised_amount: number;
  deadline?: string | null;
  verse?: string;
  cover_image?: string;
  display_order: number;
  total_donations: number;
  donor_count: number;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

interface PaginatedGivingResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ApiGivingItem[];
}

const CATEGORY_TO_UI: Record<string, GivingCategory> = {
  Tithes: 'tithe',
  Offerings: 'offering',
  Projects: 'project',
  Fundraising: 'seed',
  tithe: 'tithe',
  offering: 'offering',
  project: 'project',
  mission: 'mission',
  seed: 'seed',
  other: 'other',
};

const VISIBILITY_TO_UI: Record<string, GivingVisibility> = {
  PUBLIC: 'public',
  MEMBERS_ONLY: 'members_only',
  HIDDEN: 'hidden',
  public: 'public',
  members_only: 'members_only',
  hidden: 'hidden',
};

const STATUS_TO_UI: Record<string, GivingStatus> = {
  active: 'active',
  draft: 'draft',
  archived: 'archived',
  paused: 'archived',
  completed: 'archived',
};

const isPaginatedGivingResponse = (value: unknown): value is PaginatedGivingResponse => {
  return Boolean(
    value &&
    typeof value === 'object' &&
    Array.isArray((value as PaginatedGivingResponse).results)
  );
};

const toUiCategory = (value?: string): GivingCategory => CATEGORY_TO_UI[value || ''] || 'other';
const toUiVisibility = (value?: string): GivingVisibility => VISIBILITY_TO_UI[value || ''] || 'public';
const toUiStatus = (value?: string): GivingStatus => STATUS_TO_UI[value || ''] || 'draft';

const toUiMoney = (value?: number | null): number | null => {
  if (value === null || value === undefined) return null;
  return Math.round(value / 100);
};

const toApiMoney = (value?: number | null): number | null => {
  if (value === null || value === undefined) return null;
  return Math.round(value * 100);
};

const mapApiToUi = (item: ApiGivingItem): GivingItem => ({
  ...item,
  category: toUiCategory(item.category),
  visibility: toUiVisibility(item.visibility),
  status: toUiStatus(item.status),
  suggested_amounts: (item.suggested_amounts || []).map(amount => Math.round(amount / 100)),
  goal_amount: toUiMoney(item.goal_amount),
  raised_amount: Math.round((item.raised_amount || 0) / 100),
  total_donations: Math.round((item.total_donations || 0) / 100),
  deadline: item.deadline || null,
});

const mapUiToApi = (data: CreateGivingItemRequest | UpdateGivingItemRequest) => {
  const payload: Record<string, unknown> = {
    ...data,
  };

  if (data.deadline !== undefined) {
    payload.deadline = data.deadline || null;
  }

  if (data.goal_amount !== undefined) {
    payload.goal_amount = toApiMoney(data.goal_amount);
  }

  if (data.suggested_amounts !== undefined) {
    payload.suggested_amounts = (data.suggested_amounts || []).map(amount => Math.round(amount * 100));
  }

  return payload;
};

class GivingService {
  /**
   * Get all giving items (public or admin based on auth)
   * Public: only active + public items
   * Admin: all items
   */
  async list(): Promise<GivingItem[]> {
    const data = await apiService.get<ApiGivingItem[] | PaginatedGivingResponse>('/giving-items/');
    if (Array.isArray(data)) {
      return data.map(mapApiToUi);
    }
    if (isPaginatedGivingResponse(data)) {
      return data.results.map(mapApiToUi);
    }
    return [];
  }

  /**
   * Get a single giving item by ID
   */
  async get(id: string): Promise<GivingItem> {
    const data = await apiService.get<ApiGivingItem>(`/giving-items/${id}/`);
    return mapApiToUi(data);
  }

  /**
   * Create a new giving item (admin only)
   */
  async create(data: CreateGivingItemRequest): Promise<GivingItem> {
    const payload = mapUiToApi(data);
    const created = await apiService.post<ApiGivingItem>('/giving-items/', payload);
    return mapApiToUi(created);
  }

  /**
   * Update an existing giving item (admin only)
   */
  async update(id: string, data: UpdateGivingItemRequest): Promise<GivingItem> {
    const payload = mapUiToApi(data);
    const updated = await apiService.patch<ApiGivingItem>(`/giving-items/${id}/`, payload);
    return mapApiToUi(updated);
  }

  /**
   * Delete a giving item (admin only)
   */
  async delete(id: string): Promise<void> {
    return apiService.delete<void>(`/giving-items/${id}/`);
  }

  /**
   * Reorder giving items (admin only)
   */
  async reorder(items: ReorderItem[]): Promise<ReorderResponse> {
    return apiService.post<ReorderResponse>('/giving-items/reorder/', { items });
  }
}

export const givingService = new GivingService();
export default givingService;

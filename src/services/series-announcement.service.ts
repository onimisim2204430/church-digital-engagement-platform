import { apiService } from './api.service';

export type AnnouncementRequestType = 'ANNOUNCEMENT' | 'NEW_ARTICLE';
export type AnnouncementRequestStatus =
  | 'PENDING_ADMIN_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'DELIVERED'
  | 'FAILED';

export interface SeriesAnnouncementRequest {
  id: string;
  series: string;
  series_title: string;
  created_by: string;
  created_by_name: string;
  approved_by: string | null;
  approved_by_name: string | null;
  related_post: string | null;
  request_type: AnnouncementRequestType;
  title: string;
  message: string;
  status: AnnouncementRequestStatus;
  admin_note: string;
  requested_at: string;
  reviewed_at: string | null;
  delivery_started_at: string | null;
  delivery_completed_at: string | null;
  audience_snapshot_count: number;
  delivered_count: number;
  failed_count: number;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementRequestPayload {
  series: string;
  request_type: AnnouncementRequestType;
  title: string;
  message: string;
  related_post?: string;
}

class SeriesAnnouncementService {
  async list(params?: { status?: AnnouncementRequestStatus }): Promise<SeriesAnnouncementRequest[]> {
    const response = await apiService.get<any>('admin/series/announcement-requests/', { params });
    // DRF may return a paginated object or a flat array
    return response?.results ? response.results : response;
  }

  async create(payload: CreateAnnouncementRequestPayload): Promise<SeriesAnnouncementRequest> {
    return apiService.post<SeriesAnnouncementRequest>('admin/series/announcement-requests/', payload);
  }

  async approve(id: string, adminNote?: string): Promise<SeriesAnnouncementRequest> {
    return apiService.post<SeriesAnnouncementRequest>(`admin/series/announcement-requests/${id}/approve/`, {
      admin_note: adminNote || '',
    });
  }

  async reject(id: string, adminNote?: string): Promise<SeriesAnnouncementRequest> {
    return apiService.post<SeriesAnnouncementRequest>(`admin/series/announcement-requests/${id}/reject/`, {
      admin_note: adminNote || '',
    });
  }
}

const seriesAnnouncementService = new SeriesAnnouncementService();
export default seriesAnnouncementService;

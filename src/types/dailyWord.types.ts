/**
 * Daily Word Types
 * Type definitions for daily devotional content system
 */

export interface DailyWord {
  id: string;
  title: string;
  content: string;
  scripture?: string;
  prayer?: string;
  author: string;
  featured_image?: string;
  scheduled_date: string;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  published_at?: string;
  likes?: number;
  reply_count?: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  content_type?: string;
  tags?: string[];
}

export interface DailyWordConflict {
  has_conflict: boolean;
  message: string;
  existing_post?: {
    id: string;
    title: string;
    author: string;
    scheduled_date: string;
  };
}

export interface CalendarDay {
  day: number;
  is_current_month: boolean;
  has_post: boolean;
  id?: string; // Post ID if post exists for this day
  title?: string;
  content?: string;
  scripture?: string;
  prayer?: string;
  status?: string;
  featured_image?: string;
  author?: string;
}

export interface CalendarResponse {
  month: number;
  year: number;
  days: CalendarDay[];
}

export interface DailyWordCreateRequest {
  title: string;
  content: string;
  scripture?: string;
  prayer?: string;
  scheduled_date: string;
  content_type?: string;
  tags?: string[];
}

export interface DailyWordUpdateRequest {
  title?: string;
  content?: string;
  scripture?: string;
  prayer?: string;
  scheduled_date?: string;
}

export interface WeeklyEvent {
  id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  title: string;
  time: string;
  description?: string;
  linked_post?: DailyWord;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklyEventCreateRequest {
  day_of_week: number;
  title: string;
  time: string;
  description?: string;
  linked_post_id?: string;
}

export interface WeeklyEventUpdateRequest {
  day_of_week?: number;
  title?: string;
  time?: string;
  description?: string;
  linked_post_id?: string;
}

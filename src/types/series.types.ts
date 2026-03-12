/**
 * Series Types
 * TypeScript interfaces for Series feature
 */

export interface SeriesAuthor {
  id: string;
  full_name: string;
  profile_picture: string | null;
}

export interface Series {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image: string | null;
  author: SeriesAuthor;
  author_name: string;
  author_email: string;
  visibility: 'PUBLIC' | 'MEMBERS_ONLY' | 'HIDDEN';
  is_featured: boolean;
  featured_priority: number;
  total_views: number;
  post_count: number;
  published_post_count: number;
  date_range: {
    start: string;
    end: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface SeriesDetail extends Series {
  posts: SeriesPost[];
  next_part_number: number;
}

export interface SeriesPost {
  id: string;
  title: string;
  content_type_name: string;
  author_name: string;
  series_order: number;
  is_published: boolean;
  published_at: string | null;
  views_count: number;
  featured_image: string | null;
  video_url: string | null;
  audio_url: string | null;
  excerpt: string;
  created_at: string;
}

export interface SeriesCreateData {
  title: string;
  description?: string;
  cover_image?: string;
  visibility?: 'PUBLIC' | 'MEMBERS_ONLY' | 'HIDDEN';
  is_featured?: boolean;
  featured_priority?: number;
}

export interface SeriesUpdateData extends Partial<SeriesCreateData> {}

export interface AddPostToSeriesData {
  post_id: string;
  series_order?: number;
}

export interface RemovePostFromSeriesData {
  post_id: string;
}

export interface ReorderSeriesPostsData {
  post_orders: Array<{
    post_id: string;
    order: number;
  }>;
}

export type SeriesVisibility = 'PUBLIC' | 'MEMBERS_ONLY' | 'HIDDEN';

export const SERIES_VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public' },
  { value: 'MEMBERS_ONLY', label: 'Members Only' },
  { value: 'HIDDEN', label: 'Hidden' },
];

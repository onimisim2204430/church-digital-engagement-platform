/**
 * SeriesDetailManager types
 */
import { SeriesDetail, SeriesPost, SERIES_VISIBILITY_OPTIONS } from '../../../../services/series.service';
import { Post } from '../../../../services/post.service';

export type TabKey = 'posts' | 'edit' | 'analytics' | 'resources' | 'settings';

export interface LocationState {
  justCreated?: boolean;
}

export interface EditForm {
  title: string;
  description: string;
  cover_image: string;
  visibility: 'PUBLIC' | 'MEMBERS_ONLY' | 'HIDDEN';
  is_featured: boolean;
  featured_priority: number;
}

export interface Resource {
  id: number;
  name: string;
  type: 'pdf' | 'doc';
  dateAdded: string;
  size: string;
}

export type { SeriesDetail, SeriesPost, Post };
export { SERIES_VISIBILITY_OPTIONS };

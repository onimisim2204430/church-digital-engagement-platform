/**
 * SeriesDetailManager constants
 */
import { Resource } from '../types/series-detail.types';

export const INITIAL_RESOURCES: Resource[] = [
  {
    id: 1,
    name: 'Discussion Guide.pdf',
    type: 'pdf',
    dateAdded: 'Oct 10',
    size: '2.4 MB',
  },
  {
    id: 2,
    name: 'Series_Overview.docx',
    type: 'doc',
    dateAdded: 'Oct 11',
    size: '450 KB',
  },
];

export const EMPTY_EDIT_FORM = {
  title: '',
  description: '',
  cover_image: '',
  visibility: 'PUBLIC' as const,
  is_featured: false,
  featured_priority: 0,
};

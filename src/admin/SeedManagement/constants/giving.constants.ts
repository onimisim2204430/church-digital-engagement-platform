/**
 * Module-level constants for Giving/Seed Manager
 * All static data lifted here — zero allocation on re-render
 */

import type { CategoryOption, VisibilityOption, StatusOption } from '../types/giving.types';

export const MOCK_ITEMS = [
  {
    id: '1', category: 'Tithes', title: 'Weekly Tithe', description: 'Honour God with the first portion of all you receive. Your faithful giving sustains the ministry, staff, and mission of this community.', icon: 'volunteer_activism', visibility: 'PUBLIC', status: 'active', is_featured: true, is_recurring_enabled: true, suggested_amounts: [50, 100, 200, 500], goal_amount: null, raised_amount: 0, deadline: '', verse: '"Bring the full tithe into the storehouse." — Malachi 3:10', cover_image: '', display_order: 1, created_at: '2024-01-15T10:00:00Z', updated_at: '2024-10-01T09:00:00Z', total_donations: 48200, donor_count: 318,
  },
  {
    id: '2', category: 'Offerings', title: 'Worship Offering', description: 'A free-will offering given out of gratitude and love — above and beyond the tithe — to support the work of the Spirit among us.', icon: 'favorite', visibility: 'PUBLIC', status: 'active', is_featured: false, is_recurring_enabled: false, suggested_amounts: [25, 50, 100, 250], goal_amount: null, raised_amount: 0, deadline: '', verse: '', cover_image: '', display_order: 2, created_at: '2024-01-15T10:00:00Z', updated_at: '2024-09-15T14:30:00Z', total_donations: 12300, donor_count: 144,
  },
  {
    id: '3', category: 'Projects', title: 'New Sanctuary Build', description: 'Help us build a permanent home for our growing congregation. Every gift brings us one step closer to a space designed for worship, community, and rest.', icon: 'home', visibility: 'PUBLIC', status: 'active', is_featured: true, is_recurring_enabled: false, suggested_amounts: [100, 250, 500, 1000], goal_amount: 250000, raised_amount: 163400, deadline: '2025-12-31', verse: '', cover_image: '', display_order: 3, created_at: '2024-03-01T10:00:00Z', updated_at: '2024-10-10T11:00:00Z', total_donations: 163400, donor_count: 241,
  },
  {
    id: '4', category: 'Fundraising', title: 'Missions Trip — Kenya', description: 'Support our team as they travel to Nairobi to partner with local churches in community development, medical outreach, and discipleship.', icon: 'public', visibility: 'PUBLIC', status: 'active', is_featured: false, is_recurring_enabled: false, suggested_amounts: [50, 100, 200, 500], goal_amount: 48000, raised_amount: 31500, deadline: '2025-08-01', verse: '', cover_image: '', display_order: 4, created_at: '2024-06-01T10:00:00Z', updated_at: '2024-10-05T16:00:00Z', total_donations: 31500, donor_count: 87,
  },
  {
    id: '5', category: 'Offerings', title: 'Benevolence Fund', description: 'Support families in crisis within our congregation and surrounding community. Funds go directly to food, rent, and emergency relief.', icon: 'groups', visibility: 'PUBLIC', status: 'active', is_featured: false, is_recurring_enabled: true, suggested_amounts: [20, 50, 100, 200], goal_amount: null, raised_amount: 0, deadline: '', verse: '', cover_image: '', display_order: 5, created_at: '2024-01-15T10:00:00Z', updated_at: '2024-08-20T09:00:00Z', total_donations: 8900, donor_count: 92,
  },
  {
    id: '6', category: 'Projects', title: 'Media & Technology', description: 'Fund professional audio-visual equipment, live streaming infrastructure, and digital tools to reach more people online.', icon: 'podcasts', visibility: 'PUBLIC', status: 'active', is_featured: false, is_recurring_enabled: false, suggested_amounts: [50, 100, 250, 500], goal_amount: 35000, raised_amount: 21800, deadline: '2025-03-31', verse: '', cover_image: '', display_order: 6, created_at: '2024-04-01T10:00:00Z', updated_at: '2024-09-28T10:00:00Z', total_donations: 21800, donor_count: 63,
  },
  {
    id: '7', category: 'Fundraising', title: 'Youth Camp Scholarship', description: "Send a young person to summer spiritual retreat. Your gift covers registration, transport, and accommodation for a teen who cannot afford it.", icon: 'nature', visibility: 'PUBLIC', status: 'draft', is_featured: false, is_recurring_enabled: false, suggested_amounts: [25, 50, 100, 250], goal_amount: 15000, raised_amount: 9200, deadline: '2025-06-30', verse: '', cover_image: '', display_order: 7, created_at: '2024-07-01T10:00:00Z', updated_at: '2024-09-01T10:00:00Z', total_donations: 9200, donor_count: 54,
  },
];

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'tithe', label: 'Tithes', icon: 'volunteer_activism', desc: 'Regular firstfruits giving' },
  { value: 'offering', label: 'Offerings', icon: 'favorite', desc: 'Free-will or designated gifts' },
  { value: 'project', label: 'Projects', icon: 'construction', desc: 'Capital & building projects' },
  { value: 'mission', label: 'Missions', icon: 'public', desc: 'Missionary & outreach support' },
  { value: 'seed', label: 'Seed', icon: 'campaign', desc: 'Faith seed offerings' },
  { value: 'other', label: 'Other', icon: 'more_horiz', desc: 'Other giving categories' },
];

export const VISIBILITY_OPTIONS: VisibilityOption[] = [
  { value: 'public', label: 'Public', icon: 'public', desc: 'Visible to all visitors' },
  { value: 'members_only', label: 'Members Only', icon: 'group', desc: 'Authenticated members only' },
  { value: 'hidden', label: 'Hidden', icon: 'visibility_off', desc: 'Not shown anywhere' },
];

export const STATUS_OPTIONS: StatusOption[] = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'draft', label: 'Draft', color: 'slate' },
  { value: 'archived', label: 'Archived', color: 'blue' },
];

export const AVAILABLE_ICONS = [
  'volunteer_activism', 'favorite', 'groups', 'public', 'podcasts', 'nature',
  'home', 'menu_book', 'music_note', 'auto_stories', 'construction', 'campaign',
  'event', 'calendar_today', 'bar_chart', 'analytics', 'trending_up', 'workspace_premium',
  'star', 'check_circle', 'settings', 'lock', 'mail', 'cloud',
];

// Module-level CSS style constants
export const THIN_SCROLLBAR: React.CSSProperties = { scrollbarWidth: 'thin' };

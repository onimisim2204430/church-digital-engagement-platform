/**
 * Dashboard type definitions
 */

export interface ActivityItem {
  id: number;
  user: string;
  action: string;
  location: string;
  time: string;
  icon: string;
}

export interface ContentItem {
  id: number;
  title: string;
  status: 'draft' | 'review' | 'scheduled';
  type: string;
  thumbnail?: string;
  authors?: number;
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface MetricShape {
  label: string;
  value: string;
  change: string;
  changePositive: boolean;
  bars: number[] | null;
  special: string | null;
  loading?: boolean;
  isHidden?: boolean;
  onToggleVisibility?: () => void;
  fullValue?: string;
}

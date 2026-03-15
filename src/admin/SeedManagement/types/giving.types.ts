/**
 * Type definitions for Giving/Seed Manager
 */

export type { GivingItem, CreateGivingItemRequest } from '../../../services/giving.service';

export type GivingCategory = 'tithe' | 'offering' | 'seed' | 'project' | 'mission' | 'other';
export type GivingVisibility = 'public' | 'members_only' | 'hidden';
export type GivingStatus = 'active' | 'draft' | 'completed' | 'archived';

export interface CategoryOption {
  value: GivingCategory;
  label: string;
  icon: string;
  desc: string;
}

export interface VisibilityOption {
  value: GivingVisibility;
  label: string;
  icon: string;
  desc: string;
}

export interface StatusOption {
  value: GivingStatus;
  label: string;
  color: string;
}

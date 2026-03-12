/**
 * Draft Storage Utilities
 * Handles local storage fallback for offline draft saving
 * Syncs with server when connection is restored
 */

import { DraftData, DraftCreateData } from '../services/draft.service';

const DRAFT_STORAGE_KEY_PREFIX = 'church_draft_';
const MAX_LOCAL_DRAFTS = 10;

export interface LocalDraft {
  id: string;
  userId: string;
  postId?: string | null;
  draftData: DraftData;
  contentType?: string | null;
  timestamp: number;
}

/**
 * Generate unique local draft ID
 */
export const generateLocalDraftId = (): string => {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get storage key for user's drafts
 */
const getUserDraftsKey = (userId: string): string => {
  return `${DRAFT_STORAGE_KEY_PREFIX}${userId}`;
};

/**
 * Save draft to local storage
 */
export const saveDraftToLocal = (
  userId: string,
  draftData: DraftData,
  postId?: string | null,
  contentType?: string | null
): LocalDraft => {
  try {
    // Get existing drafts
    const drafts = getLocalDrafts(userId);
    
    // Create new draft or update existing
    let existingIndex = -1;
    if (postId) {
      // Check if draft for this post already exists
      existingIndex = drafts.findIndex(d => d.postId === postId);
    }
    
    const draft: LocalDraft = {
      id: existingIndex >= 0 ? drafts[existingIndex].id : generateLocalDraftId(),
      userId,
      postId,
      draftData,
      contentType,
      timestamp: Date.now(),
    };
    
    if (existingIndex >= 0) {
      // Update existing draft
      drafts[existingIndex] = draft;
    } else {
      // Add new draft
      drafts.unshift(draft);
      
      // Enforce max drafts limit
      if (drafts.length > MAX_LOCAL_DRAFTS) {
        drafts.splice(MAX_LOCAL_DRAFTS);
      }
    }
    
    // Save to localStorage
    const key = getUserDraftsKey(userId);
    localStorage.setItem(key, JSON.stringify(drafts));
    
    return draft;
  } catch (error) {
    console.error('Error saving draft to local storage:', error);
    throw error;
  }
};

/**
 * Get all local drafts for user
 */
export const getLocalDrafts = (userId: string): LocalDraft[] => {
  try {
    const key = getUserDraftsKey(userId);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return [];
    }
    
    const drafts = JSON.parse(stored);
    
    // Filter out old drafts (older than 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return drafts.filter((draft: LocalDraft) => draft.timestamp > thirtyDaysAgo);
  } catch (error) {
    console.error('Error getting local drafts:', error);
    return [];
  }
};

/**
 * Get specific local draft
 */
export const getLocalDraft = (userId: string, draftId: string): LocalDraft | null => {
  try {
    const drafts = getLocalDrafts(userId);
    return drafts.find(d => d.id === draftId) || null;
  } catch (error) {
    console.error('Error getting local draft:', error);
    return null;
  }
};

/**
 * Get local draft for specific post
 */
export const getLocalDraftForPost = (userId: string, postId: string | null = null): LocalDraft | null => {
  try {
    const drafts = getLocalDrafts(userId);
    return drafts.find(d => d.postId === postId) || null;
  } catch (error) {
    console.error('Error getting local draft for post:', error);
    return null;
  }
};

/**
 * Delete local draft
 */
export const deleteLocalDraft = (userId: string, draftId: string): void => {
  try {
    const drafts = getLocalDrafts(userId);
    const filtered = drafts.filter(d => d.id !== draftId);
    
    const key = getUserDraftsKey(userId);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting local draft:', error);
  }
};

/**
 * Clear all local drafts for user
 */
export const clearLocalDrafts = (userId: string): void => {
  try {
    const key = getUserDraftsKey(userId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing local drafts:', error);
  }
};

/**
 * Convert local drafts to API format for syncing
 */
export const prepareLocalDraftsForSync = (userId: string): DraftCreateData[] => {
  try {
    const drafts = getLocalDrafts(userId);
    return drafts.map(draft => ({
      draft_data: draft.draftData,
      content_type: draft.contentType || null,
      post: draft.postId || null,
    }));
  } catch (error) {
    console.error('Error preparing local drafts for sync:', error);
    return [];
  }
};

/**
 * Check if localStorage is available
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get storage usage info
 */
export const getStorageInfo = (userId: string) => {
  try {
    const drafts = getLocalDrafts(userId);
    const key = getUserDraftsKey(userId);
    const stored = localStorage.getItem(key);
    const sizeInBytes = stored ? new Blob([stored]).size : 0;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    
    return {
      count: drafts.length,
      sizeInBytes,
      sizeInKB,
      maxDrafts: MAX_LOCAL_DRAFTS,
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return {
      count: 0,
      sizeInBytes: 0,
      sizeInKB: '0',
      maxDrafts: MAX_LOCAL_DRAFTS,
    };
  }
};

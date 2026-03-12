/**
 * useAutoSave Hook
 * Custom React hook for auto-saving drafts with network detection and local fallback
 * Features:
 * - Auto-save every 30 seconds
 * - Debounced save on typing pause (1 second)
 * - Network status detection
 * - Local storage fallback when offline
 * - Auto-sync when connection restored
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import draftService, { Draft, DraftData } from '../services/draft.service';
import {
  saveDraftToLocal,
  getLocalDraftForPost,
  deleteLocalDraft,
  prepareLocalDraftsForSync,
} from '../utils/draftStorage';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface UseAutoSaveOptions {
  userId: string;
  postId?: string | null;
  enabled?: boolean;
  autoSaveInterval?: number; // milliseconds (default: 30000 = 30s)
  debounceDelay?: number; // milliseconds (default: 1000 = 1s, reduced from 3s)
  initialDraftId?: string | null;
  onSaveSuccess?: (draft: Draft) => void;
  onSaveError?: (error: any) => void;
}

interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  lastSaved: Date | null;
  error: string | null;
  saveDraft: (data: DraftData, contentType?: string | null) => void;
  forceSave: (data: DraftData, contentType?: string | null) => Promise<void>;
  loadDraft: () => Promise<Draft | null>;
  deleteDraft: () => Promise<void>;
  isOnline: boolean;
  currentDraftId: string | null;
  setCurrentDraftId: (draftId: string | null) => void;
}

export const useAutoSave = (options: UseAutoSaveOptions): UseAutoSaveReturn => {
  const {
    userId,
    postId = null,
    enabled = true,
    autoSaveInterval = 30000, // 30 seconds
    debounceDelay = 5000, // 5 seconds (reduced save frequency)
    initialDraftId = null,
    onSaveSuccess,
    onSaveError,
  } = options;

  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(initialDraftId);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<DraftData | null>(null);
  const contentTypeRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);

  /**
   * Detect online/offline status
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setStatus('idle');
      // Try to sync local drafts when coming back online
      syncLocalDrafts();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Sync local drafts to server when connection restored
   */
  const syncLocalDrafts = async () => {
    try {
      const localDrafts = prepareLocalDraftsForSync(userId);
      if (localDrafts.length > 0) {
        await draftService.syncDrafts({ drafts: localDrafts });
        // Clear local storage after successful sync
        // clearLocalDrafts(userId); // Keep for now in case of partial failure
      }
    } catch (error) {
      console.error('Error syncing local drafts:', error);
    }
  };

  /**
   * Save draft (either to server or local storage)
   */
  const saveDraft = useCallback(async (data: DraftData, contentType?: string | null) => {
    console.log('[SAVE] saveDraft function called at:', new Date().toISOString());
    console.log('[SAVE] Current state:');
    console.log('   isSavingRef.current:', isSavingRef.current);
    console.log('   currentDraftId:', currentDraftId);
    console.log('   isOnline:', isOnline);
    console.log('   userId:', userId);
    console.log('   postId:', postId);
    
    // Don't auto-save if no draft has been created yet
    // New behavior: draft is only created on first user interaction
    if (!currentDraftId) {
      console.log('[SAVE] SKIPPED: No draft ID yet (waiting for first user interaction)');
      return;
    }
    
    // Prevent concurrent saves
    if (isSavingRef.current) {
      console.log('[SAVE] BLOCKED: Save already in progress, queuing data');
      pendingDataRef.current = data;
      contentTypeRef.current = contentType || null;
      return;
    }

    try {
      isSavingRef.current = true;
      setStatus('saving');
      setError(null);

      if (isOnline) {
        // Save to server
        if (currentDraftId) {
          // Update existing draft
          console.log('[SAVE] ACTION: Updating existing draft with ID:', currentDraftId);
          console.log('[SAVE] Update payload:', {
            draft_data: {title: data.title, contentLength: data.content?.length},
            content_type: contentType
          });
          
          const updated = await draftService.updateDraft(currentDraftId, {
            draft_data: data,
            content_type: contentType || null,
          });
          
          console.log('[SAVE] SUCCESS: Draft updated');
          console.log('[SAVE] Updated draft response:', updated);
          setLastSaved(new Date(updated.last_autosave_at));
          setStatus('saved');
          onSaveSuccess?.(updated);
        } else {
          // Create new draft
          console.log('[SAVE] ACTION: Creating NEW draft (currentDraftId is null)');
          console.log('[SAVE] Create payload:', {
            draft_data: {title: data.title, contentLength: data.content?.length},
            content_type: contentType,
            post: postId
          });
          
          const created = await draftService.createDraft({
            draft_data: data,
            content_type: contentType || null,
            post: postId || null,
          });
          
          console.log('[SAVE] SUCCESS: Draft created');
          console.log('[SAVE] Created draft ID:', created.id);
          console.log('[SAVE] Created draft response:', created);
          setCurrentDraftId(created.id);
          setLastSaved(new Date(created.last_autosave_at));
          setStatus('saved');
          onSaveSuccess?.(created);
        }
      } else {
        // Save to local storage when offline
        console.log('[SAVE] ACTION: OFFLINE MODE - saving to localStorage');
        saveDraftToLocal(userId, data, postId, contentType);
        setLastSaved(new Date());
        setStatus('offline');
      }
    } catch (err: any) {
      console.error('[SAVE] FAILED: Error saving draft');
      console.error('[SAVE] Error status code:', err.response?.status);
      console.error('[SAVE] Error message:', err.message);
      console.error('[SAVE] Error response data:', err.response?.data);
      console.error('[SAVE] Full error:', err);
      
      // If server save fails, fall back to local storage
      if (isOnline && err.response?.status !== 401) {
        try {
          console.log('[SAVE] FALLBACK: Attempting localStorage backup');
          saveDraftToLocal(userId, data, postId, contentType);
          setLastSaved(new Date());
          setStatus('offline');
          setError('Connection issue - saved locally');
        } catch (localErr) {
          console.error('[SAVE] FALLBACK FAILED:', localErr);
          setStatus('error');
          setError('Failed to save draft');
          onSaveError?.(localErr);
        }
      } else {
        setStatus('error');
        setError(err.response?.data?.detail || 'Failed to save draft');
        onSaveError?.(err);
      }
    } finally {
      isSavingRef.current = false;

      // If there's pending data, save it
      if (pendingDataRef.current) {
        console.log('[SAVE] Processing queued/pending data');
        const pendingData = pendingDataRef.current;
        const pendingContentType = contentTypeRef.current;
        pendingDataRef.current = null;
        contentTypeRef.current = null;
        // Schedule next save
        setTimeout(() => saveDraft(pendingData, pendingContentType), 100);
      }
    }
  }, [userId, postId, isOnline, currentDraftId, onSaveSuccess, onSaveError]);

  /**
   * Debounced save - triggered on typing pause
   */
  const debouncedSave = useCallback(async (data: DraftData, contentType?: string | null): Promise<void> => {
    if (!enabled) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    return new Promise((resolve) => {
      debounceTimerRef.current = setTimeout(async () => {
        await saveDraft(data, contentType);
        resolve();
      }, debounceDelay);
    });
  }, [enabled, debounceDelay, saveDraft]);

  /**
   * Load existing draft
   */
  const loadDraft = useCallback(async (): Promise<Draft | null> => {
    try {
      if (isOnline) {
        // Check server first
        const draft = await draftService.checkDraft(postId || 'new');
        if (draft) {
          setCurrentDraftId(draft.id);
          setLastSaved(new Date(draft.last_autosave_at));
          return draft;
        }
      }

      // Check local storage
      const localDraft = getLocalDraftForPost(userId, postId);
      if (localDraft) {
        // Return in Draft format
        return {
          id: localDraft.id,
          user: userId,
          user_name: '',
          user_email: '',
          post: localDraft.postId || null,
          post_title: null,
          draft_title: localDraft.draftData.title || '',
          draft_data: localDraft.draftData,
          content_type: localDraft.contentType || null,
          content_type_name: null,
          version: 1,
          is_published_draft: false,
          created_at: new Date(localDraft.timestamp).toISOString(),
          last_autosave_at: new Date(localDraft.timestamp).toISOString(),
          preview: '',
          time_since_save: '',
        } as Draft;
      }

      return null;
    } catch (error) {
      console.error('Error loading draft:', error);
      return null;
    }
  }, [userId, postId, isOnline]);

  /**
   * Delete draft
   */
  const deleteDraft = useCallback(async () => {
    try {
      if (currentDraftId) {
        if (isOnline) {
          await draftService.deleteDraft(currentDraftId);
        }
        deleteLocalDraft(userId, currentDraftId);
        setCurrentDraftId(null);
        setLastSaved(null);
        setStatus('idle');
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  }, [userId, currentDraftId, isOnline]);

  /**
   * Setup periodic auto-save
   */
  useEffect(() => {
    if (!enabled) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // Don't set up auto-save if no pending data
    if (!pendingDataRef.current) {
      return;
    }

    // Setup new timer
    autoSaveTimerRef.current = setInterval(() => {
      if (pendingDataRef.current) {
        saveDraft(pendingDataRef.current, contentTypeRef.current);
      }
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [enabled, autoSaveInterval, saveDraft]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, []);

  /**
   * Force immediate save (for manual save button or page unload)
   */
  const forceSave = useCallback(async (data: DraftData, contentType?: string | null) => {
    return await saveDraft(data, contentType);
  }, [saveDraft]);

  return {
    status,
    lastSaved,
    error,
    saveDraft: debouncedSave,
    forceSave, // New: immediate save without debounce
    loadDraft,
    deleteDraft,
    isOnline,
    currentDraftId,
    setCurrentDraftId,
  };
};

/**
 * DraftRecoveryModal Component
 * Appears when user has unsaved drafts and returns to post creation/editing
 * Allows user to restore, discard, or save for later
 */

import React from 'react';
import { Draft } from '../services/draft.service';
import './DraftRecoveryModal.css';

interface DraftRecoveryModalProps {
  draft: Draft;
  onRestore: () => void;
  onDiscard: () => void;
  onSaveForLater: () => void;
  isOpen: boolean;
}

const DraftRecoveryModal: React.FC<DraftRecoveryModalProps> = ({
  draft,
  onRestore,
  onDiscard,
  onSaveForLater,
  isOpen
}) => {
  if (!isOpen) return null;

  const formatTimeSince = (dateString: string): string => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'moments ago';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return `on ${date.toLocaleDateString()}`;
  };

  const getTitle = () => {
    if (draft.draft_data?.title) {
      return draft.draft_data.title;
    }
    if (draft.draft_title) {
      return draft.draft_title;
    }
    if (draft.post_title) {
      return draft.post_title;
    }
    return 'Untitled Draft';
  };

  const getContentPreview = () => {
    if (draft.preview) {
      return draft.preview;
    }
    if (draft.draft_data?.content) {
      // Strip HTML and get first 100 chars
      const text = draft.draft_data.content.replace(/<[^>]*>/g, '');
      return text.substring(0, 100) + (text.length > 100 ? '...' : '');
    }
    return 'No content preview available';
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the backdrop itself, not the modal content
    if (e.target === e.currentTarget) {
      onSaveForLater();
    }
  };

  return (
    <div className="draft-recovery-overlay" onClick={handleBackdropClick}>
      <div className="draft-recovery-modal">
        <div className="draft-recovery-header">
          <div className="draft-recovery-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" fill="#FEF3C7" />
              <path
                d="M24 16v8l4 4"
                stroke="#F59E0B"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="24" cy="24" r="10" stroke="#F59E0B" strokeWidth="2" />
            </svg>
          </div>
          <h2 className="draft-recovery-title">We found an unsaved draft</h2>
          <p className="draft-recovery-subtitle">
            Would you like to continue where you left off?
          </p>
        </div>

        <div className="draft-recovery-content">
          <div className="draft-info">
            <div className="draft-info-row">
              <span className="draft-info-label">Title:</span>
              <span className="draft-info-value">{getTitle()}</span>
            </div>
            <div className="draft-info-row">
              <span className="draft-info-label">Last edited:</span>
              <span className="draft-info-value">{formatTimeSince(draft.last_autosave_at)}</span>
            </div>
            {draft.content_type_name && (
              <div className="draft-info-row">
                <span className="draft-info-label">Type:</span>
                <span className="draft-info-value">{draft.content_type_name}</span>
              </div>
            )}
            <div className="draft-info-row draft-preview-row">
              <span className="draft-info-label">Preview:</span>
              <p className="draft-preview">{getContentPreview()}</p>
            </div>
          </div>
        </div>

        <div className="draft-recovery-actions">
          <button
            className="draft-action-button draft-action-restore"
            onClick={onRestore}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M13 8C13 10.7614 10.7614 13 8 13C5.23858 13 3 10.7614 3 8C3 5.23858 5.23858 3 8 3C9.36694 3 10.5977 3.58203 11.4648 4.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path d="M11 2V5H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Continue Editing
          </button>
          
          <button
            className="draft-action-button draft-action-save"
            onClick={onSaveForLater}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 14H4C3.44772 14 3 13.5523 3 13V3C3 2.44772 3.44772 2 4 2H9L13 6V13C13 13.5523 12.5523 14 12 14Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M5 2V6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Save for Later
          </button>
          
          <button
            className="draft-action-button draft-action-discard"
            onClick={onDiscard}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 4H14M2 4H6M6 4V2.5C6 2.22386 6.22386 2 6.5 2H9.5C9.77614 2 10 2.22386 10 2.5V4M6 4H10M4 4V13C4 13.5523 4.44772 14 5 14H11C11.5523 14 12 13.5523 12 13V4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Start Fresh
          </button>
        </div>

        <div className="draft-recovery-footer">
          <p className="draft-recovery-note">
            💡 Tip: Drafts are automatically saved every 30 seconds while you work
          </p>
        </div>
      </div>
    </div>
  );
};

export default DraftRecoveryModal;

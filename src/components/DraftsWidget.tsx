/**
 * DraftsWidget Component
 * Dashboard widget showing user's recent drafts
 * Provides quick access to continue working on drafts
 */

import React, { useState, useEffect } from 'react';
import draftService, { Draft } from '../services/draft.service';
import { useNavigate } from 'react-router-dom';
import './DraftsWidget.css';

const DraftsWidget: React.FC = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const allDrafts = await draftService.getAllDrafts();
      const draftsArray = Array.isArray(allDrafts) ? allDrafts : [];
      // Show only the 5 most recent
      setDrafts(draftsArray.slice(0, 5));
    } catch (err) {
      console.error('Error loading drafts:', err);
      setError('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = (draft: Draft) => {
    const params = new URLSearchParams({
      view: 'content',
      draftId: draft.id,
    });
    navigate(`/admin?${params.toString()}`);
  };

  const handleDelete = async (draft: Draft, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this draft? This action cannot be undone.')) {
      return;
    }

    try {
      await draftService.deleteDraft(draft.id);
      setDrafts(prev => prev.filter(d => d.id !== draft.id));
    } catch (err) {
      console.error('Error deleting draft:', err);
      alert('Failed to delete draft');
    }
  };

  const formatTimeSince = (dateString: string): string => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    
    return date.toLocaleDateString();
  };

  const getTitle = (draft: Draft): string => {
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

  if (loading) {
    return (
      <div className="drafts-widget">
        <div className="widget-header">
          <h3 className="widget-title">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 4h12M4 8h12M4 12h8M4 16h8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            My Drafts
          </h3>
        </div>
        <div className="widget-body">
          <div className="drafts-loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="drafts-widget">
        <div className="widget-header">
          <h3 className="widget-title">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 4h12M4 8h12M4 12h8M4 16h8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            My Drafts
          </h3>
        </div>
        <div className="widget-body">
          <div className="drafts-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="drafts-widget">
      <div className="widget-header">
        <h3 className="widget-title">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 4h12M4 8h12M4 12h8M4 16h8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          My Drafts
          {drafts.length > 0 && <span className="draft-count">({drafts.length})</span>}
        </h3>
        {drafts.length > 0 && (
          <button 
            className="view-all-link" 
            onClick={() => navigate('/admin?view=content&tab=DRAFTS')}
          >
            View All →
          </button>
        )}
      </div>

      <div className="widget-body">
        {drafts.length === 0 ? (
          <div className="no-drafts">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" fill="#F3F4F6" />
              <path
                d="M16 16h16M16 24h16M16 32h10"
                stroke="#9CA3AF"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <p>No drafts yet</p>
            <span>Your auto-saved work will appear here</span>
          </div>
        ) : (
          <div className="drafts-list">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="draft-item"
                onClick={() => handleContinue(draft)}
              >
                <div className="draft-item-content">
                  <h4 className="draft-item-title">{getTitle(draft)}</h4>
                  <div className="draft-item-meta">
                    {draft.content_type_name && (
                      <span className="draft-type">{draft.content_type_name}</span>
                    )}
                    <span className="draft-time">{formatTimeSince(draft.last_autosave_at)}</span>
                  </div>
                </div>
                <button
                  className="draft-item-delete"
                  onClick={(e) => handleDelete(draft, e)}
                  title="Delete draft"
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
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftsWidget;

/**
 * DraftsManager Page
 * Full page for managing all user drafts
 * Features: search, filter by type, bulk delete, preview
 */

import React, { useState, useEffect } from 'react';
import draftService, { Draft } from '../services/draft.service';
import { useNavigate } from 'react-router-dom';
import './DraftsManager.css';

const DraftsManager: React.FC = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [filteredDrafts, setFilteredDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    loadDrafts();
  }, []);

  useEffect(() => {
    filterDrafts();
  }, [drafts, searchQuery, filterType]);

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const allDrafts = await draftService.getAllDrafts();
      setDrafts(Array.isArray(allDrafts) ? allDrafts : []);
    } catch (err) {
      console.error('Error loading drafts:', err);
      setError('Failed to load drafts');
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterDrafts = () => {
    let filtered = Array.isArray(drafts) ? [...drafts] : [];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(draft => {
        const title = getTitle(draft).toLowerCase();
        const content = draft.preview?.toLowerCase() || '';
        return title.includes(query) || content.includes(query);
      });
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(draft => 
        draft.content_type_name?.toLowerCase() === filterType.toLowerCase()
      );
    }

    setFilteredDrafts(filtered);
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

  const formatTimeSince = (dateString: string): string => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const handleContinue = (draft: Draft) => {
    if (draft.post) {
      navigate(`/admin/content/edit/${draft.post}`);
    } else {
      navigate(`/admin/content/create?draftId=${draft.id}`);
    }
  };

  const handleDelete = async (draftId: string) => {
    if (!window.confirm('Delete this draft? This action cannot be undone.')) {
      return;
    }

    try {
      await draftService.deleteDraft(draftId);
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      setSelectedDrafts(prev => {
        const newSet = new Set(prev);
        newSet.delete(draftId);
        return newSet;
      });
    } catch (err) {
      console.error('Error deleting draft:', err);
      alert('Failed to delete draft');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDrafts.size === 0) {
      return;
    }

    if (!window.confirm(`Delete ${selectedDrafts.size} draft(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedDrafts).map(id => draftService.deleteDraft(id))
      );
      setDrafts(prev => prev.filter(d => !selectedDrafts.has(d.id)));
      setSelectedDrafts(new Set());
    } catch (err) {
      console.error('Error bulk deleting drafts:', err);
      alert('Failed to delete some drafts');
    }
  };

  const toggleSelectDraft = (draftId: string) => {
    setSelectedDrafts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(draftId)) {
        newSet.delete(draftId);
      } else {
        newSet.add(draftId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDrafts.size === filteredDrafts.length) {
      setSelectedDrafts(new Set());
    } else {
      setSelectedDrafts(new Set(filteredDrafts.map(d => d.id)));
    }
  };

  const getUniqueTypes = (): string[] => {
    const types = new Set<string>();
    if (Array.isArray(drafts)) {
      drafts.forEach(draft => {
        if (draft.content_type_name) {
          types.add(draft.content_type_name);
        }
      });
    }
    return Array.from(types).sort();
  };

  if (loading) {
    return (
      <div className="drafts-manager">
        <div className="drafts-manager-loading">
          <div className="spinner"></div>
          <p>Loading drafts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="drafts-manager">
        <div className="drafts-manager-error">
          <p>{error}</p>
          <button onClick={loadDrafts}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="drafts-manager">
      {/* Header */}
      <div className="drafts-manager-header">
        <div>
          <h1 className="page-title">My Drafts</h1>
          <p className="page-subtitle">
            {drafts.length} draft{drafts.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button className="btn-back" onClick={() => navigate('/admin')}>
          ← Back to Dashboard
        </button>
      </div>

      {/* Toolbar */}
      <div className="drafts-toolbar">
        <div className="toolbar-left">
          {/* Search */}
          <div className="search-box">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M12.5 11h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L17.49 16l-4.99-5zm-6 0A4.5 4.5 0 1 1 11 6.5 4.494 4.494 0 0 1 6.5 11z"
                fill="currentColor"
              />
            </svg>
            <input
              type="text"
              placeholder="Search drafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter by type */}
          <select 
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            {getUniqueTypes().map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="toolbar-right">
          {selectedDrafts.size > 0 && (
            <button className="btn-bulk-delete" onClick={handleBulkDelete}>
              Delete Selected ({selectedDrafts.size})
            </button>
          )}
        </div>
      </div>

      {/* Drafts Table */}
      {filteredDrafts.length === 0 ? (
        <div className="no-drafts-message">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" fill="#F3F4F6" />
            <path
              d="M20 20h24M20 28h24M20 36h18M20 44h18"
              stroke="#9CA3AF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <h3>No drafts found</h3>
          <p>
            {searchQuery || filterType !== 'all'
              ? 'Try adjusting your filters'
              : 'Your auto-saved work will appear here'}
          </p>
        </div>
      ) : (
        <div className="drafts-table-container">
          <table className="drafts-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedDrafts.size === filteredDrafts.length && filteredDrafts.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Title</th>
                <th>Type</th>
                <th>Preview</th>
                <th>Last Saved</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrafts.map((draft) => (
                <tr key={draft.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedDrafts.has(draft.id)}
                      onChange={() => toggleSelectDraft(draft.id)}
                    />
                  </td>
                  <td className="draft-title-cell">
                    <strong>{getTitle(draft)}</strong>
                  </td>
                  <td>
                    {draft.content_type_name && (
                      <span className="draft-type-badge">
                        {draft.content_type_name}
                      </span>
                    )}
                  </td>
                  <td className="draft-preview-cell">
                    {draft.preview || 'No content yet'}
                  </td>
                  <td>{formatTimeSince(draft.last_autosave_at)}</td>
                  <td className="draft-actions-cell">
                    <button
                      className="btn-action btn-continue"
                      onClick={() => handleContinue(draft)}
                      title="Continue editing"
                    >
                      Continue
                    </button>
                    <button
                      className="btn-action btn-delete"
                      onClick={() => handleDelete(draft.id)}
                      title="Delete draft"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DraftsManager;

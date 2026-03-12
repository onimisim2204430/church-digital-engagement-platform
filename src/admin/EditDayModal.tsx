/**
 * Edit Day Modal - Modal for editing daily word
 * Opens on calendar date click to edit/create daily word for that date
 */

import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../components/common/Icon';
import { dailyWordService } from '../services/dailyWord.service';
import { useToast } from '../contexts/ToastContext';
import './EditDayModal.css';

interface EditDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSave?: () => void;
}

interface DailyWordData {
  id?: string;
  title: string;
  content: string;
  scripture: string;
  prayer: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
}

const EditDayModal: React.FC<EditDayModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSave,
}) => {
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Daily Word state
  const [dailyWordData, setDailyWordData] = useState<DailyWordData>({
    title: '',
    content: '',
    scripture: '',
    prayer: '',
    status: 'DRAFT',
  });

  const dateObj = new Date(selectedDate);
  const dateDisplay = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Load data on mount
  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen, selectedDate]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load daily word for this date
      try {
        const word = await dailyWordService.getByDateAdmin(selectedDate);
        if (word) {
          setDailyWordData({
            id: word.id,
            title: word.title || '',
            content: word.content || '',
            scripture: word.scripture || '',
            prayer: word.prayer || '',
            status: word.status,
          });
        } else {
          // Reset form for new daily word
          setDailyWordData({
            title: '',
            content: '',
            scripture: '',
            prayer: '',
            status: 'DRAFT',
          });
        }
      } catch (err) {
        console.log('No daily word for this date');
        setDailyWordData({
          title: '',
          content: '',
          scripture: '',
          prayer: '',
          status: 'DRAFT',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Daily Word handlers
  const handleDailyWordChange = (field: keyof DailyWordData, value: string) => {
    setDailyWordData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveDailyWord = async () => {
    if (!dailyWordData.title.trim() || !dailyWordData.content.trim()) {
      showError('Title and content are required');
      return;
    }

    try {
      setSaving(true);

      if (dailyWordData.id) {
        // Update existing
        await dailyWordService.update(dailyWordData.id, dailyWordData);
        showSuccess('Daily word updated!');
      } else {
        // Create new
        const result = await dailyWordService.create({
          ...dailyWordData,
          scheduled_date: selectedDate,
          content_type: 'devotional',
          tags: ['daily-word'],
        });
        if ('id' in result) {
          setDailyWordData((prev) => ({ ...prev, id: result.id }));
          showSuccess('Daily word created!');
        }
      }

      onSave?.();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to save';
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishDailyWord = async () => {
    if (!dailyWordData.id) {
      showError('Please save the word first');
      return;
    }

    try {
      setSaving(true);
      await dailyWordService.publish(dailyWordData.id);
      setDailyWordData((prev) => ({ ...prev, status: 'PUBLISHED' }));
      showSuccess('Daily word published!');
      onSave?.();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to publish';
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDailyWord = async () => {
    if (!dailyWordData.id) return;
    if (!window.confirm('Delete this daily word?')) return;

    try {
      setSaving(true);
      await dailyWordService.delete(dailyWordData.id);
      setDailyWordData({
        title: '',
        content: '',
        scripture: '',
        prayer: '',
        status: 'DRAFT',
      });
      showSuccess('Daily word deleted!');
      onSave?.();
    } catch (err: any) {
      showError('Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isPublished = dailyWordData.status === 'PUBLISHED';

  return (
    <div className="edit-day-modal-overlay">
      <div className="edit-day-modal-content">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <h2 className="modal-title-main">{dateDisplay}</h2>
            <p className="modal-title-sub">Edit daily word for this date</p>
          </div>
          <button onClick={onClose} className="modal-close">
            <Icon name="close" size={20} />
          </button>
        </div>

        {loading ? (
          <div className="modal-loading">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
        ) : (
          <div className="modal-body">
            {/* Status Badge */}
            <div className={`status-badge ${dailyWordData.status.toLowerCase()}`}>
              {dailyWordData.status === 'PUBLISHED' && '✓ '}
              {dailyWordData.status}
            </div>

            {/* Form Fields */}
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                value={dailyWordData.title}
                onChange={(e) =>
                  handleDailyWordChange('title', e.target.value)
                }
                placeholder="Title of the daily word"
                className="form-input"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Content</label>
              <textarea
                value={dailyWordData.content}
                onChange={(e) =>
                  handleDailyWordChange('content', e.target.value)
                }
                placeholder="Share today's spiritual message..."
                className="form-textarea"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Scripture Reference</label>
              <input
                type="text"
                value={dailyWordData.scripture}
                onChange={(e) =>
                  handleDailyWordChange('scripture', e.target.value)
                }
                placeholder="e.g., John 3:16"
                className="form-input"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Prayer (Optional)</label>
              <textarea
                value={dailyWordData.prayer}
                onChange={(e) =>
                  handleDailyWordChange('prayer', e.target.value)
                }
                placeholder="Add a closing prayer..."
                className="form-textarea"
                style={{ minHeight: '60px' }}
                disabled={saving}
              />
            </div>

            {/* Actions */}
            <div className="modal-actions">
              <div className="modal-actions-primary">
                <button
                  onClick={handleSaveDailyWord}
                  disabled={
                    saving ||
                    !dailyWordData.title.trim() ||
                    !dailyWordData.content.trim()
                  }
                  className="modal-btn btn-primary"
                >
                  <Icon name="save" size={14} />
                  {saving ? 'Saving...' : 'Save'}
                </button>

                {dailyWordData.id && (
                  <button
                    onClick={handlePublishDailyWord}
                    disabled={saving}
                    className={`modal-btn ${
                      isPublished ? 'btn-success' : 'btn-primary'
                    }`}
                  >
                    <Icon name={isPublished ? 'check' : 'publish'} size={14} />
                    {isPublished ? 'Published' : 'Publish'}
                  </button>
                )}
              </div>
              {dailyWordData.id && (
                <button
                  onClick={handleDeleteDailyWord}
                  disabled={saving}
                  className="modal-btn btn-danger"
                >
                  <Icon name="delete" size={14} />
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditDayModal;

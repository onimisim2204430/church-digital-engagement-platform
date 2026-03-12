/**
 * Daily Words Administrator - Monthly Calendar View
 * Schedule one spiritual post per day with conflict detection
 */

import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../components/common/Icon';
import { dailyWordService } from '../services/dailyWord.service';
import { DailyWordConflict } from '../types/dailyWord.types';
import { useToast } from '../contexts/ToastContext';
import './DailyWordsPage.css';

interface FormData {
  title: string;
  content: string;
  scripture: string;
  prayer?: string;
}

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  selectedDate: Date | null;
  postId?: string; // ID of the post being edited
  formData: FormData;
}

const DailyWordsPage: React.FC = () => {
  const { success: showSuccess, error: showError } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 3)); // March 3, 2026
  const [calendar, setCalendar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: 'create',
    selectedDate: null,
    formData: { title: '', content: '', scripture: '' },
  });
  const [conflictDialog, setConflictDialog] = useState<DailyWordConflict | null>(null);
  const [saving, setSaving] = useState(false);

  // Load calendar data
  const loadCalendar = useCallback(async () => {
    try {
      setLoading(true);
      const response = await dailyWordService.getCalendar(
        currentDate.getMonth() + 1,
        currentDate.getFullYear()
      );
      setCalendar(response);
      setError(null);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || 'Failed to load calendar. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  // Handle month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Handle day click
  const handleDayClick = (day: number) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const calendarDay = calendar.days.find((d: any) => d.day === day);

    if (calendarDay?.has_post) {
      // Edit existing post
      setModal({
        isOpen: true,
        mode: 'edit',
        selectedDate,
        postId: calendarDay.id,
        formData: {
          title: calendarDay.title || '',
          content: calendarDay.content || '',
          scripture: calendarDay.scripture || '',
          prayer: calendarDay.prayer || '',
        },
      });
    } else {
      // Create new post
      setModal({
        isOpen: true,
        mode: 'create',
        selectedDate,
        formData: { title: '', content: '', scripture: '' },
      });
    }
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setModal((prev) => ({
      ...prev,
      formData: { ...prev.formData, [name]: value },
    }));
  };

  // Handle form submission
  const handleSave = async () => {
    if (!modal.selectedDate || !modal.formData.title.trim() || !modal.formData.content.trim()) {
      showError('Please fill in title and content');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const dateStr = modal.selectedDate.toISOString().split('T')[0];

      if (modal.mode === 'create') {
        await dailyWordService.create({
          title: modal.formData.title,
          content: modal.formData.content,
          scripture: modal.formData.scripture,
          prayer: modal.formData.prayer,
          scheduled_date: dateStr,
          content_type: 'devotional',
          tags: ['daily-word'],
        });
        showSuccess('Daily word created successfully!');
      } else {
        // For edit, use the post ID
        if (!modal.postId) {
          showError('Post ID not found');
          setSaving(false);
          return;
        }
        await dailyWordService.update(modal.postId, {
          title: modal.formData.title,
          content: modal.formData.content,
          scripture: modal.formData.scripture,
          prayer: modal.formData.prayer,
        });
        showSuccess('Daily word updated successfully!');
      }

      setModal((prev) => ({ ...prev, isOpen: false }));
      await loadCalendar();
    } catch (err: any) {
      // Check if it's a conflict error (409)
      if (err.response?.status === 409 && err.response?.data?.has_conflict) {
        setConflictDialog(err.response.data);
      } else {
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to save daily word';
        showError(errorMessage);
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!modal.postId) {
      showError('Post ID not found');
      return;
    }

    if (
      !window.confirm(
        'Are you sure you want to delete this daily word? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await dailyWordService.delete(modal.postId);
      showSuccess('Daily word deleted successfully!');

      setModal((prev) => ({ ...prev, isOpen: false }));
      await loadCalendar();
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to delete daily word';
      showError(errorMessage);
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    if (!modal.postId) {
      showError('Post ID not found');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await dailyWordService.publish(modal.postId);
      showSuccess('Daily word published successfully!');

      setModal((prev) => ({ ...prev, isOpen: false }));
      await loadCalendar();
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to publish daily word';
      showError(errorMessage);
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Handle conflict resolution - replace
  const handleReplaceConflict = async () => {
    if (!modal.selectedDate || !conflictDialog?.existing_post?.id) return;

    try {
      setSaving(true);
      setError(null);
      // Delete existing and create new
      await dailyWordService.delete(conflictDialog.existing_post.id);
      await handleSave();
      showSuccess('Daily word replaced successfully!');
      setConflictDialog(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to replace daily word';
      showError(errorMessage);
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Handle conflict resolution - reschedule
  const handleReschedule = () => {
    if (conflictDialog?.existing_post) {
      // Show the conflicting post's date for rescheduling
      setConflictDialog(null);
      setError(`Please reschedule the existing post "${conflictDialog.existing_post.title}" first`);
    }
  };

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="daily-words-page">
      {/* Header */}
      <div className="daily-words-header">
        <div>
          <h1>Daily Words</h1>
          <p>Schedule one spiritual post per day</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <Icon name="error" size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn-close">
            ×
          </button>
        </div>
      )}

      {/* Calendar Controls */}
      <div className="calendar-controls">
        <button onClick={handlePrevMonth} className="btn-icon" title="Previous month">
          <Icon name="chevron_left" size={20} />
        </button>
        <h2 className="month-title">{monthName}</h2>
        <button onClick={handleNextMonth} className="btn-icon" title="Next month">
          <Icon name="chevron_right" size={20} />
        </button>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="calendar-skeleton">
          {[...Array(42)].map((_, i) => (
            <div key={i} className="skeleton-day" />
          ))}
        </div>
      ) : calendar ? (
        <div className="calendar-grid">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="calendar-day-header">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendar.days.map((day: any) => (
            <button
              key={day.day}
              onClick={() => handleDayClick(day.day)}
              className={`calendar-day ${day.is_current_month ? '' : 'disabled'} ${day.has_post ? 'has-post' : ''}`}
              disabled={!day.is_current_month}
            >
              <div className="day-number">{day.day}</div>
              {day.has_post && (
                <div className="day-content">
                  <div className="day-title" title={day.title}>
                    {day.title}
                  </div>
                  {day.status && (
                    <div className={`day-status status-${day.status.toLowerCase()}`}>
                      {day.status === 'PUBLISHED' ? '✓' : '◯'}
                    </div>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      ) : null}

      {/* Form Modal */}
      {modal.isOpen && modal.selectedDate && (
        <div className="modal-overlay" onClick={() => setModal((prev) => ({ ...prev, isOpen: false }))}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modal.mode === 'create' ? 'New Daily Word' : 'Edit Daily Word'} -{' '}
                {modal.selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h2>
              <button
                className="btn-close"
                onClick={() => setModal((prev) => ({ ...prev, isOpen: false }))}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  id="title"
                  type="text"
                  name="title"
                  value={modal.formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter daily word title"
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="scripture">Scripture Reference</label>
                <input
                  id="scripture"
                  type="text"
                  name="scripture"
                  value={modal.formData.scripture}
                  onChange={handleInputChange}
                  placeholder="e.g., John 3:16"
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="content">Content *</label>
                <textarea
                  id="content"
                  name="content"
                  value={modal.formData.content}
                  onChange={handleInputChange}
                  placeholder="Enter the daily word content..."
                  rows={8}
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label htmlFor="prayer">Prayer (Optional)</label>
                <textarea
                  id="prayer"
                  name="prayer"
                  value={modal.formData.prayer || ''}
                  onChange={handleInputChange}
                  placeholder="Add a prayer to accompany the daily word..."
                  rows={4}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={saving}
              >
                Cancel
              </button>
              {modal.mode === 'edit' && (
                <button
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <Icon name="delete" size={16} />
                  Delete
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : modal.mode === 'create' ? 'Create' : 'Update'}
              </button>
              {modal.mode === 'edit' && (
                <button
                  className="btn btn-success"
                  onClick={handlePublish}
                  disabled={saving}
                >
                  <Icon name="publish" size={16} />
                  Publish Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conflict Dialog */}
      {conflictDialog && (
        <div className="modal-overlay" onClick={() => setConflictDialog(null)}>
          <div className="modal-content modal-conflict" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <Icon name="warning" size={24} className="text-warning" />
                Conflict Detected
              </h2>
            </div>

            <div className="modal-body">
              <p className="conflict-message">{conflictDialog.message}</p>

              <div className="conflict-existing">
                <h3>Existing Post</h3>
                <div className="post-preview">
                  <p className="post-title">{conflictDialog.existing_post?.title}</p>
                  <p className="post-author">By {conflictDialog.existing_post?.author}</p>
                  {conflictDialog.existing_post?.scheduled_date && (
                    <p className="post-date">
                      {new Date(conflictDialog.existing_post.scheduled_date).toLocaleDateString(
                        'en-US',
                        { weekday: 'long', month: 'long', day: 'numeric' }
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div className="conflict-options">
                <p className="text-slate-soft">What would you like to do?</p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setConflictDialog(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btn-warning"
                onClick={handleReschedule}
                disabled={saving}
              >
                Reschedule Existing
              </button>
              <button
                className="btn btn-danger"
                onClick={handleReplaceConflict}
                disabled={saving}
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyWordsPage;

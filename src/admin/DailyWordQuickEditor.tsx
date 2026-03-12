/**
 * Daily Word Quick Editor - Right Sidebar Shortcut
 * Minimal, fast interface to create/update today's daily word
 */

import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../components/common/Icon';
import { dailyWordService } from '../services/dailyWord.service';
import { useToast } from '../contexts/ToastContext';
import DailyWordCalendarModal from './DailyWordCalendarModal';

interface QuickEditorState {
  title: string;
  content: string;
  scripture: string;
  prayer: string;
  postId?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED';
}

const DailyWordQuickEditor: React.FC = () => {
  const { success: showSuccess, error: showError } = useToast();
  const todayDateStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState<QuickEditorState>({
    title: '',
    content: '',
    scripture: '',
    prayer: '',
    status: 'DRAFT',
  });
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Load word for selected date
  const loadWord = useCallback(async (dateStr: string) => {
    try {
      setLoading(true);
      const word = await dailyWordService.getByDate(dateStr);
      if (word) {
        setFormData({
          title: word.title || '',
          content: word.content || '',
          scripture: word.scripture || '',
          prayer: word.prayer || '',
          postId: word.id,
          status: word.status,
        });
      } else {
        // No word for this date - reset form
        setFormData({
          title: '',
          content: '',
          scripture: '',
          prayer: '',
          status: 'DRAFT',
        });
      }
    } catch (err) {
      console.log('No daily word for this date yet');
      setFormData({
        title: '',
        content: '',
        scripture: '',
        prayer: '',
        status: 'DRAFT',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load word on mount and when date changes
  useEffect(() => {
    loadWord(selectedDate);
  }, [selectedDate, loadWord]);

  const handleInputChange = (field: keyof QuickEditorState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      showError('Title and content are required');
      return;
    }

    try {
      setSaving(true);

      if (formData.postId) {
        // Update existing
        await dailyWordService.update(formData.postId, {
          title: formData.title,
          content: formData.content,
          scripture: formData.scripture,
          prayer: formData.prayer,
        });
        showSuccess('Daily word updated!');
      } else {
        // Create new
        const result = await dailyWordService.create({
          title: formData.title,
          content: formData.content,
          scripture: formData.scripture,
          prayer: formData.prayer,
          scheduled_date: selectedDate,
          content_type: 'devotional',
          tags: ['daily-word'],
        });

        if ('id' in result) {
          setFormData((prev) => ({ ...prev, postId: result.id }));
          showSuccess('Daily word created!');
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to save';
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!formData.postId) {
      showError('Please save the word first before publishing');
      return;
    }

    try {
      setSaving(true);
      await dailyWordService.publish(formData.postId);
      setFormData((prev) => ({ ...prev, status: 'PUBLISHED' }));
      showSuccess('Daily word published! 🎉');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to publish';
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    // Just reset form when moving to a new date
    setFormData({
      title: '',
      content: '',
      scripture: '',
      prayer: '',
      status: 'DRAFT',
    });
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4 border-b border-border-light dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const isPublished = formData.status === 'PUBLISHED';

  return (
    <div className="p-4 space-y-4 border-b border-border-light dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-deep dark:text-slate-100">App: Daily Word</h2>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
              isPublished
                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
            }`}
          >
            {isPublished ? '✓ Published' : 'Draft'}
          </span>
          <button
            onClick={() => setShowFull(!showFull)}
            className="text-slate-soft dark:text-slate-400 hover:text-primary transition-colors"
            title={showFull ? 'Collapse' : 'Expand'}
          >
            <Icon name={showFull ? 'unfold_less' : 'unfold_more'} size={16} />
          </button>
        </div>
      </div>

      {/* Date with Calendar Picker */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-deep dark:text-slate-100">
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        <button
          onClick={() => setShowCalendar(true)}
          className="p-1 text-slate-soft dark:text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
          title="Select date"
        >
          <Icon name="calendar_month" size={16} />
        </button>
      </div>

      {/* Form Container */}
      <div className="rounded-lg border border-border-light dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3 space-y-3">
        {/* Title Input */}
        {showFull && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-soft dark:text-slate-400 uppercase">Title</label>
            <input
              type="text"
              placeholder="Today's encouragement..."
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-border-light dark:border-slate-600 dark:text-slate-200 rounded px-2 py-1.5 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={saving}
            />
          </div>
        )}

        {/* Content Textarea */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-soft dark:text-slate-400 uppercase">
            {showFull ? 'Content' : 'Enter today\'s encouragement...'}
          </label>
          <textarea
            placeholder="Share today's spiritual message..."
            value={formData.content}
            onChange={(e) => handleInputChange('content', e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-border-light dark:border-slate-600 dark:text-slate-200 rounded px-2 py-1.5 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            style={{ minHeight: showFull ? '120px' : '80px' }}
            disabled={saving}
          />
        </div>

        {/* Scripture & Prayer (visible in expanded mode) */}
        {showFull && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-soft dark:text-slate-400 uppercase">Scripture Reference</label>
              <input
                type="text"
                placeholder="e.g., John 3:16"
                value={formData.scripture}
                onChange={(e) => handleInputChange('scripture', e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-border-light dark:border-slate-600 dark:text-slate-200 rounded px-2 py-1.5 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={saving}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-soft dark:text-slate-400 uppercase">Prayer (Optional)</label>
              <textarea
                placeholder="Add a closing prayer..."
                value={formData.prayer}
                onChange={(e) => handleInputChange('prayer', e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-border-light dark:border-slate-600 dark:text-slate-200 rounded px-2 py-1.5 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                style={{ minHeight: '60px' }}
                disabled={saving}
              />
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700 gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => setShowFull(!showFull)}
              className="text-slate-soft dark:text-slate-400 hover:text-primary transition-colors p-1"
              title="Expand/Collapse"
            >
              <Icon name={showFull ? 'minimize_2' : 'maximize_2'} size={14} />
            </button>
            {formData.postId && (
              <button
                onClick={handleClear}
                className="text-slate-soft dark:text-slate-400 hover:text-rose-500 transition-colors p-1"
                title="Clear"
                disabled={saving}
              >
                <Icon name="close" size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !formData.title.trim() || !formData.content.trim()}
              className="rounded bg-slate-200 dark:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={handlePublish}
              disabled={saving || !formData.postId}
              className={`rounded px-3 py-1.5 text-xs font-bold text-white uppercase transition-colors ${
                isPublished
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-primary hover:bg-primary/90'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={formData.postId ? 'Publish' : 'Save first'}
            >
              {saving ? 'Publishing...' : isPublished ? '✓ Published' : 'Publish'}
            </button>
          </div>
        </div>

        {/* Word Count */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {formData.content.length} characters
          </span>
          <a
            href="/admin/weekly-flow"
            className="text-xs font-bold text-primary hover:underline"
          >
            View More →
          </a>
        </div>
      </div>

      {/* Calendar Modal */}
      <DailyWordCalendarModal
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        onSelectDate={handleDateSelect}
        currentDate={selectedDate}
      />
    </div>
  );
};

export default DailyWordQuickEditor;

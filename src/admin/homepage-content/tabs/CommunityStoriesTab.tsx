import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../../../components/common/Icon';
import TestimonialModal from '../../components/TestimonialModal';
import { testimonialService, type TestimonialData } from '../../services/testimonialService';

const MAX_SELECTED_STORIES = 2;

const CommunityStoriesTab: React.FC = () => {
  const [stories, setStories] = useState<TestimonialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<TestimonialData | null>(null);
  const [error, setError] = useState<string>('');

  const loadStories = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await testimonialService.getAll();
      setStories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load testimonials', err);
      setError('Could not load community stories.');
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const selectedCount = stories.filter((s) => s.is_active).length;

  const openCreate = () => { setSelected(null); setModalOpen(true); };
  const openEdit = (item: TestimonialData) => { setSelected(item); setModalOpen(true); };

  const handleDelete = async (item: TestimonialData) => {
    if (!item.id) return;
    if (!window.confirm(`Delete "${item.name} — ${item.title}"?`)) return;
    try {
      await testimonialService.delete(item.id);
      await loadStories();
    } catch (err) {
      console.error('Failed to delete testimonial', err);
      window.alert('Failed to delete story.');
    }
  };

  const handleSave = async (data: TestimonialData) => {
    try {
      setSaving(true);
      const isExistingSelected = Boolean(
        data.id && stories.find((s) => s.id === data.id)?.is_active,
      );
      if (data.is_active && !isExistingSelected && selectedCount >= MAX_SELECTED_STORIES) {
        window.alert(`Only ${MAX_SELECTED_STORIES} stories can be selected for public display.`);
        return;
      }
      if (data.id) {
        await testimonialService.update(data.id, data);
      } else {
        const { id, created_at, updated_at, ...createData } = data;
        await testimonialService.create(createData);
      }
      setModalOpen(false);
      setSelected(null);
      await loadStories();
    } catch (err: any) {
      console.error('Failed to save testimonial', err?.response?.data || err);
      const serverError = err?.response?.data?.is_active;
      if (Array.isArray(serverError) && serverError.length > 0) {
        window.alert(serverError[0]);
      } else if (typeof serverError === 'string') {
        window.alert(serverError);
      } else {
        window.alert('Failed to save story. Check required fields and media input.');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleSelected = async (item: TestimonialData) => {
    if (!item.id) return;
    if (!item.is_active && selectedCount >= MAX_SELECTED_STORIES) {
      window.alert(`Only ${MAX_SELECTED_STORIES} stories can be selected for public display.`);
      return;
    }
    try {
      await testimonialService.update(item.id, { is_active: !item.is_active });
      await loadStories();
    } catch (err) {
      console.error('Failed to toggle testimonial', err);
      window.alert('Could not update selected state.');
    }
  };

  const getMediaLabel = (item: TestimonialData) => {
    const hasFile = typeof item.video_file === 'string' && item.video_file.length > 0;
    const hasUrl = Boolean(item.video_url);
    if (hasFile && hasUrl) return { text: 'File + URL', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' };
    if (hasFile) return { text: 'File', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20' };
    if (hasUrl) return { text: 'URL', color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20' };
    return { text: 'Thumbnail only', color: 'text-slate-500 bg-slate-100 dark:bg-slate-800' };
  };

  const slotsFilled = selectedCount;
  const slotsTotal = MAX_SELECTED_STORIES;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Community Stories</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage "Voices of the Sanctuary" cards shown on the public homepage.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 active:bg-emerald-700 transition-colors shadow-sm shrink-0"
        >
          <Icon name="add" size={16} />
          Add Story
        </button>
      </div>

      {/* Slot indicator */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Public Homepage Slots
          </p>
          <p className={`text-xs font-bold ${slotsFilled === slotsTotal ? 'text-emerald-600' : 'text-amber-500'}`}>
            {slotsFilled} / {slotsTotal} filled
          </p>
        </div>
        <div className="flex gap-3">
          {[...Array(slotsTotal)].map((_, i) => {
            const story = stories.filter((s) => s.is_active)[i];
            return (
              <div
                key={i}
                className={`flex-1 rounded-lg border px-4 py-3 transition-colors ${
                  story
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20'
                    : 'border-dashed border-slate-200 dark:border-slate-700'
                }`}
              >
                {story ? (
                  <>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 truncate">{story.name}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{story.title}</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-600">Empty slot {i + 1}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4 animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                </div>
                <div className="h-6 w-16 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0 self-center" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-10 flex flex-col items-center gap-3">
            <Icon name="error_outline" size={28} className="text-red-300" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : stories.length === 0 ? (
          <div className="p-14 flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Icon name="movie" size={24} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-500">No stories yet</p>
            <p className="text-xs text-slate-400 text-center max-w-xs">
              The homepage will use hardcoded fallback cards until you add community stories.
            </p>
            <button
              onClick={openCreate}
              className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition"
            >
              <Icon name="add" size={15} />
              Add first story
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Person</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden sm:table-cell">Media</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Featured</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stories.map((item) => {
                  const media = getMediaLabel(item);
                  return (
                    <tr key={item.id || `${item.name}-${item.title}`} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar placeholder */}
                          <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-sm font-bold text-slate-500 dark:text-slate-400">
                            {item.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.name}</p>
                            <p className="text-xs text-slate-400 truncate">{item.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${media.color}`}>
                          {media.text}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-sm text-slate-600 dark:text-slate-400 tabular-nums">{item.display_order}</span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => toggleSelected(item)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                            item.is_active
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {item.is_active ? 'Featured' : 'Not featured'}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TestimonialModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelected(null); }}
        onSave={handleSave}
        initialData={selected}
        isLoading={saving}
      />
    </div>
  );
};

export default CommunityStoriesTab;
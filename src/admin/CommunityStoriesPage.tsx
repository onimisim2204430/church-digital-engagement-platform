import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../components/common/Icon';
import TestimonialModal from './components/TestimonialModal';
import { testimonialService, type TestimonialData } from './services/testimonialService';

const MAX_SELECTED_STORIES = 2;

const CommunityStoriesPage: React.FC = () => {
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

  const selectedCount = stories.filter((story) => story.is_active).length;

  const openCreate = () => {
    setSelected(null);
    setModalOpen(true);
  };

  const openEdit = (item: TestimonialData) => {
    setSelected(item);
    setModalOpen(true);
  };

  const handleDelete = async (item: TestimonialData) => {
    if (!item.id) return;

    const confirmed = window.confirm(`Delete ${item.name} - ${item.title}?`);
    if (!confirmed) return;

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
        data.id && stories.find((story) => story.id === data.id)?.is_active
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Community Stories</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage Voices of the Sanctuary cards shown on the public homepage.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
        >
          <Icon name="add" size={18} />
          Add Story
        </button>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
        Selected for public: {selectedCount} / {MAX_SELECTED_STORIES}
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading stories...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-500">{error}</div>
        ) : stories.length === 0 ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400">
            No stories in database yet. Public page will use hardcoded fallback cards.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Story</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Media</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Selected</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Order</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((item) => {
                  const hasVideoFile = typeof item.video_file === 'string' && item.video_file.length > 0;
                  const hasVideoUrl = Boolean(item.video_url);

                  return (
                    <tr key={item.id || `${item.name}-${item.title}`} className="border-b border-slate-200 dark:border-slate-700">
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{item.title}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                        {hasVideoFile ? 'File' : ''}
                        {hasVideoFile && hasVideoUrl ? ' + ' : ''}
                        {hasVideoUrl ? 'URL' : ''}
                        {!hasVideoFile && !hasVideoUrl ? 'Thumbnail only' : ''}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSelected(item)}
                          className={`px-2 py-1 rounded text-xs font-semibold ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}
                        >
                          {item.is_active ? 'Selected' : 'Not Selected'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{item.display_order}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="px-3 py-1.5 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
        onClose={() => {
          setModalOpen(false);
          setSelected(null);
        }}
        onSave={handleSave}
        initialData={selected}
        isLoading={saving}
      />
    </div>
  );
};

export default CommunityStoriesPage;

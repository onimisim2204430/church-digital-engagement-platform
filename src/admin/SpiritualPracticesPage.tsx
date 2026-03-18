import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../components/common/Icon';
import SpiritualPracticeModal from './components/SpiritualPracticeModal';
import {
  spiritualPracticeService,
  type SpiritualPracticeData,
} from './services/spiritualPracticeService';

const SpiritualPracticesPage: React.FC = () => {
  const [practices, setPractices] = useState<SpiritualPracticeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<SpiritualPracticeData | null>(null);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const getApiErrorMessage = (err: any, fallback: string): string => {
    const payload = err?.response?.data;
    if (!payload) return fallback;

    if (typeof payload === 'string') {
      return payload;
    }

    const preferredFields = ['display_order', 'title', 'short_description', 'slug', 'non_field_errors', 'detail'];
    for (const key of preferredFields) {
      const value = payload?.[key];
      if (Array.isArray(value) && value.length > 0) {
        return String(value[0]);
      }
      if (typeof value === 'string') {
        return value;
      }
    }

    const firstValue = Object.values(payload).find((value) => {
      if (Array.isArray(value) && value.length > 0) return true;
      return typeof value === 'string' && value.length > 0;
    });

    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === 'string') {
      return firstValue;
    }

    return fallback;
  };

  const loadPractices = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await spiritualPracticeService.getAll();
      setPractices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load spiritual practices', err);
      setError('Could not load spiritual practices.');
      setPractices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPractices();
  }, [loadPractices]);

  const openCreate = () => {
    setSelected(null);
    setSaveError('');
    setModalOpen(true);
  };

  const openEdit = (item: SpiritualPracticeData) => {
    setSelected(item);
    setSaveError('');
    setModalOpen(true);
  };

  const handleSave = async (data: SpiritualPracticeData) => {
    try {
      setSaving(true);
      setSaveError('');
      if (data.id) {
        await spiritualPracticeService.update(data.id, data);
      } else {
        const { id, created_at, updated_at, ...createData } = data;
        await spiritualPracticeService.create(createData);
      }
      setModalOpen(false);
      setSelected(null);
      await loadPractices();
    } catch (err: any) {
      console.error('Failed to save spiritual practice', err?.response?.data || err);
      setSaveError(getApiErrorMessage(err, 'Failed to save spiritual practice.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: SpiritualPracticeData) => {
    if (!item.id) return;

    const confirmed = window.confirm(`Delete ${item.title}?`);
    if (!confirmed) return;

    try {
      await spiritualPracticeService.delete(item.id);
      await loadPractices();
    } catch (err) {
      console.error('Failed to delete spiritual practice', err);
      window.alert('Failed to delete spiritual practice.');
    }
  };

  const toggleActive = async (item: SpiritualPracticeData) => {
    if (!item.id) return;

    try {
      await spiritualPracticeService.update(item.id, { is_active: !item.is_active });
      await loadPractices();
    } catch (err) {
      console.error('Failed to toggle active state', err);
      window.alert('Could not update active state.');
    }
  };

  const activeCount = practices.filter((practice) => practice.is_active).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Spiritual Practices</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage homepage and practices-page spiritual practice content.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500"
        >
          <Icon name="add" size={18} />
          Add Practice
        </button>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
        Active practices: {activeCount} / {practices.length}
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading practices...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-500">{error}</div>
        ) : practices.length === 0 ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400">
            No practices in database yet. Homepage will use fallback cards.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Slug</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Icon</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Active</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Order</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {practices.map((item) => (
                  <tr key={item.id || `${item.slug}-${item.title}`} className="border-b border-slate-200 dark:border-slate-700">
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{item.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{item.slug || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{item.duration_label}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{item.icon_name}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(item)}
                        className={`px-2 py-1 rounded text-xs font-semibold ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}
                      >
                        {item.is_active ? 'Active' : 'Inactive'}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SpiritualPracticeModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelected(null);
          setSaveError('');
        }}
        onSave={handleSave}
        initialData={selected}
        isLoading={saving}
        saveError={saveError}
      />
    </div>
  );
};

export default SpiritualPracticesPage;

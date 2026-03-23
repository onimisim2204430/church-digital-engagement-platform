import React, { useCallback, useEffect, useState } from 'react';
import Icon from '../../../components/common/Icon';
import SpiritualPracticeModal from '../../components/SpiritualPracticeModal';
import {
  spiritualPracticeService,
  type SpiritualPracticeData,
} from '../../services/spiritualPracticeService';

const SpiritualPracticesTab: React.FC = () => {
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
    if (typeof payload === 'string') return payload;
    const preferredFields = ['display_order', 'title', 'short_description', 'slug', 'non_field_errors', 'detail'];
    for (const key of preferredFields) {
      const value = payload?.[key];
      if (Array.isArray(value) && value.length > 0) return String(value[0]);
      if (typeof value === 'string') return value;
    }
    const firstValue = Object.values(payload).find((v) => {
      if (Array.isArray(v) && v.length > 0) return true;
      return typeof v === 'string' && v.length > 0;
    });
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === 'string') return firstValue;
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

  const openCreate = () => { setSelected(null); setSaveError(''); setModalOpen(true); };
  const openEdit = (item: SpiritualPracticeData) => { setSelected(item); setSaveError(''); setModalOpen(true); };

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
    if (!window.confirm(`Delete "${item.title}"?`)) return;
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

  const activeCount = practices.filter((p) => p.is_active).length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Spiritual Practices</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage practice cards shown on the homepage and practices page.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 active:bg-emerald-700 transition-colors shadow-sm shrink-0"
        >
          <Icon name="add" size={16} />
          Add Practice
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{practices.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Inactive</p>
          <p className="text-2xl font-bold text-slate-500">{practices.length - activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Visibility</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
            {practices.length > 0 ? `${Math.round((activeCount / practices.length) * 100)}% shown` : '—'}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-4 animate-pulse">
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/5" />
                </div>
                <div className="h-6 w-14 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0 self-center" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-10 flex flex-col items-center gap-3">
            <Icon name="error_outline" size={28} className="text-red-300" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : practices.length === 0 ? (
          <div className="p-14 flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Icon name="self_improvement" size={24} className="text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-500">No practices yet</p>
            <p className="text-xs text-slate-400 text-center max-w-xs">
              The homepage will show fallback cards until you add at least one practice.
            </p>
            <button
              onClick={openCreate}
              className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition"
            >
              <Icon name="add" size={15} />
              Add your first practice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Practice</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Icon</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden sm:table-cell">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {practices.map((item) => (
                  <tr key={item.id || `${item.slug}-${item.title}`} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.slug || '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-full px-2.5 py-1">
                        <Icon name="schedule" size={11} className="opacity-60" />
                        {item.duration_label}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {item.icon_name}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="text-sm text-slate-600 dark:text-slate-400 tabular-nums">{item.display_order}</span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleActive(item)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          item.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {item.is_active ? 'Active' : 'Inactive'}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SpiritualPracticeModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelected(null); setSaveError(''); }}
        onSave={handleSave}
        initialData={selected}
        isLoading={saving}
        saveError={saveError}
      />
    </div>
  );
};

export default SpiritualPracticesTab;
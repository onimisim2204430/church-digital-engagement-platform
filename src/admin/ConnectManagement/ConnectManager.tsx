import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../../components/common/Icon';
import {
  connectService,
  type ConnectCardType,
  type ConnectMinistry,
  type ConnectMinistryPayload,
  type ConnectStyleVariant,
} from '../../services/connect.service';

const CARD_TYPES: ConnectCardType[] = ['group', 'serve', 'event'];

type CardStyleOption = {
  value: ConnectStyleVariant;
  label: string;
  description: string;
  recommendedFor: ConnectCardType[];
};

const CARD_STYLE_OPTIONS: CardStyleOption[] = [
  {
    value: 'featured_group',
    label: 'Featured Group Hero',
    description: 'Large spotlight card with circular image and rich details.',
    recommendedFor: ['group'],
  },
  {
    value: 'sand_serve',
    label: 'Team Feature Card',
    description: 'Highlight card with icon backdrop and strong call-to-action.',
    recommendedFor: ['serve'],
  },
  {
    value: 'standard_group',
    label: 'Standard Group Card',
    description: 'Compact, balanced card for regular groups.',
    recommendedFor: ['group'],
  },
  {
    value: 'outlined_serve',
    label: 'Minimal Serve Card',
    description: 'Clean outlined style for volunteering opportunities.',
    recommendedFor: ['serve'],
  },
  {
    value: 'featured_event',
    label: 'Featured Event Banner',
    description: 'Wide event banner with visual image focus.',
    recommendedFor: ['event'],
  },
];

const DEFAULT_FORM: ConnectMinistryPayload = {
  title: '',
  description: '',
  card_type: 'group',
  style_variant: 'standard_group',
  category_label: '',
  schedule_label: '',
  location_label: '',
  date_label: '',
  icon_name: '',
  image_url: '',
  cta_label: '',
  cta_url: '',
  is_active: true,
  display_order: 1,
};

const ConnectManager: React.FC = () => {
  const [items, setItems] = useState<ConnectMinistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ConnectCardType>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ConnectMinistryPayload>(DEFAULT_FORM);

  const getApiErrorMessage = (err: any, fallback: string): string => {
    const payload = err?.response?.data;
    if (!payload) return fallback;
    if (typeof payload === 'string') return payload;
    const preferred = ['display_order', 'title', 'slug', 'image_url', 'icon_name', 'date_label', 'detail'];
    for (const key of preferred) {
      const value = payload?.[key];
      if (Array.isArray(value) && value.length > 0) {
        const msg = String(value[0]);
        if (key === 'image_url' && msg.includes('200 characters')) {
          return 'Image URL is too long for current validation. Please use a shorter link or contact support to expand URL limit.';
        }
        if (key === 'image_url') return `Image URL: ${msg}`;
        if (key === 'cta_url') return `CTA URL: ${msg}`;
        if (key === 'date_label') return `Event date label: ${msg}`;
        if (key === 'icon_name') return `Icon name: ${msg}`;
        return msg;
      }
      if (typeof value === 'string') {
        if (key === 'image_url' && value.includes('200 characters')) {
          return 'Image URL is too long for current validation. Please use a shorter link or contact support to expand URL limit.';
        }
        if (key === 'image_url') return `Image URL: ${value}`;
        if (key === 'date_label') return `Event date label: ${value}`;
        if (key === 'icon_name') return `Icon name: ${value}`;
        return value;
      }
    }
    const first = Object.values(payload).find((value) => {
      if (Array.isArray(value) && value.length > 0) return true;
      return typeof value === 'string' && value.length > 0;
    });
    if (Array.isArray(first) && first.length > 0) return String(first[0]);
    if (typeof first === 'string') return first;
    return fallback;
  };

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await connectService.getAdminConnectMinistries({
        card_type: typeFilter === 'all' ? undefined : typeFilter,
        is_active:
          activeFilter === 'all'
            ? undefined
            : activeFilter === 'active'
            ? true
            : false,
      });
      setItems(response.results || []);
    } catch (err) {
      console.error('Failed to load connect ministries', err);
      setItems([]);
      setError('Could not load Connect cards.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, typeFilter]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const activeCount = useMemo(() => items.filter((item) => item.is_active).length, [items]);

  const openCreate = () => {
    setEditingId(null);
    setSaveError('');
    const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.display_order)) + 1 : 1;
    setForm({ ...DEFAULT_FORM, display_order: nextOrder });
    setModalOpen(true);
  };

  const openEdit = (item: ConnectMinistry) => {
    setEditingId(item.id);
    setSaveError('');
    setForm({
      title: item.title,
      slug: item.slug,
      description: item.description,
      card_type: item.card_type,
      style_variant: item.style_variant,
      category_label: item.category_label,
      schedule_label: item.schedule_label,
      location_label: item.location_label,
      date_label: item.date_label,
      icon_name: item.icon_name,
      image_url: item.image_url,
      cta_label: item.cta_label,
      cta_url: item.cta_url,
      is_active: item.is_active,
      display_order: item.display_order,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setSaveError('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError('');
      if (editingId) {
        await connectService.updateAdminConnectMinistry(editingId, form);
      } else {
        await connectService.createAdminConnectMinistry(form);
      }
      closeModal();
      await loadItems();
    } catch (err: any) {
      console.error('Failed to save connect card', err?.response?.data || err);
      setSaveError(getApiErrorMessage(err, 'Could not save card.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ConnectMinistry) => {
    if (!window.confirm(`Archive "${item.title}"? It will be hidden from public pages.`)) return;
    try {
      await connectService.deleteAdminConnectMinistry(item.id);
      await loadItems();
    } catch (err) {
      console.error('Failed to archive card', err);
      window.alert('Could not archive card.');
    }
  };

  const handleToggleActive = async (item: ConnectMinistry) => {
    try {
      await connectService.updateAdminConnectMinistry(item.id, { is_active: !item.is_active });
      await loadItems();
    } catch (err) {
      console.error('Failed to toggle active state', err);
      window.alert('Could not update card status.');
    }
  };

  const title = editingId ? 'Edit Connect Card' : 'Create Connect Card';
  const selectedStyle = CARD_STYLE_OPTIONS.find((option) => option.value === form.style_variant);

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Connect Page CMS</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage groups, serve teams, and event cards displayed on public and member pages.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors shadow-sm"
        >
          <Icon name="add" size={16} />
          Add Card
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{items.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3">
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Inactive</p>
          <p className="text-2xl font-bold text-slate-500">{items.length - activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Card Types</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
            {new Set(items.map((item) => item.card_type)).size}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 flex flex-col sm:flex-row gap-3">
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | ConnectCardType)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
        >
          <option value="all">All Types</option>
          {CARD_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading Connect cards...</div>
        ) : error ? (
          <div className="p-12 text-center text-red-500">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No cards found for the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Card</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Style</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.slug}</p>
                    </td>
                    <td className="px-4 py-4 text-xs font-medium uppercase tracking-wide text-slate-600">{item.card_type}</td>
                    <td className="px-4 py-4 text-xs text-slate-500 hidden md:table-cell">
                      {CARD_STYLE_OPTIONS.find((option) => option.value === item.style_variant)?.label || item.style_variant}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 hidden sm:table-cell">{item.display_order}</td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          item.is_active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
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
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                        >
                          Archive
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700">
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              <label className="flex flex-col gap-1 text-sm">
                <span>Title</span>
                <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200" />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>Slug (optional)</span>
                <input value={form.slug || ''} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200" />
              </label>

              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                <span>Description</span>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200 min-h-[96px]" />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>Card Type</span>
                <select value={form.card_type} onChange={(e) => setForm((p) => ({ ...p, card_type: e.target.value as ConnectCardType }))} className="px-3 py-2 rounded-lg border border-slate-200">
                  {CARD_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col gap-2 text-sm md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Card Style</span>
                  <span className="text-xs text-slate-500">This controls how the card appears on the public page.</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {CARD_STYLE_OPTIONS.map((option) => {
                    const isSelected = form.style_variant === option.value;
                    const isRecommended = option.recommendedFor.includes(form.card_type);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, style_variant: option.value }))}
                        className={`text-left border rounded-lg p-3 transition ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-900">{option.label}</span>
                          {isRecommended && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Recommended</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{option.description}</p>
                        <div className="mt-2 h-8 rounded border border-dashed border-slate-300 bg-white/70" />
                      </button>
                    );
                  })}
                </div>
                {selectedStyle && (
                  <p className="text-xs text-slate-500">Selected style: <span className="font-medium text-slate-700">{selectedStyle.label}</span></p>
                )}
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span>Category Label</span>
                <input value={form.category_label || ''} onChange={(e) => setForm((p) => ({ ...p, category_label: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200" />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>Display Order</span>
                <input type="number" min={1} value={form.display_order} onChange={(e) => setForm((p) => ({ ...p, display_order: Number(e.target.value) || 1 }))} className="px-3 py-2 rounded-lg border border-slate-200" />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>Schedule Label</span>
                <input value={form.schedule_label || ''} onChange={(e) => setForm((p) => ({ ...p, schedule_label: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200" />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>Location Label</span>
                <input value={form.location_label || ''} onChange={(e) => setForm((p) => ({ ...p, location_label: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200" />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>Date Label</span>
                <input value={form.date_label || ''} onChange={(e) => setForm((p) => ({ ...p, date_label: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200" />
                {form.card_type === 'event' && <span className="text-xs text-amber-600">Required for event cards</span>}
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>Icon Name</span>
                <input value={form.icon_name || ''} onChange={(e) => setForm((p) => ({ ...p, icon_name: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200" />
                {form.card_type === 'serve' && <span className="text-xs text-amber-600">Required for serve cards</span>}
              </label>

              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                <span>Image URL</span>
                <input value={form.image_url || ''} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200" />
                {(form.card_type === 'group' || form.card_type === 'event') && (
                  <span className="text-xs text-amber-600">Required for group and event cards</span>
                )}
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>CTA Label</span>
                <input value={form.cta_label || ''} onChange={(e) => setForm((p) => ({ ...p, cta_label: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200" />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span>CTA URL</span>
                <input value={form.cta_url || ''} onChange={(e) => setForm((p) => ({ ...p, cta_url: e.target.value }))} className="px-3 py-2 rounded-lg border border-slate-200" />
              </label>

              <label className="inline-flex items-center gap-2 text-sm md:col-span-2">
                <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} />
                Active (visible on public/member pages)
              </label>

              {saveError && <p className="text-sm text-red-600 md:col-span-2">{saveError}</p>}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-slate-200 text-sm">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Card'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectManager;

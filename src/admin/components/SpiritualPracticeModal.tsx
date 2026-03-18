import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/common/Icon';
import type { SpiritualPracticeData } from '../services/spiritualPracticeService';

interface SpiritualPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SpiritualPracticeData) => Promise<void>;
  initialData?: SpiritualPracticeData | null;
  isLoading?: boolean;
  saveError?: string;
}

const MAX_TITLE = 20;
const MAX_SHORT_DESCRIPTION = 80;

const defaultFormData: SpiritualPracticeData = {
  title: '',
  slug: '',
  short_description: '',
  duration_label: '10 Min',
  icon_name: 'self_improvement',
  accent_color: 'accent-sage',
  full_content: '',
  cover_image: null,
  audio_url: '',
  is_active: true,
  display_order: 1,
};

const iconOptions = [
  'self_improvement',
  'auto_stories',
  'edit_note',
  'nature',
  'menu_book',
  'headphones',
  'favorite',
  'psychology',
];

const colorOptions: SpiritualPracticeData['accent_color'][] = ['accent-sage', 'primary', 'accent-sand'];

const SpiritualPracticeModal: React.FC<SpiritualPracticeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isLoading = false,
  saveError = '',
}) => {
  const [formData, setFormData] = useState<SpiritualPracticeData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (initialData) {
      setFormData({ ...defaultFormData, ...initialData });
    } else {
      setFormData(defaultFormData);
    }

    setErrors({});
  }, [initialData, isOpen]);

  const modeLabel = useMemo(() => (formData.id ? 'Edit Practice' : 'Add Practice'), [formData.id]);

  if (!isOpen) {
    return null;
  }

  const setField = (field: keyof SpiritualPracticeData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setField('cover_image', file);
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      nextErrors.title = 'Title is required';
    } else if (formData.title.trim().length > MAX_TITLE) {
      nextErrors.title = `Title cannot exceed ${MAX_TITLE} characters`;
    }

    if (!formData.short_description?.trim()) {
      nextErrors.short_description = 'Short description is required';
    } else if (formData.short_description.trim().length > MAX_SHORT_DESCRIPTION) {
      nextErrors.short_description = `Short description cannot exceed ${MAX_SHORT_DESCRIPTION} characters`;
    }

    if (!formData.duration_label?.trim()) {
      nextErrors.duration_label = 'Duration label is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    await onSave({
      ...formData,
      short_description: formData.short_description.trim(),
      title: formData.title.trim(),
      slug: formData.slug?.trim() || '',
      duration_label: formData.duration_label.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-xl border border-slate-700 bg-slate-900 text-slate-100" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{modeLabel}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md hover:bg-slate-800"
            aria-label="Close spiritual practice modal"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {saveError && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-slate-300">Title</span>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setField('title', e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                placeholder="Breath Meditation"
                maxLength={MAX_TITLE}
                disabled={isLoading}
              />
              <div className="mt-1 text-xs text-slate-400">
                {formData.title?.length || 0}/{MAX_TITLE}
              </div>
              {errors.title && <span className="text-xs text-red-400">{errors.title}</span>}
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Slug (optional)</span>
              <input
                type="text"
                value={formData.slug || ''}
                onChange={(e) => setField('slug', e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                placeholder="breath-meditation"
                disabled={isLoading}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-slate-300">Short Description</span>
            <textarea
              value={formData.short_description || ''}
              onChange={(e) => setField('short_description', e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              rows={3}
              placeholder="A 10-minute guided session focusing on mindful presence and anxiety release."
              maxLength={MAX_SHORT_DESCRIPTION}
              disabled={isLoading}
            />
            <div className="mt-1 text-xs text-slate-400">
              {formData.short_description?.length || 0}/{MAX_SHORT_DESCRIPTION}
            </div>
            {errors.short_description && <span className="text-xs text-red-400">{errors.short_description}</span>}
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-sm text-slate-300">Duration Label</span>
              <input
                type="text"
                value={formData.duration_label || ''}
                onChange={(e) => setField('duration_label', e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                placeholder="10 Min"
                disabled={isLoading}
              />
              {errors.duration_label && <span className="text-xs text-red-400">{errors.duration_label}</span>}
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Icon</span>
              <select
                value={formData.icon_name}
                onChange={(e) => setField('icon_name', e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                disabled={isLoading}
              >
                {iconOptions.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Accent Color</span>
              <select
                value={formData.accent_color}
                onChange={(e) => setField('accent_color', e.target.value as SpiritualPracticeData['accent_color'])}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                disabled={isLoading}
              >
                {colorOptions.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-slate-300">Cover Image (optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                disabled={isLoading}
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Audio URL (optional)</span>
              <input
                type="url"
                value={formData.audio_url || ''}
                onChange={(e) => setField('audio_url', e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                placeholder="https://..."
                disabled={isLoading}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-slate-300">Full Content</span>
            <textarea
              value={formData.full_content || ''}
              onChange={(e) => setField('full_content', e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              rows={8}
              placeholder="Extended spiritual practice guide..."
              disabled={isLoading}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-slate-300">Display Order</span>
              <input
                type="number"
                min={1}
                value={formData.display_order ?? 1}
                onChange={(e) => setField('display_order', Number(e.target.value || 1))}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                disabled={isLoading}
              />
            </label>

            <label className="inline-flex items-center gap-3 mt-7">
              <input
                type="checkbox"
                checked={Boolean(formData.is_active)}
                onChange={(e) => setField('is_active', e.target.checked)}
                disabled={isLoading}
              />
              <span className="text-sm text-slate-300">Active on public pages</span>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Practice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SpiritualPracticeModal;

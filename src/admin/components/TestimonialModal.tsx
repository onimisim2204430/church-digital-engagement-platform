import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/common/Icon';
import type { TestimonialData } from '../services/testimonialService';

interface TestimonialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TestimonialData) => Promise<void>;
  initialData?: TestimonialData | null;
  isLoading?: boolean;
}

const defaultFormData: TestimonialData = {
  title: '',
  name: '',
  description: '',
  thumbnail_image: '',
  video_file: null,
  video_url: '',
  is_active: false,
  display_order: 1,
};

const TestimonialModal: React.FC<TestimonialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<TestimonialData>(defaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (initialData) {
      setFormData(initialData);
      if (typeof initialData.thumbnail_image === 'string') {
        setThumbnailPreview(initialData.thumbnail_image);
      }
    } else {
      setFormData(defaultFormData);
      setThumbnailPreview('');
    }

    setErrors({});
  }, [initialData, isOpen]);

  const modeLabel = useMemo(() => (formData.id ? 'Edit Story' : 'Add Story'), [formData.id]);

  if (!isOpen) {
    return null;
  }

  const setField = (field: keyof TestimonialData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setField('thumbnail_image', file);

    const reader = new FileReader();
    reader.onload = () => {
      setThumbnailPreview(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setField('video_file', file);
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      nextErrors.title = 'Title is required';
    }

    if (!formData.name?.trim()) {
      nextErrors.name = 'Name is required';
    }

    const hasThumbnail = Boolean(formData.thumbnail_image);
    if (!hasThumbnail) {
      nextErrors.thumbnail_image = 'Thumbnail image is required';
    }

    const hasVideoFile = Boolean(formData.video_file);
    const hasVideoUrl = Boolean(formData.video_url?.trim());
    if (!hasVideoFile && !hasVideoUrl) {
      nextErrors.video_file = 'Provide a video file or a video URL';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    await onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-xl border border-slate-700 bg-slate-900 text-slate-100" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{modeLabel}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md hover:bg-slate-800"
            aria-label="Close testimonial modal"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-slate-300">Story Label</span>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setField('name', e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                placeholder="James' Story"
                disabled={isLoading}
              />
              {errors.name && <span className="text-xs text-red-400">{errors.name}</span>}
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Story Title</span>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setField('title', e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                placeholder="A Journey to Stillness"
                disabled={isLoading}
              />
              {errors.title && <span className="text-xs text-red-400">{errors.title}</span>}
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-slate-300">Description (optional)</span>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setField('description', e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              rows={3}
              placeholder="Optional subtitle or context"
              disabled={isLoading}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-slate-300">Thumbnail Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                disabled={isLoading}
              />
              {errors.thumbnail_image && <span className="text-xs text-red-400">{errors.thumbnail_image}</span>}
              {thumbnailPreview && (
                <img src={thumbnailPreview} alt="Thumbnail preview" className="mt-3 h-28 w-full rounded-md object-cover" />
              )}
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Video File (preferred)</span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/*"
                onChange={handleVideoChange}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
                disabled={isLoading}
              />
              <p className="mt-2 text-xs text-slate-400">If both file and URL are provided, public page uses file first.</p>
              {errors.video_file && <span className="text-xs text-red-400">{errors.video_file}</span>}
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-slate-300">Video URL (fallback)</span>
            <input
              type="url"
              value={formData.video_url || ''}
              onChange={(e) => setField('video_url', e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              placeholder="https://..."
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
              <span className="text-sm text-slate-300">Selected for public homepage (max 2)</span>
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
              {isLoading ? 'Saving...' : 'Save Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TestimonialModal;

import React, { useState, useCallback, useEffect } from 'react';
import Icon from '../../components/common/Icon';
import styles from './HeroSectionModal.module.css';

interface HeroSectionData {
  id?: number;
  title: string;
  description: string;
  label: string;
  image: string | File;
  image_alt_text: string;
  button1_label: string;
  button1_url: string;
  button1_icon: string;
  button2_label: string;
  button2_url: string;
  button2_icon: string;
  hero_type: 'featured_sermon' | 'announcement' | 'event';
  is_active: boolean;
  display_order: number;
  updated_by?: string;
}

interface HeroSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: HeroSectionData) => void;
  initialData?: HeroSectionData;
  isLoading?: boolean;
}

export function HeroSectionModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isLoading = false,
}: HeroSectionModalProps) {
  const [formData, setFormData] = useState<HeroSectionData>(
    initialData || {
      title: 'Finding Peace in the Midst of Chaos',
      description: 'In a world that demands our constant attention, discover the ancient practice of stillness and how it can restore your soul.',
      label: 'Latest Sabbath Teaching',
      image: '',
      image_alt_text: 'Church content image',
      button1_label: 'Watch Sermon',
      button1_url: '',
      button1_icon: 'play_circle',
      button2_label: 'Listen Audio',
      button2_url: '',
      button2_icon: '',
      hero_type: 'featured_sermon',
      is_active: true,
      display_order: 1,
    }
  );

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (typeof initialData.image === 'string' && initialData.image.startsWith('http')) {
        setImagePreview(initialData.image);
      }
    }
  }, [initialData]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.label.trim()) newErrors.label = 'Label is required';
    if (!formData.button1_label.trim()) newErrors.button1_label = 'Button 1 label is required';
    if (!formData.button2_label.trim()) newErrors.button2_label = 'Button 2 label is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback(
    (field: keyof HeroSectionData, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      // Clear error for this field
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleInputChange('image', file);
        // Preview image
        const reader = new FileReader();
        reader.onload = (event) => {
          setImagePreview(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [handleInputChange]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSuccess(null);

      if (!validateForm()) {
        return;
      }

      try {
        onSave(formData);
        setSuccess(formData.id ? 'Hero section updated successfully!' : 'Hero section created successfully!');
        setTimeout(() => {
          onClose();
        }, 1500);
      } catch (error) {
        console.error('Error saving hero section:', error);
        setErrors({ submit: 'Failed to save hero section. Please try again.' });
      }
    },
    [formData, validateForm, onSave, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {formData.id ? 'Edit Hero Section' : 'Create Hero Section'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {success && <div className={styles.successMessage}>{success}</div>}
          {errors.submit && <div className={styles.errorMessage}>{errors.submit}</div>}

          {/* Content Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Content</h3>

            <div className={styles.formGroup}>
              <label htmlFor="label" className={styles.label}>
                Category Label
              </label>
              <input
                id="label"
                type="text"
                value={formData.label}
                onChange={(e) => handleInputChange('label', e.target.value)}
                placeholder="e.g., Latest Sabbath Teaching"
                className={styles.input}
                disabled={isLoading}
              />
              {errors.label && <span className={styles.error}>{errors.label}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="title" className={styles.label}>
                Title
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Finding Peace in the Midst of Chaos"
                className={styles.input}
                disabled={isLoading}
              />
              {errors.title && <span className={styles.error}>{errors.title}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.label}>
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Subtitle or description text..."
                className={styles.textarea}
                rows={3}
                disabled={isLoading}
              />
              {errors.description && <span className={styles.error}>{errors.description}</span>}
            </div>
          </div>

          {/* Image Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Image</h3>

            <div className={styles.formGroup}>
              <label htmlFor="image" className={styles.label}>
                Hero Image
              </label>
              <div className={styles.imageUpload}>
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={styles.fileInput}
                  disabled={isLoading}
                />
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className={styles.imagePreview} />
                )}
              </div>
              {errors.image && <span className={styles.error}>{errors.image}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="image_alt_text" className={styles.label}>
                Image Alt Text
              </label>
              <input
                id="image_alt_text"
                type="text"
                value={formData.image_alt_text}
                onChange={(e) => handleInputChange('image_alt_text', e.target.value)}
                placeholder="Describe the image for accessibility"
                className={styles.input}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Buttons Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Action Buttons</h3>

            <div className={styles.buttonGroup}>
              <div className={styles.formGroup}>
                <label htmlFor="button1_label" className={styles.label}>
                  Primary Button Label
                </label>
                <input
                  id="button1_label"
                  type="text"
                  value={formData.button1_label}
                  onChange={(e) => handleInputChange('button1_label', e.target.value)}
                  placeholder="e.g., Watch Sermon"
                  className={styles.input}
                  disabled={isLoading}
                />
                {errors.button1_label && <span className={styles.error}>{errors.button1_label}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="button1_url" className={styles.label}>
                  Primary Button URL (Optional)
                </label>
                <input
                  id="button1_url"
                  type="url"
                  value={formData.button1_url}
                  onChange={(e) => handleInputChange('button1_url', e.target.value)}
                  placeholder="https://example.com"
                  className={styles.input}
                  disabled={isLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="button1_icon" className={styles.label}>
                  Primary Button URL (Optional)
                </label>
                <input
                  id="button1_icon"
                  type="text"
                  value={formData.button1_icon}
                  onChange={(e) => handleInputChange('button1_icon', e.target.value)}
                  placeholder="e.g., play_circle"
                  className={styles.input}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className={styles.divider} />

            <div className={styles.buttonGroup}>
              <div className={styles.formGroup}>
                <label htmlFor="button2_label" className={styles.label}>
                  Secondary Button Label
                </label>
                <input
                  id="button2_label"
                  type="text"
                  value={formData.button2_label}
                  onChange={(e) => handleInputChange('button2_label', e.target.value)}
                  placeholder="e.g., Listen Audio"
                  className={styles.input}
                  disabled={isLoading}
                />
                {errors.button2_label && <span className={styles.error}>{errors.button2_label}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="button2_url" className={styles.label}>
                  Secondary Button URL (Optional)
                </label>
                <input
                  id="button2_url"
                  type="url"
                  value={formData.button2_url}
                  onChange={(e) => handleInputChange('button2_url', e.target.value)}
                  placeholder="https://example.com"
                  className={styles.input}
                  disabled={isLoading}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="button2_icon" className={styles.label}>
                  Secondary Button Icon (Optional)
                </label>
                <input
                  id="button2_icon"
                  type="text"
                  value={formData.button2_icon}
                  onChange={(e) => handleInputChange('button2_icon', e.target.value)}
                  placeholder="e.g., audio"
                  className={styles.input}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Hero Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

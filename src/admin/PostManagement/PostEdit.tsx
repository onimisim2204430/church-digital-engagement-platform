/**
 * PostEdit Component - Desktop-Optimized Edition
 * Professional 2-column form with collapsible right sidebar
 * Desktop-first responsive design
 */

import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import postService, { PostUpdateData } from '../../services/post.service';
import contentTypeService, { ContentType } from '../../services/contentType.service';
import seriesService, { Series } from '../../services/series.service';
import { useConfirm } from '../../contexts/ConfirmContext';
import RichTextEditor from '../../components/RichTextEditor';
import { 
  XIcon, 
  TypeIcon, 
  ImageIcon, 
  MessageSquareIcon,
  HeartIcon,
  SendIcon,
  SaveIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  EyeOffIcon,
  Loader2Icon,
  FolderIcon,
  PlusIcon,
  ChevronDownIcon,
} from '../components/Icons';
import '../styles/PostForm.desktop.css';
import ImageUploadInput from './components/ImageUploadInput';

interface PostEditProps {
  postId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const PostEdit: React.FC<PostEditProps> = ({ postId, onSuccess, onCancel }) => {
  const { confirm } = useConfirm();
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [formData, setFormData] = useState<PostUpdateData>({
    title: '',
    content: '',
    content_type: '',
    comments_enabled: true,
    reactions_enabled: true,
    featured_image: '',
    video_url: '',
    audio_url: '',
  });
  const [currentStatus, setCurrentStatus] = useState<string>('DRAFT');
  const [currentPublishedAt, setCurrentPublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPost, setLoadingPost] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState('');
  
  // Series state
  const [availableSeries, setAvailableSeries] = useState<Series[]>([]);
  const [isPartOfSeries, setIsPartOfSeries] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [seriesOrder, setSeriesOrder] = useState<number>(1);
  const [showQuickCreateSeries, setShowQuickCreateSeries] = useState(false);
  const [seriesContentTypeId, setSeriesContentTypeId] = useState<string>('');
  const [previousContentType, setPreviousContentType] = useState<string>('');

  useEffect(() => {
    loadContentTypes();
    loadPost();
    loadSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const loadContentTypes = async () => {
    try {
      const types = await contentTypeService.getAll();
      const enabledTypes = types.filter(t => t.is_enabled || t.is_system);
      setContentTypes(enabledTypes);
      
      // Find and store Series content type ID
      const seriesType = enabledTypes.find(t => t.slug === 'series');
      if (seriesType) {
        setSeriesContentTypeId(seriesType.id);
      }
    } catch (err) {
      console.error('Failed to load content types:', err);
    } finally {
      setLoadingTypes(false);
    }
  };
  
  const loadSeries = async () => {
    try {
      const series = await seriesService.getAllSeries();
      setAvailableSeries(Array.isArray(series) ? series : []);
    } catch (err) {
      console.error('Failed to load series:', err);
    }
  };

  const loadPost = async () => {
    try {
      setLoadingPost(true);
      const post = await postService.getPost(postId);
      const contentTypeId = post.content_type || '';
      setFormData({
        title: post.title,
        content: post.content,
        content_type: contentTypeId,
        comments_enabled: post.comments_enabled,
        reactions_enabled: post.reactions_enabled,
        featured_image: post.featured_image || '',
        video_url: post.video_url || '',
        audio_url: post.audio_url || '',
      });
      setPreviousContentType(contentTypeId);
      setCurrentStatus(post.status);
      setCurrentPublishedAt(post.published_at);
      
      // Load series data if post is part of a series
      if ((post as any).series) {
        setIsPartOfSeries(true);
        setSelectedSeriesId((post as any).series);
        setSeriesOrder((post as any).series_order || 1);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load post');
    } finally {
      setLoadingPost(false);
    }
  };

  // Handle series toggle - automatically set/restore content type
  useEffect(() => {
    if (isPartOfSeries && seriesContentTypeId) {
      // Store current content type before switching
      if (!previousContentType && formData.content_type) {
        setPreviousContentType(formData.content_type);
      }
      // Set content type to Series
      setFormData(prev => ({ ...prev, content_type: seriesContentTypeId }));
    } else if (!isPartOfSeries && previousContentType && formData.content_type === seriesContentTypeId) {
      // Restore previous content type only if currently set to Series
      setFormData(prev => ({ ...prev, content_type: previousContentType }));
    }
  }, [isPartOfSeries]);

  // Tooltip positioning effect with passive listeners
  useEffect(() => {
    const handleTooltipPosition = () => {
      const triggers = document.querySelectorAll('.tooltip-trigger');
      triggers.forEach((trigger) => {
        const rect = trigger.getBoundingClientRect();
        const tooltip = trigger.querySelector('.tooltip-content') as HTMLElement;
        if (tooltip) {
          tooltip.style.setProperty('top', `${rect.top}px`);
          tooltip.style.setProperty('left', `${rect.left + rect.width / 2}px`);
        }
      });
    };

    const handleMouseEnter = (e: Event) => {
      const trigger = (e.currentTarget as HTMLElement);
      const rect = trigger.getBoundingClientRect();
      const tooltip = trigger.querySelector('.tooltip-content') as HTMLElement;
      if (tooltip) {
        tooltip.style.setProperty('top', `${rect.top}px`);
        tooltip.style.setProperty('left', `${rect.left + rect.width / 2}px`);
      }
    };

    // Position on mount and scroll
    handleTooltipPosition();
    window.addEventListener('scroll', handleTooltipPosition, { passive: true });
    window.addEventListener('resize', handleTooltipPosition, { passive: true });

    // Add hover listeners to all tooltip triggers
    const triggers = document.querySelectorAll('.tooltip-trigger');
    triggers.forEach(trigger => {
      trigger.addEventListener('mouseenter', handleMouseEnter);
    });

    return () => {
      window.removeEventListener('scroll', handleTooltipPosition);
      window.removeEventListener('resize', handleTooltipPosition);
      triggers.forEach(trigger => {
        trigger.removeEventListener('mouseenter', handleMouseEnter);
      });
    };
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }, []);

  // Handle rich text editor content change
  const handleContentChange = useCallback((content: string) => {
    setFormData((prev) => ({ ...prev, content }));
  }, []);

  // Handle image upload for the rich text editor
  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    try {
      // TODO: Implement actual image upload to your backend
      // For now, return a placeholder or convert to base64
      
      // Example implementation (replace with actual API call):
      // const formData = new FormData();
      // formData.append('image', file);
      // const response = await axios.post('/api/v1/upload/image', formData);
      // return response.data.url;

      // Temporary base64 conversion (not recommended for production)
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title?.trim() || !formData.content?.trim()) {
      setError('Title and content are required');
      return;
    }

    setLoading(true);
    setError('');

    // Add series data if selected
    const updateData: any = { ...formData };
    if (isPartOfSeries && selectedSeriesId) {
      updateData.series = selectedSeriesId;
      updateData.series_order = seriesOrder;
    } else {
      // Remove from series if unchecked
      updateData.series = null;
      updateData.series_order = 0;
    }

    try {
      await postService.updatePost(postId, updateData);
      onSuccess();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.detail || 'Failed to update post';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [formData, isPartOfSeries, selectedSeriesId, seriesOrder, postId, onSuccess]);
  
  const handleQuickCreateSeries = useCallback(async (title: string, visibility: string) => {
    try {
      const newSeries = await seriesService.createSeries({ title, visibility } as any);
      setAvailableSeries(prev => [...prev, newSeries]);
      setSelectedSeriesId(newSeries.id);
      setShowQuickCreateSeries(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create series');
    }
  }, []);

  const handlePublish = useCallback(() => {
    confirm({
      title: 'Publish Post',
      message: 'Publish this post immediately? It will become visible to all users.',
      confirmLabel: 'Publish Now',
      cancelLabel: 'Cancel',
      variant: 'primary',
      onConfirm: async () => {
        setLoading(true);
        setError('');
        try {
          await postService.publishPost(postId);
          onSuccess();
        } catch (err: any) {
          setError(err.response?.data?.error || 'Failed to publish post');
          setLoading(false);
        }
      },
    });
  }, [confirm, postId, onSuccess]);

  const handleUnpublish = () => {
    confirm({
      title: 'Unpublish Post',
      message: 'Unpublish this post? It will be reverted to draft and hidden from users.',
      confirmLabel: 'Unpublish',
      cancelLabel: 'Cancel',
      variant: 'neutral',
      onConfirm: async () => {
        setLoading(true);
        setError('');
        try {
          await postService.unpublishPost(postId);
          onSuccess();
        } catch (err: any) {
          setError(err.response?.data?.error || 'Failed to unpublish post');
          setLoading(false);
        }
      },
    });
  };

  if (loadingPost) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '300px',
        flexDirection: 'column',
        gap: '12px',
        color: 'var(--text-secondary)'
      }}>
        <Loader2Icon style={{ width: '32px', height: '32px', animation: 'spin 1s linear infinite' }} />
        <p>Loading post...</p>
      </div>
    );
  }

  return (
    <div className="post-form-wrapper-desktop">


      {/* Main Content Area */}
      <div className="post-form-content-desktop">
        {/* Left Column - Main Form */}
        <div className="post-form-main-desktop">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Content */}
            <div className="form-section-desktop">
              <h3 className="section-title">
                <MessageSquareIcon className="icon" />
                Content
              </h3>

              <RichTextEditor
                value={formData.content || ''}
                onChange={handleContentChange}
                placeholder="Write your content here..."
                disabled={loading}
                minHeight={400}
                onImageUpload={handleImageUpload}
              />
            </div>
          </form>
        </div>

        {/* Right Sidebar */}
        <div className="post-form-sidebar-desktop">
                {/* Status Banner */}
            {currentStatus === 'PUBLISHED' && (
              <div style={{
                padding: '12px 32px',
                background: '#dcfce7',
                color: '#166534',
                borderBottom: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13px'
              }}>
                <CheckCircleIcon size={20} />
                <span>
                  Published {currentPublishedAt && new Date(currentPublishedAt).toLocaleString()}
                </span>
              </div>
            )}
          {/* Sidebar Header - Show on tablet/mobile */}
          <div className="post-form-sidebar-header">
            <h3>
              <ChevronDownIcon className="icon" style={{ width: '16px', height: '16px' }} />
              Additional Settings
            </h3>
            <button
              className="post-form-sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
              type="button"
            >
              <ChevronDownIcon style={{ width: '18px', height: '18px', transform: sidebarOpen ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className={`post-form-sidebar-content ${!sidebarOpen ? 'hidden' : ''}`}>
            {/* Basic Information Section */}
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">
                <TypeIcon className="icon" />
                Basic Information
              </h4>

              {error && (
                <div className="error-inline-alert">
                  <AlertCircleIcon size={16} />
                  <span className="error-text">{error.length > 40 ? error.substring(0, 37) + '...' : error}</span>
                  {error.length > 40 && (
                    <span className="tooltip-trigger">
                      <span className="tooltip-icon">?</span>
                      <span className="tooltip-content">{error}</span>
                    </span>
                  )}
                </div>
              )}

              <div className="sidebar-form-group">
                <label htmlFor="title">
                  Post Title <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title || ''}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="form-input-desktop"
                />
              </div>

              <div className="sidebar-form-group">
                <label htmlFor="content_type">
                  Content Type <span className="required">*</span>
                  {isPartOfSeries && (
                    <span className="tooltip-trigger">
                      <span className="tooltip-icon">?</span>
                      <span className="tooltip-content">Automatically set to 'Series' when post is part of a series</span>
                    </span>
                  )}
                </label>
                <select
                  id="content_type"
                  name="content_type"
                  value={formData.content_type || ''}
                  onChange={handleChange}
                  required
                  disabled={loading || loadingTypes || isPartOfSeries}
                  className="form-select-desktop"
                >
                  {loadingTypes && <option value="">Loading types...</option>}
                  {!loadingTypes && contentTypes.length === 0 && <option value="">No types available</option>}
                  {contentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Media & Resources Section */}
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">
                <ImageIcon className="icon" />
                Media & Resources
              </h4>

              <div className="sidebar-form-group">
                <label>Featured Image</label>
                <ImageUploadInput
                  value={formData.featured_image || ''}
                  onChange={(url) => setFormData(prev => ({ ...prev, featured_image: url }))}
                  disabled={loading}
                />
              </div>

              <div className="sidebar-form-group">
                <label htmlFor="video_url">
                  Video URL
                  <span className="tooltip-trigger">
                    <span className="tooltip-icon">?</span>
                    <span className="tooltip-content">YouTube or video link</span>
                  </span>
                </label>
                <input
                  type="url"
                  id="video_url"
                  name="video_url"
                  value={formData.video_url || ''}
                  onChange={handleChange}
                  placeholder="https://youtube.com/watch?v=..."
                  disabled={loading}
                  className="form-input-desktop"
                />
              </div>

              <div className="sidebar-form-group">
                <label htmlFor="audio_url">
                  Audio URL
                  <span className="tooltip-trigger">
                    <span className="tooltip-icon">?</span>
                    <span className="tooltip-content">Audio file or podcast link</span>
                  </span>
                </label>
                <input
                  type="url"
                  id="audio_url"
                  name="audio_url"
                  value={formData.audio_url || ''}
                  onChange={handleChange}
                  placeholder="https://example.com/audio.mp3"
                  disabled={loading}
                  className="form-input-desktop"
                />
              </div>
            </div>

            {/* Series Section */}
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">
                <FolderIcon className="icon" />
                Series
              </h4>

              <label className="sidebar-checkbox">
                <input
                  type="checkbox"
                  checked={isPartOfSeries}
                  onChange={(e) => setIsPartOfSeries(e.target.checked)}
                  disabled={loading}
                />
                <div className="sidebar-checkbox-label">
                  <span className="sidebar-checkbox-text">Part of a series</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Group related posts
                  </span>
                </div>
              </label>

              {isPartOfSeries && (
                <div className="conditional-section show">
                  <div className="sidebar-form-group">
                    <label htmlFor="series">
                      Series
                      <span className="tooltip-trigger">
                        <span className="tooltip-icon">?</span>
                        <span className="tooltip-content">Select which series this post belongs to</span>
                      </span>
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        id="series"
                        value={selectedSeriesId}
                        onChange={(e) => setSelectedSeriesId(e.target.value)}
                        className="form-select-desktop"
                        disabled={loading}
                        style={{ flex: 1 }}
                      >
                        <option value="">Choose series...</option>
                        {availableSeries.map((series) => (
                          <option key={series.id} value={series.id}>
                            {series.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowQuickCreateSeries(true)}
                        className="btn-secondary-desktop"
                        disabled={loading}
                        title="Create new series"
                      >
                        <PlusIcon style={{ width: '14px', height: '14px' }} />
                      </button>
                    </div>
                  </div>

                  <div className="sidebar-form-group">
                    <label htmlFor="series_order">
                      Part #
                      <span className="tooltip-trigger">
                        <span className="tooltip-icon">?</span>
                        <span className="tooltip-content">Order in series</span>
                      </span>
                    </label>
                    <input
                      type="number"
                      id="series_order"
                      value={seriesOrder}
                      onChange={(e) => setSeriesOrder(parseInt(e.target.value) || 1)}
                      min="1"
                      disabled={loading}
                      className="form-input-desktop"
                      style={{ maxWidth: '80px' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Engagement Settings */}
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">
                <HeartIcon className="icon" />
                Engagement
              </h4>

              <label className="sidebar-checkbox">
                <input
                  type="checkbox"
                  name="comments_enabled"
                  checked={formData.comments_enabled || false}
                  onChange={handleChange}
                  disabled={loading}
                />
                <div className="sidebar-checkbox-label">
                  <span className="sidebar-checkbox-text">Allow Comments</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Users can comment
                  </span>
                </div>
              </label>

              <label className="sidebar-checkbox">
                <input
                  type="checkbox"
                  name="reactions_enabled"
                  checked={formData.reactions_enabled || false}
                  onChange={handleChange}
                  disabled={loading}
                />
                <div className="sidebar-checkbox-label">
                  <span className="sidebar-checkbox-text">Allow Reactions</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Users can react
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions - Footer */}
      <div className="form-actions-desktop">
        {currentStatus === 'PUBLISHED' && (
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              background: 'transparent',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <EyeOffIcon size={18} />
            Unpublish
          </button>
        )}
        <button
          type="button"
          className="btn-cancel"
          onClick={onCancel}
          disabled={loading}
        >
          <XIcon size={18} />
          Cancel
        </button>
        {currentStatus === 'DRAFT' && (
          <button
            type="button"
            className="btn-save"
            onClick={handlePublish}
            disabled={loading}
            style={{
              background: 'var(--primary-600)',
              color: 'white'
            }}
          >
            <SendIcon size={18} />
            Publish Now
          </button>
        )}
        <button
          type="submit"
          className="btn-save"
          disabled={loading || !formData.title?.trim()}
          onClick={handleSubmit}
        >
          {loading ? (
            <>
              <SaveIcon size={18} className="spinning" />
              Updating...
            </>
          ) : (
            <>
              <SaveIcon size={18} />
              Update Post
            </>
          )}
        </button>
      </div>

      {/* Quick Create Series Modal */}
      {showQuickCreateSeries && (
        <QuickCreateSeriesModal
          onClose={() => setShowQuickCreateSeries(false)}
          onCreate={handleQuickCreateSeries}
        />
      )}
    </div>
  );
};

export default PostEdit;

// Quick Create Series Modal Component - Memoized
interface QuickCreateSeriesModalProps {
  onClose: () => void;
  onCreate: (title: string, visibility: string) => void;
}

const QuickCreateSeriesModal = React.memo<QuickCreateSeriesModalProps>(({ onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [loading, setLoading] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!title.trim()) {
      alert('Please enter a series title');
      return;
    }
    setLoading(true);
    await onCreate(title, visibility);
    setLoading(false);
  }, [title, visibility, onCreate]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>Quick Create Series</h3>
          <button className="btn-icon" onClick={onClose}>
            <XIcon size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group-pro">
            <label htmlFor="quickSeriesTitle" className="form-label-pro">
              Series Title
            </label>
            <input
              type="text"
              id="quickSeriesTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter series title..."
              className="form-input-pro"
              autoFocus
            />
          </div>

          <div className="form-group-pro">
            <label htmlFor="quickSeriesVisibility" className="form-label-pro">
              Visibility
            </label>
            <select
              id="quickSeriesVisibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="form-select-pro"
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary-pro"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            className="btn-primary-pro"
            disabled={loading || !title.trim()}
          >
            {loading ? 'Creating...' : 'Create Series'}
          </button>
        </div>
      </div>
    </div>
  );
});

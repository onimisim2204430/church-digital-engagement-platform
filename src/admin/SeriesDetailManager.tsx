// SeriesDetailManager.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import seriesService, { SeriesDetail, SeriesPost, SERIES_VISIBILITY_OPTIONS } from '../services/series.service';
import postService, { Post } from '../services/post.service';
import ImageUploadInput from './components/ImageUploadInput';
import Icon from '../components/common/Icon';

type TabKey = 'posts' | 'edit' | 'analytics' | 'resources' | 'settings';

// Add location state type
interface LocationState {
  justCreated?: boolean;
}

const SeriesDetailManager: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  // Determine mode
  const isCreateMode = !id || id === 'new';

  // ── Series data ─────────────────────────────────────────────────
  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [posts, setPosts] = useState<SeriesPost[]>([]);
  const [loading, setLoading] = useState(!isCreateMode); // Only load in edit mode
  const [error, setError] = useState('');

  // ── Tabs ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>(isCreateMode ? 'edit' : 'posts');

  // ── Posts tab state ─────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [showDeleteSeriesModal, setShowDeleteSeriesModal] = useState(false);
  const [deleteSeriesInput, setDeleteSeriesInput] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);

  // ── Add Post modal state ────────────────────────────────────────
  const [showAddPost, setShowAddPost] = useState(false);
  const [availablePosts, setAvailablePosts] = useState<Post[]>([]);
  const [addPostSearch, setAddPostSearch] = useState('');
  const [addingPostId, setAddingPostId] = useState<string | null>(null);
  const [loadingAvailablePosts, setLoadingAvailablePosts] = useState(false);

  // ── Edit/Create form state ──────────────────────────────────────
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    cover_image: '',
    visibility: 'PUBLIC' as 'PUBLIC' | 'MEMBERS_ONLY' | 'HIDDEN',
    is_featured: false,
    featured_priority: 0,
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  // ── Fetch (only in edit mode) ────────────────────────────────────
  const fetchSeries = useCallback(async () => {
    if (!id || isCreateMode) return;
    setLoading(true);
    setError('');
    try {
      const data = await seriesService.getSeries(id);
      setSeries(data);
      setPosts(data.posts || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load series');
    } finally {
      setLoading(false);
    }
  }, [id, isCreateMode]);

  useEffect(() => {
    if (!isCreateMode) {
      fetchSeries();
    }
  }, [fetchSeries, isCreateMode]);

  // Sync edit form whenever series data arrives (edit mode only)
  useEffect(() => {
    if (series && !isCreateMode) {
      setEditForm({
        title: series.title,
        description: series.description || '',
        cover_image: series.cover_image || '',
        visibility: series.visibility,
        is_featured: series.is_featured,
        featured_priority: series.featured_priority,
      });
    }
  }, [series, isCreateMode]);

  // Show success message if just created
  useEffect(() => {
    if (state?.justCreated) {
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3500);
      // Clear the state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [state, navigate, location.pathname]);

  // ── Post actions ─────────────────────────────────────────────────
  const handleSaveOrder = async () => {
    if (!id || isCreateMode) return;
    setSavingOrder(true);
    try {
      await seriesService.reorderSeriesPosts(id, {
        post_orders: posts.map((p, i) => ({ post_id: p.id, order: i + 1 })),
      });
    } catch (err: any) {
      alert('Failed to save order: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingOrder(false);
    }
  };

  const handleRemovePost = (postId: string) => {
    if (!id || isCreateMode) return;
    setRemoveConfirmId(postId);
  };

  const confirmRemovePost = async () => {
    if (!id || isCreateMode || !removeConfirmId) return;
    setRemovingId(removeConfirmId);
    try {
      await seriesService.removePostFromSeries(id, { post_id: removeConfirmId });
      setPosts(prev => prev.filter(p => p.id !== removeConfirmId));
      setSeries(prev =>
        prev ? { ...prev, post_count: Math.max(0, prev.post_count - 1) } : prev
      );
    } catch (err: any) {
      alert('Failed to remove post: ' + (err.message || 'Unknown error'));
    } finally {
      setRemovingId(null);
      setRemoveConfirmId(null);
    }
  };

  // ── Drag-to-reorder ──────────────────────────────────────────────
  const handleDragStart = (postId: string) => setDraggedId(postId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const from = posts.findIndex(p => p.id === draggedId);
    const to = posts.findIndex(p => p.id === targetId);
    if (from === -1 || to === -1) return;
    const reordered = [...posts];
    const [item] = reordered.splice(from, 1);
    reordered.splice(to, 0, item);
    setPosts(reordered);
    setDraggedId(null);
  };

  const filteredPosts = posts.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Derived: sum of all post view counts
  const totalViews = useMemo(
    () => posts.reduce((sum, p) => sum + (p.views_count || 0), 0),
    [posts]
  );

  // ── Add Post handlers ────────────────────────────────────────────
  const loadAvailablePosts = useCallback(async () => {
    if (isCreateMode) return;
    setLoadingAvailablePosts(true);
    try {
      const result = await postService.getAllPosts({ is_published: undefined });
      const allArr: Post[] = Array.isArray(result) ? result : (result as any).results || [];
      setAvailablePosts(allArr.filter(p => !posts.some(sp => sp.id === p.id)));
    } catch {
      // ignore
    } finally {
      setLoadingAvailablePosts(false);
    }
  }, [posts, isCreateMode]);

  useEffect(() => {
    if (showAddPost && !isCreateMode) {
      setAddPostSearch('');
      loadAvailablePosts();
    }
  }, [showAddPost, loadAvailablePosts, isCreateMode]);

  const handleAddPost = async (postId: string) => {
    if (!id || isCreateMode) return;
    setAddingPostId(postId);
    try {
      await seriesService.addPostToSeries(id, { post_id: postId, series_order: posts.length + 1 });
      await fetchSeries();
      setAvailablePosts(prev => prev.filter(p => p.id !== postId));
    } catch (err: any) {
      alert('Failed to add post: ' + (err.message || 'Error'));
    } finally {
      setAddingPostId(null);
    }
  };

  const handleMovePost = (postId: string, direction: 'up' | 'down') => {
    if (isCreateMode) return;
    const idx = posts.findIndex(p => p.id === postId);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === posts.length - 1) return;
    const newPosts = [...posts];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newPosts[idx], newPosts[swapIdx]] = [newPosts[swapIdx], newPosts[idx]];
    setPosts(newPosts);
  };

  // ── Edit/Create form handlers ────────────────────────────────────
  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setEditForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === 'number') {
      setEditForm(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateSeries = async () => {
    if (!editForm.title.trim()) {
      setEditError('Series title is required.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const newSeries = await seriesService.createSeries({
        title: editForm.title,
        description: editForm.description,
        cover_image: editForm.cover_image,
        visibility: editForm.visibility,
        is_featured: editForm.is_featured,
        featured_priority: editForm.featured_priority,
      });
      
      setCreateSuccess(true);
      // Redirect to the new series page in edit mode
      setTimeout(() => {
        navigate(`/admin/series/${newSeries.id}`, { 
          state: { justCreated: true }
        });
      }, 1500);
    } catch (err: any) {
      setEditError(
        err.response?.data?.message ||
        err.response?.data?.title?.[0] ||
        err.message ||
        'Failed to create series'
      );
    } finally {
      setEditSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!id || isCreateMode || !editForm.title.trim()) {
      setEditError('Series title is required.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    setEditSuccess(false);
    try {
      await seriesService.updateSeries(id, {
        title: editForm.title,
        description: editForm.description,
        cover_image: editForm.cover_image,
        visibility: editForm.visibility,
        is_featured: editForm.is_featured,
        featured_priority: editForm.featured_priority,
      });
      setEditSuccess(true);
      fetchSeries();
      setTimeout(() => setEditSuccess(false), 3500);
    } catch (err: any) {
      setEditError(
        err.response?.data?.message ||
        err.response?.data?.title?.[0] ||
        err.message ||
        'Failed to save changes'
      );
    } finally {
      setEditSaving(false);
    }
  };

  // ── Tab configuration based on mode ─────────────────────────────
  const tabs = useMemo(() => {
    if (isCreateMode) {
      return [
        { key: 'edit' as TabKey, icon: 'add_circle', label: 'Create Series' },
      ];
    }
    return [
      { key: 'posts' as TabKey, icon: 'list_alt', label: 'Posts', count: posts.length },
      { key: 'edit' as TabKey, icon: 'edit', label: 'Edit Series' },
      { key: 'analytics' as TabKey, icon: 'analytics', label: 'Analytics' },
      { key: 'resources' as TabKey, icon: 'folder_open', label: 'Resources' },
      { key: 'settings' as TabKey, icon: 'settings', label: 'Settings' },
    ];
  }, [isCreateMode, posts.length]);

  // ── Loading / error ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Icon name="progress_activity" size={36} className=" animate-spin" />
          <p className="text-sm font-medium">Loading series...</p>
        </div>
      </div>
    );
  }

  if (!isCreateMode && (error || !series)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Icon name="error_outline" size={48} className=" text-red-300" />
          <p className="mt-3 text-red-600 font-semibold">{error || 'Series not found'}</p>
          <button onClick={fetchSeries} className="mt-4 text-primary text-sm underline">Retry</button>
        </div>
      </div>
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const authorName = !isCreateMode && series ? (
    series.author_name ||
    (typeof series.author === 'object' && series.author
      ? (series.author as any).full_name
      : null)
  ) : null;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 flex-shrink-0">
        <div className="max-w-7xl mx-auto w-full">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-4">
            <button
              onClick={() => navigate('/admin/series')}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Icon name="arrow_back" size={14} />
              Series Management
            </button>
            <Icon name="chevron_right" size={10} />
            <span className="text-slate-900 truncate max-w-xs">
              {isCreateMode ? 'New Series' : series?.title}
            </span>
          </nav>

          <div className="flex items-start justify-between gap-6">
            <div className="flex gap-5">
              {/* Cover image */}
              <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 hidden sm:block">
                {!isCreateMode && series?.cover_image ? (
                  <img src={series.cover_image} alt={series.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Icon name={isCreateMode ? 'add_circle' : 'account_tree'} size={32} className=" text-slate-300" />
                  </div>
                )}
              </div>

              <div>
                {/* Title + badges */}
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                    {isCreateMode ? 'Create New Series' : series?.title}
                  </h2>
                  {!isCreateMode && series?.is_featured && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider border border-amber-200 xs:inline-block">
                      Featured
                    </span>
                  )}
                  {!isCreateMode && series && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      series.visibility === 'PUBLIC'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : series.visibility === 'MEMBERS_ONLY'
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {series.visibility.replace('_', ' ')}
                    </span>
                  )}
                </div>

                {/* Meta line - only show in edit mode */}
                {!isCreateMode && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2 hidden md:flex">
                    {authorName && (
                      <span className="flex items-center gap-1.5">
                        <Icon name="person" size={14} />
                        Author: <strong>{authorName}</strong>
                      </span>
                    )}
                    {authorName && <span className="w-1 h-1 rounded-full bg-slate-300" />}
                    <span className="flex items-center gap-1.5">
                      <Icon name="calendar_today" size={14} />
                      Created: <strong>{series ? fmtDate(series.created_at) : ''}</strong>
                    </span>
                    {series?.date_range?.start && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="flex items-center gap-1.5">
                          <Icon name="event" size={14} />
                          Active: <strong>
                            {fmtDate(series.date_range.start)}
                            {series.date_range.end ? ` – ${fmtDate(series.date_range.end)}` : ' – Present'}
                          </strong>
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Header actions - conditional based on mode */}
            <div className="flex items-center gap-3 flex-shrink-0 hidden md:flex">
              {!isCreateMode && (
                <a
                  href={`/library/series/${series?.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
                >
                  <Icon name="visibility" size={18} />
                  View
                </a>
              )}
              {isCreateMode && (
                <button
                  onClick={handleCreateSeries}
                  disabled={editSaving || !editForm.title.trim()}
                  className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-lg font-semibold text-sm shadow-sm flex items-center gap-2"
                >
                  <Icon name={editSaving ? 'hourglass_empty' : 'add_circle'} size={18} />
                  {editSaving ? 'Creating...' : 'Create Series'}
                </button>
              )}
            </div>
          </div>

          {/* Metrics strip - only in edit mode */}
          {!isCreateMode && (
            <div className="hidden md:grid grid-cols-4 gap-4 mt-6 border-t border-slate-100 pt-4">
              {[
                { icon: 'visibility', bg: 'bg-blue-50 text-blue-600', label: 'Total Views', value: totalViews.toLocaleString() },
                { icon: 'article', bg: 'bg-purple-50 text-purple-600', label: 'Posts Published', value: series ? `${series.published_post_count} / ${series.post_count}` : '0 / 0' },
                { icon: 'share', bg: 'bg-orange-50 text-orange-600', label: 'Shares', value: '—' },
                { icon: 'bookmark', bg: 'bg-teal-50 text-teal-600', label: 'Saves', value: '—' },
              ].map(m => (
                <div key={m.label} className="flex items-center gap-3">
                  <div className={`p-1.5 rounded ${m.bg}`}>
                    <Icon name={m.icon} size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">{m.label}</p>
                    <p className="text-sm font-bold text-slate-900">{m.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white px-6 flex-shrink-0">
        <div className="max-w-7xl mx-auto w-full">
          <nav className="flex -mb-px space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon name={tab.icon} size={18} />
                {tab.label}
                {'count' in tab && tab.count !== undefined && (
                  <span className={`py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">

          {/* ── CREATE MODE (full-width form) ───────────────────── */}
          {isCreateMode && activeTab === 'edit' && (
            <div className="max-w-3xl mx-auto">
              {/* Success banner */}
              {createSuccess && (
                <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-xl px-5 py-4 text-sm font-medium">
                  <Icon name="check_circle" size={18} className=" text-green-500" />
                  <div>
                    <p className="font-semibold">Series created successfully!</p>
                    <p className="text-xs text-green-600 mt-0.5">Redirecting to the new series page...</p>
                  </div>
                </div>
              )}

              {/* Error banner */}
              {editError && (
                <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm font-medium">
                  <Icon name="error_outline" size={18} className=" text-red-400" />
                  {editError}
                </div>
              )}

              {/* Create Series Form */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-8 py-8 space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Series Details</h3>
                    <p className="text-sm text-slate-500 mb-6">Fill in the information below to create a new series.</p>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={editForm.title}
                      onChange={handleEditChange}
                      disabled={editSaving || createSuccess}
                      placeholder="e.g., The Divine Renovation: Rebuilding the Temple of Your Heart"
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-colors font-semibold"
                      autoFocus
                    />
                    <p className="text-xs text-slate-400 mt-1">The public-facing name of the series</p>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Description</label>
                    <textarea
                      name="description"
                      value={editForm.description}
                      onChange={handleEditChange}
                      disabled={editSaving || createSuccess}
                      placeholder="Describe what this series is about, its themes, and who it's for..."
                      rows={6}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white resize-none transition-colors"
                    />
                    <p className="text-xs text-slate-400 mt-1">Shown on the public series page — helps members understand what to expect</p>
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Cover Image</label>
                    <ImageUploadInput
                      value={editForm.cover_image || ''}
                      onChange={(url) => setEditForm(prev => ({ ...prev, cover_image: url }))}
                      disabled={editSaving || createSuccess}
                    />
                    <p className="text-xs text-slate-400 mt-2">Recommended: 1280 × 720 px (16:9), JPG or PNG</p>
                  </div>

                  {/* Visibility */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Visibility</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {SERIES_VISIBILITY_OPTIONS.map(opt => {
                        const icons: Record<string, string> = { PUBLIC: 'public', MEMBERS_ONLY: 'group', HIDDEN: 'visibility_off' };
                        const descs: Record<string, string> = {
                          PUBLIC: 'Anyone can discover and view',
                          MEMBERS_ONLY: 'Authenticated members only',
                          HIDDEN: 'Hidden from all listings',
                        };
                        const isActive = editForm.visibility === opt.value;
                        return (
                          <label
                            key={opt.value}
                            className={[
                              'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                              isActive
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                            ].join(' ')}
                          >
                            <input
                              type="radio"
                              name="visibility"
                              value={opt.value}
                              checked={isActive}
                              onChange={handleEditChange}
                              disabled={editSaving || createSuccess}
                              className="sr-only"
                            />
                            <span className={`material-symbols-outlined text-xl ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                              {icons[opt.value]}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${isActive ? 'text-primary' : 'text-slate-700'}`}>{opt.label}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{descs[opt.value]}</p>
                            </div>
                            {isActive && (
                              <Icon name="check_circle" size={16} className=" text-primary flex-shrink-0" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Featured */}
                  <div className="border-t border-slate-100 pt-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Feature this series</p>
                        <p className="text-xs text-slate-400 mt-0.5">Shown prominently on the homepage</p>
                      </div>
                      <div className="relative flex-shrink-0">
                        <input
                          type="checkbox"
                          name="is_featured"
                          checked={editForm.is_featured}
                          onChange={handleEditChange}
                          disabled={editSaving || createSuccess}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-primary transition-colors peer-disabled:opacity-50" />
                        <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                      </div>
                    </div>

                    {editForm.is_featured && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-6">
                        <div>
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                            Display Priority
                          </label>
                          <input
                            type="number"
                            name="featured_priority"
                            value={editForm.featured_priority}
                            onChange={handleEditChange}
                            min={0}
                            max={100}
                            disabled={editSaving || createSuccess}
                            className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50 transition-colors"
                          />
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">Higher numbers appear earlier in featured lists</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="border-t border-slate-100 pt-6 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCreateSeries}
                      disabled={editSaving || createSuccess || !editForm.title.trim()}
                      className="flex-1 px-5 py-3 rounded-lg bg-primary hover:opacity-90 text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                    >
                      <Icon name={editSaving ? 'hourglass_empty' : 'add_circle'} size={14} />
                      {editSaving ? 'Creating...' : 'Create Series'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/series')}
                      disabled={editSaving}
                      className="flex-1 px-5 py-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 text-center">
                    After creating the series, you'll be able to add posts, upload resources, and configure advanced settings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── EDIT MODE TABS ──────────────────────────────────── */}
          {!isCreateMode && (
            <>
              {/* ── Posts tab ──────────────────────────────────────── */}
              {activeTab === 'posts' && (
                <div className="flex flex-col gap-4">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative w-72">
                      <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <Icon name="search" size={18} />
                      </span>
                      <input
                        className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Search posts..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAddPost(true)}
                        className="border border-primary text-primary hover:bg-primary/5 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                      >
                        <Icon name="add" size={14} />
                        Add Post
                      </button>
                      <button
                        onClick={handleSaveOrder}
                        disabled={savingOrder}
                        className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-60"
                      >
                        <Icon name={savingOrder ? 'hourglass_empty' : 'save'} size={14} />
                        {savingOrder ? 'Saving...' : 'Save Order'}
                      </button>
                    </div>
                  </div>

                  {/* Empty state */}
                  {filteredPosts.length === 0 && (
                    <div className="text-center py-16 text-slate-500">
                      <Icon name="article" size={48} className=" text-slate-300" />
                      <p className="mt-2 font-semibold">No posts in this series yet</p>
                      <p className="text-xs mt-1 text-slate-400 mb-4">
                        Add posts to this series to get started
                      </p>
                      <button
                        onClick={() => setShowAddPost(true)}
                        className="border border-primary text-primary hover:bg-primary/5 px-5 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                      >
                        <Icon name="add" size={14} />
                        Add Post
                      </button>
                    </div>
                  )}

                  {/* Post rows */}
                  {filteredPosts.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {filteredPosts.map((post, idx) => (
                        <div
                          key={post.id}
                          draggable
                          onDragStart={() => handleDragStart(post.id)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(post.id)}
                          className={[
                            'bg-white rounded-xl p-4 flex items-center gap-4 border transition-all select-none',
                            post.is_published ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 opacity-70',
                            draggedId === post.id ? 'opacity-40 scale-[0.98]' : '',
                          ].join(' ')}
                        >
                          <div className="text-slate-300 cursor-grab active:cursor-grabbing">
                            <Icon name="drag_indicator" />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => handleMovePost(post.id, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 text-slate-300 hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-default"
                              title="Move up"
                            >
                              <Icon name="keyboard_arrow_up" size={16} className=" leading-none" />
                            </button>
                            <button
                              onClick={() => handleMovePost(post.id, 'down')}
                              disabled={idx === filteredPosts.length - 1}
                              className="p-0.5 text-slate-300 hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-default"
                              title="Move down"
                            >
                              <Icon name="keyboard_arrow_down" size={16} className=" leading-none" />
                            </button>
                          </div>
                          <div className="h-10 w-10 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden">
                            {post.featured_image ? (
                              <img src={post.featured_image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Icon name="article" size={18} className=" text-slate-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              Part {idx + 1}: {post.title}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                              {post.author_name && <span>{post.author_name}</span>}
                              {post.author_name && post.published_at && <span className="w-1 h-1 rounded-full bg-slate-300" />}
                              {post.published_at && <span>{fmtDate(post.published_at)}</span>}
                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                              <span>{(post.views_count || 0).toLocaleString()} views</span>
                              {post.content_type_name && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                                  <span>{post.content_type_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {post.is_published ? (
                              <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider">Published</span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">Draft</span>
                            )}
                            <button
                              onClick={() => handleRemovePost(post.id)}
                              disabled={removingId === post.id}
                              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                              title="Remove from series"
                            >
                              <Icon name={removingId === post.id ? 'hourglass_empty' : 'delete'} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Edit Series tab (DESKTOP) ─────────────────────── */}
              {activeTab === 'edit' && (
                <div className="flex flex-col gap-5">
                  {/* Status banners */}
                  {editSuccess && (
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 rounded-xl px-5 py-3 text-sm font-medium">
                      <Icon name="check_circle" size={18} className=" text-green-500" />
                      Series updated successfully.
                    </div>
                  )}
                  {editError && (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 text-sm font-medium">
                      <Icon name="error_outline" size={18} className=" text-red-400" />
                      {editError}
                    </div>
                  )}

                  {/* Main content area with left column and right sidebar */}
                  <div className="flex flex-col lg:flex-row gap-5 items-start w-full">

                    {/* Left column: Series Details Grid */}
                    <div className="flex-1 min-w-0 flex flex-col gap-5 w-full">
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Left: Title & Description */}
                          <div className="flex flex-col gap-6">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                Title <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                name="title"
                                value={editForm.title}
                                onChange={handleEditChange}
                                disabled={editSaving}
                                placeholder="e.g., The Divine Renovation"
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white transition-colors font-semibold"
                              />
                              <p className="text-xs text-slate-400 mt-1">The public-facing name of the series</p>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Description</label>
                              <textarea
                                name="description"
                                value={editForm.description}
                                onChange={handleEditChange}
                                disabled={editSaving}
                                placeholder="Describe what this series is about, its themes, and who it's for..."
                                rows={6}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white resize-none transition-colors"
                              />
                              <p className="text-xs text-slate-400 mt-1">Shown on the public series page</p>
                            </div>
                          </div>
                          {/* Right: Cover Image */}
                          <div className="flex flex-col gap-4 items-center justify-center w-full">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 w-full">Cover Image</label>
                            <div className="w-full flex flex-col items-center gap-3">
                              <ImageUploadInput
                                value={editForm.cover_image || ''}
                                onChange={(url) => setEditForm(prev => ({ ...prev, cover_image: url }))}
                                disabled={editSaving}
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  type="button"
                                  className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                                  disabled={editSaving}
                                >
                                  Replace
                                </button>
                                <button
                                  type="button"
                                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
                                  onClick={() => setEditForm(prev => ({ ...prev, cover_image: '' }))}
                                  disabled={editSaving}
                                >
                                  Remove
                                </button>
                              </div>
                              <p className="text-xs text-slate-400 mt-2">Recommended: 1280 × 720 px (16:9), JPG or PNG</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right column: Settings sidebar */}
                    <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-5">

                      {/* Card: Visibility */}
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                          <Icon name="lock_open" size={18} className=" text-primary/70" />
                          <div>
                            <h3 className="text-sm font-bold text-slate-800">Visibility</h3>
                            <p className="text-xs text-slate-400">Who can access this series</p>
                          </div>
                        </div>
                        <div className="px-5 py-5 flex flex-col gap-3">
                          {SERIES_VISIBILITY_OPTIONS.map(opt => {
                            const icons: Record<string, string> = { PUBLIC: 'public', MEMBERS_ONLY: 'group', HIDDEN: 'visibility_off' };
                            const descs: Record<string, string> = {
                              PUBLIC: 'Anyone can discover and view',
                              MEMBERS_ONLY: 'Authenticated members only',
                              HIDDEN: 'Hidden from all listings',
                            };
                            const isActive = editForm.visibility === opt.value;
                            return (
                              <label
                                key={opt.value}
                                className={[
                                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                                  isActive
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                                ].join(' ')}
                              >
                                <input
                                  type="radio"
                                  name="visibility"
                                  value={opt.value}
                                  checked={isActive}
                                  onChange={handleEditChange}
                                  disabled={editSaving}
                                  className="sr-only"
                                />
                                <span className={`material-symbols-outlined text-lg ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                                  {icons[opt.value]}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold ${isActive ? 'text-primary' : 'text-slate-700'}`}>{opt.label}</p>
                                  <p className="text-xs text-slate-400 mt-0.5">{descs[opt.value]}</p>
                                </div>
                                {isActive && (
                                  <Icon name="check_circle" size={16} className=" text-primary" />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Card: Featured */}
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                          <Icon name="star" size={18} className=" text-amber-500" />
                          <div>
                            <h3 className="text-sm font-bold text-slate-800">Featured</h3>
                            <p className="text-xs text-slate-400">Promote on the homepage</p>
                          </div>
                        </div>
                        <div className="px-5 py-5 flex flex-col gap-4">
                          <label className="flex items-center justify-between gap-4 cursor-pointer">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">Feature this series</p>
                              <p className="text-xs text-slate-400 mt-0.5">Shown prominently to all visitors</p>
                            </div>
                            <div className="relative flex-shrink-0">
                              <input
                                type="checkbox"
                                name="is_featured"
                                checked={editForm.is_featured}
                                onChange={handleEditChange}
                                disabled={editSaving}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-primary transition-colors peer-disabled:opacity-50" />
                              <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                            </div>
                          </label>

                          {editForm.is_featured && (
                            <div className="pt-1 border-t border-slate-100 flex flex-col gap-2">
                              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Display Priority
                              </label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="number"
                                  name="featured_priority"
                                  value={editForm.featured_priority}
                                  onChange={handleEditChange}
                                  min={0}
                                  max={100}
                                  disabled={editSaving}
                                  className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50 transition-colors"
                                />
                                <p className="text-xs text-slate-400 leading-relaxed">Higher = appears earlier in featured lists</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Save / Discard */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={handleEditSave}
                          disabled={editSaving || !editForm.title.trim()}
                          className="w-full px-5 py-2.5 rounded-lg bg-primary hover:opacity-90 text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                        >
                          <Icon name={editSaving ? 'hourglass_empty' : 'check'} size={14} />
                          {editSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (series) {
                              setEditForm({
                                title: series.title,
                                description: series.description || '',
                                cover_image: series.cover_image || '',
                                visibility: series.visibility,
                                is_featured: series.is_featured,
                                featured_priority: series.featured_priority,
                              });
                            }
                            setEditError('');
                            setEditSuccess(false);
                          }}
                          disabled={editSaving}
                          className="w-full px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          Discard Changes
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* ── Analytics tab ───────────────────────────────────── */}
              {activeTab === 'analytics' && (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                  <Icon name="analytics" size={48} className=" text-slate-300" />
                  <p className="text-slate-700 font-semibold mt-4 text-lg">Analytics Coming Soon</p>
                  <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
                    Detailed per-post engagement, retention curves, and share analytics will be available here in a future update.
                  </p>
                </div>
              )}

              {/* ── Resources tab ───────────────────────────────────── */}
              {activeTab === 'resources' && (
                <div className="max-w-7xl mx-auto flex gap-6">
                  {/* Left: Placeholder or future resource content */}
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <Icon name="folder_open" size={48} className=" text-slate-300" />
                    <p className="text-slate-700 font-semibold mt-4 text-lg">Series Resources</p>
                    <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
                      Attach discussion guides, PDFs, and supplementary materials to this series.
                    </p>
                  </div>
                  {/* Right: Sidebar with resources and notes */}
                  <div className="w-80 flex-shrink-0 flex flex-col gap-4">
                    {/* Series Resources */}
                    <SeriesResourcesSidebar />
                    {/* Admin Notes */}
                    <AdminNotesSidebar />
                  </div>
                </div>
              )}

              {/* ── Settings tab ────────────────────────────────────── */}
              {activeTab === 'settings' && (
                <div className="flex flex-col lg:flex-row gap-5 items-start">
                  {/* Left column: Info cards */}
                  <div className="flex-1 min-w-0 flex flex-col gap-5">
                    {/* Card: Series Information */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                        <Icon name="info" size={18} className=" text-primary/70" />
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">Series Information</h3>
                          <p className="text-xs text-slate-400">Read-only metadata about this series</p>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {[
                          { icon: 'tag', label: 'Series ID', value: series?.id || '' },
                          { icon: 'link', label: 'Public URL Slug', value: series?.slug || '' },
                          { icon: 'calendar_today', label: 'Created', value: series ? fmtDate(series.created_at) : '' },
                          { icon: 'article', label: 'Total Posts', value: series ? `${series.post_count} posts (${series.published_post_count} published)` : '' },
                          { icon: 'visibility', label: 'Total Views', value: totalViews.toLocaleString() },
                        ].map(row => (
                          <div key={row.label} className="flex items-center gap-4 px-6 py-3.5">
                            <Icon name={row.icon} size={16} className=" text-slate-300 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-32 flex-shrink-0">{row.label}</span>
                            <span className="text-sm text-slate-800 font-medium truncate">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Card: Public URL */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
                        <Icon name="open_in_new" size={18} className=" text-primary/70" />
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">Public Page</h3>
                          <p className="text-xs text-slate-400">The live URL for this series</p>
                        </div>
                      </div>
                      <div className="px-6 py-5">
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                          <Icon name="link" size={14} className=" text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-500 truncate flex-1">/library/series/{series?.slug}</span>
                          <a
                            href={`/library/series/${series?.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-shrink-0 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                          >
                            Open
                            <Icon name="open_in_new" className=" text-xs" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Right column: Danger zone */}
                  <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-5">
                    <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2.5 bg-red-50/60">
                        <Icon name="warning" size={18} className=" text-red-500" />
                        <div>
                          <h3 className="text-sm font-bold text-red-700">Danger Zone</h3>
                          <p className="text-xs text-red-400">Irreversible actions</p>
                        </div>
                      </div>
                      <div className="px-5 py-5 flex flex-col gap-4">
                        {/* Archive */}
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-semibold text-slate-800">Archive Series</p>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Hides the series from public view without deleting any content. You can restore it later from Visibility settings.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditForm(prev => ({ ...prev, visibility: 'HIDDEN' }));
                              setActiveTab('edit');
                            }}
                            className="mt-1 w-full px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                          >
                            <Icon name="archive" size={14} />
                            Archive (Set Hidden)
                          </button>
                        </div>
                        <div className="border-t border-red-100" />
                        {/* Delete */}
                        <div className="flex flex-col gap-2">
                          <p className="text-sm font-semibold text-red-700">Delete Series</p>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Permanently removes this series. Posts assigned to it will not be deleted but will no longer be grouped.
                          </p>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteSeriesInput("");
                                setShowDeleteSeriesModal(true);
                              }}
                              className="mt-1 w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                            >
                              <Icon name="delete_forever" size={14} />
                              Delete Series
                            </button>
                              {/* Remove Post Confirmation Modal */}
                              {removeConfirmId && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) setRemoveConfirmId(null); }}>
                                  <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                      <Icon name="remove_circle" size={24} className=" text-red-400" />
                                      <h2 className="text-lg font-bold text-slate-900">Remove Post</h2>
                                    </div>
                                    <p className="text-slate-700 mb-4">Are you sure you want to remove this post from the series? This will not delete the post.</p>
                                    <div className="flex gap-3 justify-end mt-6">
                                      <button
                                        className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                                        onClick={() => setRemoveConfirmId(null)}
                                        disabled={removingId !== null}
                                      >Cancel</button>
                                      <button
                                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                                        onClick={confirmRemovePost}
                                        disabled={removingId !== null}
                                      >Remove</button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Delete Series Confirmation Modal */}
                              {showDeleteSeriesModal && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) { setShowDeleteSeriesModal(false); setDeleteSeriesInput(""); } }}>
                                  <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                      <Icon name="delete_forever" size={24} className=" text-red-400" />
                                      <h2 className="text-lg font-bold text-slate-900">Delete Series</h2>
                                    </div>
                                    <p className="text-slate-700 mb-4">Are you sure you want to delete <span className="font-semibold">"{series?.title}"</span>? This cannot be undone. Posts assigned to it will not be deleted but will no longer be grouped.</p>
                                    <p className="text-xs text-slate-500 mb-2">To confirm, type <span className="font-semibold text-slate-700">{series?.title}</span> below:</p>
                                    <input
                                      type="text"
                                      value={deleteSeriesInput}
                                      onChange={e => setDeleteSeriesInput(e.target.value)}
                                      onPaste={e => e.preventDefault()}
                                      placeholder={series?.title || "Series name"}
                                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-primary"
                                      autoFocus
                                    />
                                    <div className="flex gap-3 justify-end mt-6">
                                      <button
                                        className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                                        onClick={() => {
                                          setShowDeleteSeriesModal(false);
                                          setDeleteSeriesInput("");
                                        }}
                                      >Cancel</button>
                                      <button
                                        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                                        onClick={async () => {
                                          if (!id) return;
                                          try {
                                            await seriesService.deleteSeries(id);
                                            navigate('/admin/series');
                                          } catch (err: any) {
                                            alert('Failed to delete: ' + (err.message || 'Unknown error'));
                                          } finally {
                                            setShowDeleteSeriesModal(false);
                                            setDeleteSeriesInput("");
                                          }
                                        }}
                                        disabled={deleteSeriesInput !== (series?.title || "")}
                                      >Delete</button>
                                    </div>
                                  </div>
                                </div>
                              )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* ── Add Post Modal (Edit Mode Only) ────────────────────────── */}
      {!isCreateMode && showAddPost && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowAddPost(false); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[80vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Icon name="playlist_add" size={20} className=" text-primary" />
                <h2 className="text-base font-bold text-slate-900">Add Post to Series</h2>
              </div>
              <button
                onClick={() => setShowAddPost(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-slate-100 flex-shrink-0">
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Icon name="search" size={18} />
                </span>
                <input
                  className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Search posts by title..."
                  value={addPostSearch}
                  onChange={e => setAddPostSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Posts list */}
            <div className="overflow-y-auto flex-1">
              {loadingAvailablePosts ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Icon name="progress_activity" size={32} className=" animate-spin" />
                </div>
              ) : availablePosts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Icon name="article" size={36} className=" text-slate-200" />
                  <p className="mt-2 text-sm font-medium">
                    {addPostSearch ? 'No posts match your search' : 'All posts are already in this series'}
                  </p>
                </div>
              ) : (
                <ul>
                  {availablePosts
                    .filter(p => p.title.toLowerCase().includes(addPostSearch.toLowerCase()))
                    .map(post => (
                      <li
                        key={post.id}
                        className="flex items-center gap-4 px-6 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden">
                          {post.featured_image ? (
                            <img src={post.featured_image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Icon name="article" size={16} className=" text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{post.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                            {post.author_name && <span>{post.author_name}</span>}
                            {post.content_type_name && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <span>{post.content_type_name}</span>
                              </>
                            )}
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className={post.is_published ? 'text-green-600 font-medium' : 'text-slate-400'}>
                              {post.is_published ? 'Published' : 'Draft'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddPost(post.id)}
                          disabled={addingPostId === post.id}
                          className="flex-shrink-0 bg-primary text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-60 flex items-center gap-1.5 transition-opacity"
                        >
                          {addingPostId === post.id ? (
                            <>
                              <Icon name="hourglass_empty" size={14} />
                              Adding…
                            </>
                          ) : (
                            <>
                              <Icon name="add" size={14} />
                              Add
                            </>
                          )}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-3 border-t border-slate-100 flex-shrink-0 flex justify-end">
              <button
                onClick={() => setShowAddPost(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeriesDetailManager;

// SeriesResourcesSidebar component
const initialResources = [
  {
    id: 1,
    name: 'Discussion Guide.pdf',
    type: 'pdf' as const,
    dateAdded: 'Oct 10',
    size: '2.4 MB',
  },
  {
    id: 2,
    name: 'Series_Overview.docx',
    type: 'doc' as const,
    dateAdded: 'Oct 11',
    size: '450 KB',
  },
];

function SeriesResourcesSidebar() {
  const [resources, setResources] = useState(initialResources);
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900">Series Resources</h3>
        <button className="text-primary hover:text-primary-dark p-1">
          <Icon name="add_circle" size={18} />
        </button>
      </div>
      <ul className="space-y-3">
        {resources.map((resource) => (
          <li key={resource.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-slate-50 cursor-pointer group">
            <span className={`material-symbols-outlined ${resource.type === 'pdf' ? 'text-red-500' : 'text-blue-500'} text-2xl mt-0.5`}>
              {resource.type === 'pdf' ? 'picture_as_pdf' : 'description'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-primary">
                {resource.name}
              </p>
              <p className="text-[10px] text-slate-500">Added {resource.dateAdded} • {resource.size}</p>
            </div>
            <button
              className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setResources(resources.filter(r => r.id !== resource.id))}
            >
              <Icon name="close" size={16} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-3 border-t border-slate-100">
        <button className="w-full py-1.5 text-xs font-medium text-slate-500 hover:text-primary hover:bg-slate-50 rounded transition-colors text-center border border-dashed border-slate-300">
          + Attach File
        </button>
      </div>
    </div>
  );
}

// AdminNotesSidebar component
function AdminNotesSidebar() {
  const [adminNotes, setAdminNotes] = useState('');
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex-1">
      <h3 className="text-sm font-bold text-slate-900 mb-2">Admin Notes</h3>
      <textarea
        className="w-full h-32 text-xs p-2 border border-slate-200 rounded-md bg-slate-50 focus:ring-primary focus:border-primary resize-none"
        placeholder="Add internal notes for other admins..."
        value={adminNotes}
        onChange={e => setAdminNotes(e.target.value)}
      ></textarea>
      <div className="flex justify-end mt-2">
        <button className="text-xs text-primary font-medium hover:underline">Save Note</button>
      </div>
    </div>
  );
}
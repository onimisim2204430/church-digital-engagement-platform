/**
 * SeriesDetailManager.tsx — restyled to match admin design system
 * All logic preserved exactly. Only visual/CSS classes changed.
 * Fonts: Syne (headings) + JetBrains Mono (body) — inherited from admin-root
 * Colors: CSS vars (#030617 dark bg, #10b981 emerald)
 */
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import seriesService, { SeriesDetail, SeriesPost, SERIES_VISIBILITY_OPTIONS } from '../../../services/series.service';
import postService, { Post } from '../../../services/post.service';
import ImageUploadInput from '../../components/ImageUploadInput';
import Icon from '../../../components/common/Icon';
import { TabKey, LocationState, EditForm } from './types/series-detail.types';
import { EMPTY_EDIT_FORM } from './constants/series-detail.constants';
import { fmtDate, getAuthorName } from './helpers/series-detail.helpers';

const PostsTab     = lazy(() => import('./tabs/PostsTab'));
const EditTab      = lazy(() => import('./tabs/EditTab'));
const AnalyticsTab = lazy(() => import('./tabs/AnalyticsTab'));
const ResourcesTab = lazy(() => import('./tabs/ResourcesTab'));
const SettingsTab  = lazy(() => import('./tabs/SettingsTab'));

const mono = "'JetBrains Mono', monospace";
const syne = "'Syne', sans-serif";

const TabSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ height: 160, borderRadius: 10, background: 'var(--bg2)', animation: 'sdm-pulse 1.5s ease infinite' }} />
    <div style={{ height: 100, borderRadius: 10, background: 'var(--bg2)', animation: 'sdm-pulse 1.5s ease .15s infinite' }} />
  </div>
);

const VISIBILITY_BADGE: Record<string, React.CSSProperties> = {
  PUBLIC:       { background: 'rgba(16,185,129,.12)', color: '#10b981', border: '1px solid rgba(16,185,129,.3)' },
  MEMBERS_ONLY: { background: 'rgba(59,130,246,.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,.3)' },
  HIDDEN:       { background: 'rgba(148,163,184,.1)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' },
};

const SeriesDetailManager: React.FC = () => {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const location    = useLocation();
  const state       = location.state as LocationState;
  const isCreateMode = !id || id === 'new';

  const [series,  setSeries]  = useState<SeriesDetail | null>(null);
  const [posts,   setPosts]   = useState<SeriesPost[]>([]);
  const [loading, setLoading] = useState(!isCreateMode);
  const [error,   setError]   = useState('');

  const [activeTab, setActiveTab] = useState<TabKey>(isCreateMode ? 'edit' : 'posts');

  const [searchTerm,    setSearchTerm]    = useState('');
  const [draggedId,     setDraggedId]     = useState<string | null>(null);
  const [removingId,    setRemovingId]    = useState<string | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [showDeleteSeriesModal, setShowDeleteSeriesModal] = useState(false);
  const [deleteSeriesInput,     setDeleteSeriesInput]     = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  const [showAddPost,          setShowAddPost]          = useState(false);
  const [availablePosts,       setAvailablePosts]       = useState<Post[]>([]);
  const [addPostSearch,        setAddPostSearch]        = useState('');
  const [addingPostId,         setAddingPostId]         = useState<string | null>(null);
  const [loadingAvailablePosts,setLoadingAvailablePosts]= useState(false);

  const [editForm,    setEditForm]    = useState<EditForm>(EMPTY_EDIT_FORM);
  const [editSaving,  setEditSaving]  = useState(false);
  const [editError,   setEditError]   = useState('');
  const [editSuccess, setEditSuccess] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchSeries = useCallback(async () => {
    if (!id || isCreateMode) return;
    setLoading(true); setError('');
    try {
      const data = await seriesService.getSeries(id);
      setSeries(data);
      setPosts(data.posts || []);
    } catch (err: any) { setError(err.message || 'Failed to load series'); }
    finally { setLoading(false); }
  }, [id, isCreateMode]);

  useEffect(() => { if (!isCreateMode) fetchSeries(); }, [fetchSeries, isCreateMode]);

  useEffect(() => {
    if (series && !isCreateMode) {
      setEditForm({ title: series.title, description: series.description || '', cover_image: series.cover_image || '',
        visibility: series.visibility, is_featured: series.is_featured, featured_priority: series.featured_priority });
    }
  }, [series, isCreateMode]);

  useEffect(() => {
    if (state?.justCreated) {
      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3500);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [state, navigate, location.pathname]);

  // ── Post actions ───────────────────────────────────────────────
  const handleSaveOrder = useCallback(async () => {
    if (!id || isCreateMode) return;
    setSavingOrder(true);
    try { await seriesService.reorderSeriesPosts(id, { post_orders: posts.map((p, i) => ({ post_id: p.id, order: i + 1 })) }); }
    catch (err: any) { alert('Failed to save order: ' + (err.message || 'Unknown error')); }
    finally { setSavingOrder(false); }
  }, [id, isCreateMode, posts]);

  const handleRemovePost   = useCallback((postId: string) => { if (!id || isCreateMode) return; setRemoveConfirmId(postId); }, [id, isCreateMode]);
  const confirmRemovePost  = useCallback(async () => {
    if (!id || isCreateMode || !removeConfirmId) return;
    setRemovingId(removeConfirmId);
    try {
      await seriesService.removePostFromSeries(id, { post_id: removeConfirmId });
      setPosts(prev => prev.filter(p => p.id !== removeConfirmId));
      setSeries(prev => prev ? { ...prev, post_count: Math.max(0, prev.post_count - 1) } : prev);
    } catch (err: any) { alert('Failed to remove post: ' + (err.message || 'Unknown error')); }
    finally { setRemovingId(null); setRemoveConfirmId(null); }
  }, [id, isCreateMode, removeConfirmId]);

  const handleDragStart = useCallback((postId: string) => setDraggedId(postId), []);
  const handleDragOver  = useCallback((e: React.DragEvent) => e.preventDefault(), []);
  const handleDrop      = useCallback((targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const from = posts.findIndex(p => p.id === draggedId);
    const to   = posts.findIndex(p => p.id === targetId);
    if (from === -1 || to === -1) return;
    const reordered = [...posts]; const [item] = reordered.splice(from, 1); reordered.splice(to, 0, item);
    setPosts(reordered); setDraggedId(null);
  }, [draggedId, posts]);

  const handleMovePost = useCallback((postId: string, direction: 'up' | 'down') => {
    if (isCreateMode) return;
    const idx = posts.findIndex(p => p.id === postId);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === posts.length - 1) return;
    const newPosts = [...posts]; const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newPosts[idx], newPosts[swapIdx]] = [newPosts[swapIdx], newPosts[idx]];
    setPosts(newPosts);
  }, [isCreateMode, posts]);

  const loadAvailablePosts = useCallback(async () => {
    if (isCreateMode) return; setLoadingAvailablePosts(true);
    try {
      const result = await postService.getAllPosts({ is_published: undefined });
      const allArr: Post[] = Array.isArray(result) ? result : (result as any).results || [];
      setAvailablePosts(allArr.filter(p => !posts.some(sp => sp.id === p.id)));
    } catch { /* ignore */ }
    finally { setLoadingAvailablePosts(false); }
  }, [posts, isCreateMode]);

  useEffect(() => { if (showAddPost && !isCreateMode) { setAddPostSearch(''); loadAvailablePosts(); } }, [showAddPost, loadAvailablePosts, isCreateMode]);

  const handleAddPost = useCallback(async (postId: string) => {
    if (!id || isCreateMode) return; setAddingPostId(postId);
    try {
      await seriesService.addPostToSeries(id, { post_id: postId, series_order: posts.length + 1 });
      await fetchSeries(); setAvailablePosts(prev => prev.filter(p => p.id !== postId));
    } catch (err: any) { alert('Failed to add post: ' + (err.message || 'Error')); }
    finally { setAddingPostId(null); }
  }, [id, isCreateMode, posts.length, fetchSeries]);

  const handleEditChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') setEditForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    else if (type === 'number') setEditForm(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    else setEditForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleFormFieldChange = useCallback((field: keyof EditForm, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleCreateSeries = useCallback(async () => {
    if (!editForm.title.trim()) { setEditError('Series title is required.'); return; }
    setEditSaving(true); setEditError('');
    try {
      const newSeries = await seriesService.createSeries({ title: editForm.title, description: editForm.description,
        cover_image: editForm.cover_image, visibility: editForm.visibility,
        is_featured: editForm.is_featured, featured_priority: editForm.featured_priority });
      setCreateSuccess(true);
      setTimeout(() => navigate(`/admin/series/${newSeries.id}`, { state: { justCreated: true } }), 1500);
    } catch (err: any) {
      setEditError(err.response?.data?.message || err.response?.data?.title?.[0] || err.message || 'Failed to create series');
    } finally { setEditSaving(false); }
  }, [editForm, navigate]);

  const handleEditSave = useCallback(async () => {
    if (!id || isCreateMode || !editForm.title.trim()) { setEditError('Series title is required.'); return; }
    setEditSaving(true); setEditError(''); setEditSuccess(false);
    try {
      await seriesService.updateSeries(id, { title: editForm.title, description: editForm.description,
        cover_image: editForm.cover_image, visibility: editForm.visibility,
        is_featured: editForm.is_featured, featured_priority: editForm.featured_priority });
      setEditSuccess(true); fetchSeries(); setTimeout(() => setEditSuccess(false), 3500);
    } catch (err: any) {
      setEditError(err.response?.data?.message || err.response?.data?.title?.[0] || err.message || 'Failed to save changes');
    } finally { setEditSaving(false); }
  }, [id, isCreateMode, editForm, fetchSeries]);

  const handleDiscardChanges = useCallback(() => {
    if (series) setEditForm({ title: series.title, description: series.description || '',
      cover_image: series.cover_image || '', visibility: series.visibility,
      is_featured: series.is_featured, featured_priority: series.featured_priority });
    setEditError(''); setEditSuccess(false);
  }, [series]);

  const handleSetHidden = useCallback(() => { setEditForm(prev => ({ ...prev, visibility: 'HIDDEN' })); setActiveTab('edit'); }, []);

  const tabs = useMemo(() => {
    if (isCreateMode) return [{ key: 'edit' as TabKey, icon: 'add_circle', label: 'Create Series' }];
    return [
      { key: 'posts'     as TabKey, icon: 'list_alt',   label: 'Posts',      count: posts.length },
      { key: 'edit'      as TabKey, icon: 'edit',        label: 'Edit Series' },
      { key: 'analytics' as TabKey, icon: 'analytics',   label: 'Analytics'   },
      { key: 'resources' as TabKey, icon: 'folder_open', label: 'Resources'   },
      { key: 'settings'  as TabKey, icon: 'settings',    label: 'Settings'    },
    ];
  }, [isCreateMode, posts.length]);

  const totalViews = useMemo(() => posts.reduce((sum, p) => sum + (p.views_count || 0), 0), [posts]);
  const authorName = useMemo(() => (!isCreateMode && series) ? getAuthorName(series) : null, [isCreateMode, series]);

  // ── Loading ────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-secondary)' }}>
        <Icon name="progress_activity" size={34} className="animate-spin" />
        <p style={{ fontFamily: mono, fontSize: 12 }}>Loading series…</p>
      </div>
    </div>
  );

  if (!isCreateMode && (error || !series)) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <Icon name="error_outline" size={40} style={{ color: '#ef4444' } as any} />
        <p style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: '#ef4444', marginTop: 12 }}>{error || 'Series not found'}</p>
        <button onClick={fetchSeries} style={{ marginTop: 10, fontFamily: mono, fontSize: 11, color: 'var(--em)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Retry
        </button>
      </div>
    </div>
  );

  const visBadge = series ? VISIBILITY_BADGE[series.visibility] || VISIBILITY_BADGE.HIDDEN : null;

  /* ── RENDER ──────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <style>{`
        @keyframes sdm-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg1)', borderBottom: '1px solid var(--border-color)', padding: '16px 24px', flexShrink: 0 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {/* Breadcrumb */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: mono, fontSize: 10.5, color: 'var(--text-tertiary)', marginBottom: 14 }}>
            <button
              onClick={() => navigate('/admin/series')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontFamily: mono, fontSize: 10.5 }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--em)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)')}
            >
              <Icon name="arrow_back" size={13} />
              Series Management
            </button>
            <Icon name="chevron_right" size={11} />
            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
              {isCreateMode ? 'New Series' : series?.title}
            </span>
          </nav>

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {/* Cover image */}
              <div style={{
                width: 56, height: 56, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                background: 'var(--bg3)', border: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {!isCreateMode && series?.cover_image
                  ? <img src={series.cover_image} alt={series.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Icon name={isCreateMode ? 'add_circle' : 'account_tree'} size={26} style={{ color: 'var(--text-tertiary)' } as any} />}
              </div>

              <div>
                {/* Title + badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h2 style={{ fontFamily: syne, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-.02em' }}>
                    {isCreateMode ? 'Create New Series' : series?.title}
                  </h2>
                  {!isCreateMode && series?.is_featured && (
                    <span style={{ padding: '2px 8px', borderRadius: 9999, background: 'rgba(245,158,11,.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.3)', fontFamily: mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                      Featured
                    </span>
                  )}
                  {!isCreateMode && series && visBadge && (
                    <span style={{ padding: '2px 8px', borderRadius: 9999, fontFamily: mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', ...visBadge }}>
                      {series.visibility.replace('_', ' ')}
                    </span>
                  )}
                </div>

                {/* Meta line */}
                {!isCreateMode && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, fontFamily: mono, fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                    {authorName && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="person" size={13} />
                        Author: <strong style={{ color: 'var(--text-secondary)' }}>{authorName}</strong>
                      </span>
                    )}
                    {authorName && <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-tertiary)' }} />}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Icon name="calendar_today" size={13} />
                      Created: <strong style={{ color: 'var(--text-secondary)' }}>{series ? fmtDate(series.created_at) : ''}</strong>
                    </span>
                    {series?.date_range?.start && (
                      <>
                        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-tertiary)' }} />
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Icon name="event" size={13} />
                          Active: <strong style={{ color: 'var(--text-secondary)' }}>
                            {fmtDate(series.date_range.start)}{series.date_range.end ? ` – ${fmtDate(series.date_range.end)}` : ' – Present'}
                          </strong>
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Header actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {!isCreateMode && (
                <a
                  href={`/library/series/${series?.slug}`}
                  target="_blank" rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                    border: '1px solid var(--border-color)', background: 'none',
                    color: 'var(--text-secondary)', fontFamily: mono, fontSize: 11.5, fontWeight: 600,
                    textDecoration: 'none', transition: 'background .14s ease, color .14s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                >
                  <Icon name="visibility" size={15} />
                  View
                </a>
              )}
              {isCreateMode && (
                <button
                  onClick={handleCreateSeries}
                  disabled={editSaving || !editForm.title.trim()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'var(--em)', color: '#fff', fontFamily: mono, fontSize: 11.5, fontWeight: 700,
                    opacity: (editSaving || !editForm.title.trim()) ? .5 : 1,
                  }}
                >
                  <Icon name={editSaving ? 'hourglass_empty' : 'add_circle'} size={15} />
                  {editSaving ? 'Creating…' : 'Create Series'}
                </button>
              )}
            </div>
          </div>

          {/* Metrics strip */}
          {!isCreateMode && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14,
              marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-color)',
            }}
            className="series-metrics-grid"
            >
              {[
                { icon: 'visibility', color: '#60a5fa', bg: 'rgba(59,130,246,.10)', label: 'Total Views',       value: totalViews.toLocaleString() },
                { icon: 'article',    color: '#a78bfa', bg: 'rgba(139,92,246,.10)', label: 'Posts Published',  value: series ? `${series.published_post_count} / ${series.post_count}` : '0 / 0' },
                { icon: 'share',      color: '#fb923c', bg: 'rgba(251,146,60,.10)', label: 'Shares',           value: '—' },
                { icon: 'bookmark',   color: 'var(--em)', bg: 'var(--emd)',         label: 'Saves',            value: '—' },
              ].map(m => (
                <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name={m.icon} size={16} style={{ color: m.color } as any} />
                  </div>
                  <div>
                    <p style={{ fontFamily: mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tertiary)', margin: 0 }}>{m.label}</p>
                    <p style={{ fontFamily: syne, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{m.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg1)', borderBottom: '1px solid var(--border-color)', padding: '0 24px', flexShrink: 0 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <nav style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {tabs.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '14px 16px', borderBottom: active ? `2px solid var(--em)` : '2px solid transparent',
                    background: 'none', border: 'none', borderBottomStyle: 'solid',
                    borderBottomWidth: 2, borderBottomColor: active ? 'var(--em)' : 'transparent',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    fontFamily: mono, fontSize: 12, fontWeight: active ? 700 : 500,
                    color: active ? 'var(--em)' : 'var(--text-tertiary)',
                    transition: 'color .14s ease, border-color .14s ease',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; }}
                >
                  <Icon name={tab.icon} size={16} />
                  {tab.label}
                  {'count' in tab && tab.count !== undefined && (
                    <span style={{
                      padding: '1px 7px', borderRadius: 9999, fontFamily: mono, fontSize: 10, fontWeight: 700,
                      background: active ? 'var(--emd)' : 'var(--bg3)',
                      color: active ? 'var(--em)' : 'var(--text-tertiary)',
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-secondary)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>

          {activeTab === 'posts' && (
            <Suspense fallback={<TabSkeleton />}>
              <PostsTab
                posts={posts} searchTerm={searchTerm} onSearchChange={setSearchTerm}
                onAddPost={() => setShowAddPost(true)} onSaveOrder={handleSaveOrder}
                onRemovePost={handleRemovePost} onMovePost={handleMovePost}
                onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
                draggedId={draggedId} removingId={removingId} savingOrder={savingOrder}
              />
            </Suspense>
          )}

          {activeTab === 'edit' && (
            <Suspense fallback={<TabSkeleton />}>
              <EditTab
                isCreateMode={isCreateMode} editForm={editForm} onFormChange={handleEditChange}
                onFormFieldChange={handleFormFieldChange}
                onSave={isCreateMode ? handleCreateSeries : handleEditSave}
                onDiscard={handleDiscardChanges} onNavigate={navigate}
                editSaving={editSaving} editError={editError}
                editSuccess={editSuccess} createSuccess={createSuccess}
              />
            </Suspense>
          )}

          {activeTab === 'analytics' && <Suspense fallback={<TabSkeleton />}><AnalyticsTab /></Suspense>}
          {activeTab === 'resources' && <Suspense fallback={<TabSkeleton />}><ResourcesTab /></Suspense>}

          {activeTab === 'settings' && (
            <Suspense fallback={<TabSkeleton />}>
              <SettingsTab
                series={series} totalViews={totalViews} seriesId={id || ''}
                onDeleteSuccess={() => navigate('/admin/series')} onSetHidden={handleSetHidden}
                removeConfirmId={removeConfirmId} onSetRemoveConfirm={setRemoveConfirmId}
                removingId={removingId} showDeleteSeriesModal={showDeleteSeriesModal}
                onSetShowDeleteModal={setShowDeleteSeriesModal}
                deleteSeriesInput={deleteSeriesInput} onSetDeleteInput={setDeleteSeriesInput}
              />
            </Suspense>
          )}
        </div>
      </div>

      {/* ── Add Post Modal ──────────────────────────────────────── */}
      {showAddPost && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddPost(false); }}
        >
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border-color)', borderRadius: 14,
            boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 580, maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', margin: '0 16px',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
              <span style={{ fontFamily: syne, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Add Posts to Series</span>
              <button className="tb-btn" onClick={() => setShowAddPost(false)} style={{ width: 30, height: 30 }}>
                <Icon name="close" size={17} />
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 20px', flexShrink: 0, borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                  <Icon name="search" size={15} />
                </span>
                <input
                  placeholder="Search posts…"
                  value={addPostSearch}
                  onChange={e => setAddPostSearch(e.target.value)}
                  style={{
                    width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, boxSizing: 'border-box',
                    background: 'var(--bg3)', border: '1px solid var(--border-color)', borderRadius: 8,
                    color: 'var(--text-primary)', fontFamily: mono, fontSize: 12, outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
                />
              </div>
            </div>

            {/* List */}
            <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px' }}>
              {loadingAvailablePosts ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0', color: 'var(--text-tertiary)' }}>
                  <Icon name="progress_activity" size={20} className="animate-spin" />
                </div>
              ) : !availablePosts.length ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)', fontFamily: mono, fontSize: 12 }}>
                  No posts available
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {availablePosts
                    .filter(p => p.title.toLowerCase().includes(addPostSearch.toLowerCase()))
                    .map(post => (
                      <div key={post.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                        background: 'var(--bg3)', border: '1px solid var(--border-color)', borderRadius: 8,
                      }}>
                        <div style={{ width: 36, height: 36, borderRadius: 7, flexShrink: 0, overflow: 'hidden', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {post.featured_image
                            ? <img src={post.featured_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Icon name="article" size={16} style={{ color: 'var(--text-tertiary)' } as any} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: syne, fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {post.title}
                          </p>
                          <p style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                            {post.content_type_name || '—'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAddPost(post.id)}
                          disabled={addingPostId === post.id}
                          style={{
                            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                            background: 'var(--em)', color: '#fff', fontFamily: mono, fontSize: 11, fontWeight: 700,
                            opacity: addingPostId === post.id ? .6 : 1,
                          }}
                        >
                          <Icon name={addingPostId === post.id ? 'hourglass_empty' : 'add'} size={13} />
                          {addingPostId === post.id ? 'Adding…' : 'Add'}
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button
                onClick={() => setShowAddPost(false)}
                style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: mono, fontSize: 12, fontWeight: 600 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Confirm Modal ────────────────────────────────── */}
      {removeConfirmId && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.6)' }}
          onClick={e => { if (e.target === e.currentTarget) setRemoveConfirmId(null); }}
        >
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-color)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 360, padding: '24px', margin: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Icon name="remove_circle" size={22} style={{ color: '#ef4444' } as any} />
              <span style={{ fontFamily: syne, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Remove Post</span>
            </div>
            <p style={{ fontFamily: mono, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              Are you sure you want to remove this post from the series? This will not delete the post.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRemoveConfirmId(null)}
                disabled={removingId !== null}
                style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: mono, fontSize: 12, fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmRemovePost}
                disabled={removingId !== null}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', fontFamily: mono, fontSize: 12, fontWeight: 700 }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Responsive override ─────────────────────────────────── */}
      <style>{`
        @media (max-width: 640px) {
          .series-metrics-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </div>
  );
};

export default React.memo(SeriesDetailManager);
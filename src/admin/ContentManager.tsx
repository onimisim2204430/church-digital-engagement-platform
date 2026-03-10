// ContentManager.tsx
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { UserRole } from '../types/auth.types';
import postService, { Post } from '../services/post.service';
import draftService, { Draft } from '../services/draft.service';
import Icon from '../components/common/Icon';
// Lazy-loaded — the heavy editor bundle is only fetched/parsed when first opened.

const PostForm = lazy(() => import('./PostManagement/PostForm'));

// Icons - Using Icon component
const PlusIcon = ({ size = 20 }: { size?: number }) => <Icon name="add" size={size} />;
const EditIcon = ({ size = 18 }: { size?: number }) => <Icon name="edit" size={size} />;
const DeleteIcon = ({ size = 18 }: { size?: number }) => <Icon name="delete" size={size} />;
const EyeIcon = ({ size = 18 }: { size?: number }) => <Icon name="visibility" size={size} />;
const DraftIcon = ({ size = 18 }: { size?: number }) => <Icon name="edit_note" size={size} />;
const ScheduleIcon = ({ size = 18 }: { size?: number }) => <Icon name="schedule" size={size} />;
const PublishedIcon = ({ size = 18 }: { size?: number }) => <Icon name="check_circle" size={size} />;
const TrashIcon = ({ size = 18 }: { size?: number }) => <Icon name="delete_outline" size={size} />;

type ViewMode = 'list' | 'create' | 'edit';
type ContentTab = 'ALL' | 'PUBLISHED' | 'DRAFTS' | 'TRASH';
type ContentType = 'SERMON' | 'ARTICLE' | 'ANNOUNCEMENT' | '';

interface ContentItem {
  id: string;
  title: string;
  type: string;
  typeLabel: string;
  author: {
    id: string;
    name: string;
    email?: string;
  };
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';
  publishedAt: string | null;
  views: number;
  createdAt: string;
  updatedAt: string;
  source: 'post' | 'draft';
  isDeleted?: boolean;
  timeSinceSave?: string;
  lastAutosaveAt?: string;
  coverImage?: string;
  excerpt?: string;
  postId?: string | null;
}

// Status Badge Component
const StatusBadge: React.FC<{ status: string; scheduled?: boolean }> = ({ status, scheduled }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50';
      case 'SCHEDULED':
        return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
      case 'DRAFT':
        return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'PUBLISHED':
        return <PublishedIcon size={14} />;
      case 'SCHEDULED':
        return <ScheduleIcon size={14} />;
      case 'DRAFT':
        return <DraftIcon size={14} />;
      default:
        return null;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles()}`}>
      {getIcon()}
      {scheduled ? 'Scheduled' : status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
};

const ContentManager: React.FC = () => {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [deletedPosts, setDeletedPosts] = useState<Post[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [filterType, setFilterType] = useState<ContentType>('');
  const [activeTab, setActiveTab] = useState<ContentTab>('ALL');
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedDraftId, setAppliedDraftId] = useState<string | null>(null);

  // Read initial values from query parameters
  const initialDraftId = searchParams.get('draftId');
  const initialTab = (searchParams.get('tab') as ContentTab) || 'ALL';

  useEffect(() => {
    if (initialTab && ['ALL', 'PUBLISHED', 'DRAFTS', 'TRASH'].includes(initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    loadPosts();
    loadDrafts();
  }, []);

  useEffect(() => {
    if (activeTab === 'TRASH') {
      loadDeletedPosts();
    } else if (activeTab === 'DRAFTS') {
      loadDrafts();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!initialDraftId || appliedDraftId === initialDraftId) return;
    const draft = drafts.find(item => item.id === initialDraftId) || null;
    if (draft) {
      setSelectedDraft(draft);
      setViewMode('create');
      setActiveTab('DRAFTS');
      setAppliedDraftId(initialDraftId);
    }
  }, [initialDraftId, drafts, appliedDraftId]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await postService.getAllPosts();
      
      let postsArray: Post[] = [];
      if (data && typeof data === 'object' && 'results' in data) {
        postsArray = (data as any).results || [];
      } else if (Array.isArray(data)) {
        postsArray = data;
      } else {
        postsArray = [];
      }
      
      setPosts(postsArray);
    } catch (err: any) {
      console.error('Failed to load posts:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedPosts = async () => {
    try {
      setLoadingDeleted(true);
      const data = await postService.getAllPosts({ is_deleted: true });

      let postsArray: Post[] = [];
      if (data && typeof data === 'object' && 'results' in data) {
        postsArray = (data as any).results || [];
      } else if (Array.isArray(data)) {
        postsArray = data;
      } else {
        postsArray = [];
      }

      setDeletedPosts(postsArray);
    } catch (err: any) {
      console.error('Failed to load deleted posts:', err);
      setDeletedPosts([]);
    } finally {
      setLoadingDeleted(false);
    }
  };

  const loadDrafts = async () => {
    try {
      setLoadingDrafts(true);
      const response = await draftService.getAllDrafts();
      
      let draftsArray: Draft[] = [];
      if (response && typeof response === 'object' && 'results' in response) {
        draftsArray = (response as any).results || [];
      } else if (Array.isArray(response)) {
        draftsArray = response;
      } else {
        draftsArray = [];
      }
      
      setDrafts(draftsArray);
    } catch (err: any) {
      console.error('Failed to load drafts:', err);
      setDrafts([]);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const canModifyPost = (post: Post): boolean => {
    if (user?.role === UserRole.ADMIN) return true;
    if (user?.role === UserRole.MODERATOR) {
      return post.author === user.id;
    }
    return false;
  };

  const handleCreateNew = () => {
    setSelectedDraft(null);
    setViewMode('create');
  };

  const getDraftTitle = (draft: Draft): string => {
    if (draft.draft_data?.title) return draft.draft_data.title;
    if (draft.draft_title) return draft.draft_title;
    if (draft.post_title) return draft.post_title;
    return 'Untitled Draft';
  };

  const getDraftExcerpt = (draft: Draft): string => {
    if (draft.draft_data?.content) {
      const plainText = draft.draft_data.content.replace(/<[^>]*>/g, '');
      return plainText.substring(0, 120) + (plainText.length > 120 ? '...' : '');
    }
    return '';
  };

  const getTypeLabel = (type: string | null | undefined): string => {
    if (!type) return 'Unknown';
    const map: Record<string, string> = {
      SERMON: 'Sermon',
      ARTICLE: 'Article',
      ANNOUNCEMENT: 'Announcement',
    };
    return map[type] || type;
  };

  const handleEditPost = async (post: Post) => {
    if (post.is_published) {
      try {
        setCreatingDraft(true);
        const fullPost = await postService.getPost(post.id);
        const draftData = {
          title: fullPost.title || 'Untitled Draft',
          content: fullPost.content || '',
          content_type: fullPost.content_type || undefined,
          status: fullPost.status,
          comments_enabled: fullPost.comments_enabled,
          reactions_enabled: fullPost.reactions_enabled,
          featured_image: fullPost.featured_image || '',
          video_url: fullPost.video_url || '',
          audio_url: fullPost.audio_url || '',
          is_featured: (fullPost as any).is_featured,
          featured_priority: (fullPost as any).featured_priority,
          series: fullPost.series || null,
          series_order: fullPost.series_order,
        };

        const draft = await draftService.createDraft({
          draft_data: draftData,
          content_type: fullPost.content_type || null,
          post: fullPost.id,
        });

        setSelectedDraft(draft);
        setViewMode('create');
      } catch (err: any) {
        console.error('Failed to create draft copy:', err);
        alert(err.response?.data?.detail || 'Failed to create draft copy');
      } finally {
        setCreatingDraft(false);
      }
      return;
    }

    setSelectedPost(post);
    setViewMode('edit');
  };

  const handleEditDraft = async (draft: Draft) => {
    try {
      const fullDraft = await draftService.getDraft(draft.id);
      setSelectedDraft(fullDraft);
      setViewMode('create');
    } catch (error) {
      console.error('Failed to fetch full draft:', error);
      alert('Failed to load draft. Please try again.');
    }
  };

  const handleDeletePost = async (post: Post) => {
    if (!canModifyPost(post)) {
      alert('You do not have permission to delete this post');
      return;
    }

    confirm({
      title: 'Delete Post',
      message: `Are you sure you want to delete "${post.title}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await postService.deletePost(post.id);
          await Promise.all([loadPosts(), loadDeletedPosts()]);
        } catch (err: any) {
          alert(err.response?.data?.message || 'Failed to delete post');
        }
      },
    });
  };

  const handleDeleteDraft = async (draft: Draft) => {
    confirm({
      title: 'Delete Draft',
      message: `Are you sure you want to delete "${getDraftTitle(draft)}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await draftService.deleteDraft(draft.id);
          await loadDrafts();
        } catch (err: any) {
          alert(err.response?.data?.detail || 'Failed to delete draft');
        }
      },
    });
  };

  const handleTogglePublish = async (post: Post) => {
    if (!canModifyPost(post)) {
      alert('You do not have permission to modify this post');
      return;
    }

    try {
      await postService.updatePost(post.id, {
        status: post.is_published ? 'DRAFT' : 'PUBLISHED',
      } as any);
      await loadPosts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update post');
    }
  };

  const handlePublishDraft = async (draft: Draft) => {
    try {
      await draftService.publishDraft(draft.id);
      await Promise.all([loadPosts(), loadDrafts()]);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to publish draft');
    }
  };

  const handleSuccess = () => {
    setViewMode('list');
    setSelectedPost(null);
    setSelectedDraft(null);
    loadPosts();
    loadDrafts();
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedPost(null);
    setSelectedDraft(null);
  };

  const items: ContentItem[] = useMemo(() => {
    const combinedPosts = [...posts, ...deletedPosts];
    const postItems: ContentItem[] = combinedPosts.map((post) => ({
      id: post.id,
      title: post.title || 'Untitled',
      type: post.content_type || '',
      typeLabel: getTypeLabel(post.content_type),
      author: {
        id: post.author,
        name: post.author_name || 'Unknown',
        email: post.author_email,
      },
      status: post.status,
      publishedAt: post.published_at,
      views: post.views_count || 0,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      source: 'post',
      isDeleted: (post as any).is_deleted || false,
      coverImage: (post as any).featured_image,
      excerpt: (post as any).excerpt,
    }));

    const draftItems: ContentItem[] = drafts.map((draft) => {
      const title = getDraftTitle(draft);
      const excerpt = getDraftExcerpt(draft);
      return {
        id: draft.id,
        title,
        type: draft.content_type || '',
        typeLabel: getTypeLabel(draft.content_type),
        author: {
          id: draft.user,
          name: draft.user_name || 'Unknown',
          email: draft.user_email || '',
        },
        status: 'DRAFT',
        publishedAt: null,
        views: 0,
        createdAt: draft.created_at,
        updatedAt: draft.last_autosave_at,
        source: 'draft',
        isDeleted: false,
        timeSinceSave: draft.time_since_save,
        lastAutosaveAt: draft.last_autosave_at,
        excerpt,
        postId: draft.post,
      };
    });

    return [...postItems, ...draftItems];
  }, [posts, deletedPosts, drafts]);

  const filteredItems = items.filter(item => {
    // Role-based filtering
    if (user?.role === UserRole.MODERATOR) {
      if (item.source === 'post' && String(item.author.id) !== String(user.id)) {
        return false;
      }
    }

    // Tab filtering
    if (activeTab === 'PUBLISHED') {
      return item.source === 'post' && item.status === 'PUBLISHED' && !item.isDeleted;
    }
    if (activeTab === 'DRAFTS') {
      return (item.status === 'DRAFT' || item.source === 'draft') && !item.isDeleted;
    }
    if (activeTab === 'TRASH') {
      return item.isDeleted === true;
    }

    // ALL tab - exclude deleted
    if (item.isDeleted) return false;
    return true;
  }).filter(item => {
    // Type filter
    if (filterType && item.type !== filterType) return false;
    return true;
  }).filter(item => {
    // Search filter
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(term) ||
      item.author.name.toLowerCase().includes(term) ||
      item.typeLabel.toLowerCase().includes(term)
    );
  });

  const getStatusCounts = () => {
    const published = items.filter(i => i.status === 'PUBLISHED' && !i.isDeleted).length;
    const drafts = items.filter(i => i.status === 'DRAFT' && !i.isDeleted).length;
    const scheduled = items.filter(i => i.status === 'SCHEDULED' && !i.isDeleted).length;
    const trash = items.filter(i => i.isDeleted).length;
    const total = items.filter(i => !i.isDeleted).length;
    return { total, published, drafts, scheduled, trash };
  };

  const counts = getStatusCounts();

  const editorFallback = (
    <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
        <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-primary rounded-full animate-spin" />
        <span className="text-sm font-medium">Loading editor…</span>
      </div>
    </div>
  );


  if (viewMode === 'create') {
    return (
      <div className="h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
        <Suspense fallback={editorFallback}>
          <PostForm
            key={selectedDraft?.id || 'new'}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            initialData={selectedDraft}
          />
        </Suspense>
      </div>
    );
  }

  if (viewMode === 'edit' && selectedPost) {
    return (
      <div className="h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
        <Suspense fallback={editorFallback}>
          <PostForm
            mode="edit"
            postId={selectedPost.id}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      {/* Page Header */}
      <div className="bg-white/40 dark:bg-slate-900/80 backdrop-blur-md border-b border-white/20 dark:border-slate-700/50 px-8 py-5 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Content Management
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {user?.role === UserRole.ADMIN 
                ? 'Manage all sermons, articles, and announcements' 
                : 'Manage your sermons, articles, and announcements'}
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            disabled={creatingDraft}
            className="bg-primary hover:opacity-90 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <PlusIcon size={18} />
            Create New Post
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="bg-white/40 dark:bg-slate-900/80 backdrop-blur-md border-b border-white/20 dark:border-slate-700/50 px-8 py-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto grid grid-cols-5 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</p>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{counts.total}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <PublishedIcon size={14} /> Published
            </p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">{counts.published}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <DraftIcon size={14} /> Drafts
            </p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{counts.drafts}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ScheduleIcon size={14} /> Scheduled
            </p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">{counts.scheduled}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <TrashIcon size={14} /> Trash
            </p>
            <p className="text-lg font-bold text-slate-600 dark:text-slate-400 mt-1">{counts.trash}</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white/40 dark:bg-slate-900/80 backdrop-blur-md border-b border-white/20 dark:border-slate-700/50 px-8 py-3 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {(['ALL', 'PUBLISHED', 'DRAFTS', 'TRASH'] as ContentTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === tab
                      ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Icon name="search" size={20} /></div>
                <input
                type="text"
                placeholder="Search by title, author..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                filterType === ''
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setFilterType('SERMON')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                filterType === 'SERMON'
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Sermons
            </button>
            <button
              onClick={() => setFilterType('ARTICLE')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                filterType === 'ARTICLE'
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Articles
            </button>
            <button
              onClick={() => setFilterType('ANNOUNCEMENT')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                filterType === 'ANNOUNCEMENT'
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Announcements
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {/* Loading State */}
          {(loading || loadingDrafts || loadingDeleted) && (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 h-24 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !loadingDrafts && !loadingDeleted && filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Icon name="description" size={32} className="text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-semibold text-base">
                {searchTerm || filterType ? 'No content matches your filters' : 'No content yet'}
              </p>
              {!searchTerm && !filterType && activeTab === 'ALL' && (
                <button
                  onClick={handleCreateNew}
                  className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold"
                >
                  Create your first post
                </button>
              )}
            </div>
          )}

          {/* Content List */}
          {!loading && !loadingDrafts && !loadingDeleted && filteredItems.length > 0 && (
            <div className="flex flex-col gap-3">
              {filteredItems.map(item => (
                <div
                  key={`${item.source}-${item.id}`}
                  onClick={() => {
                    if (item.source === 'post' && item.status !== 'DRAFT') {
                      handleEditPost(posts.find(p => p.id === item.id)!);
                    } else if (item.source === 'draft') {
                      const draft = drafts.find(d => d.id === item.id);
                      if (draft) handleEditDraft(draft);
                    }
                  }}
                  className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4 hover:border-primary/40 dark:hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
                >
                  {/* Cover/Type Icon */}
                  <div className="h-14 w-14 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-600">
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Icon name={item.type === 'SERMON' ? 'mic' : 
                                    item.type === 'ARTICLE' ? 'article' : 
                                    item.type === 'ANNOUNCEMENT' ? 'campaign' : 'description'} size={22} className="text-slate-300 dark:text-slate-500" />
                      </div>
                    )}
                  </div>

                  {/* Content Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{item.title}</h3>
                      <StatusBadge status={item.status} />
                      {item.source === 'draft' && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 text-xs font-medium border border-purple-200 dark:border-purple-800/50">
                          Draft
                        </span>
                      )}
                      {item.postId && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs font-medium border border-blue-200 dark:border-blue-800/50">
                          Linked to Post
                        </span>
                      )}
                    </div>

                    {item.excerpt && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{item.excerpt}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Icon name="person" size={12} />
                        {item.author.name}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-400">
                        {item.typeLabel}
                      </span>
                      {item.source === 'post' && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span className="flex items-center gap-1">
                            <Icon name="visibility" size={12} />
                            {item.views.toLocaleString()} views
                          </span>
                        </>
                      )}
                      {item.source === 'draft' && item.timeSinceSave && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400" title={item.lastAutosaveAt}>
                            <Icon name="schedule" size={12} />
                            Saved {item.timeSinceSave}
                          </span>
                        </>
                      )}
                      {item.publishedAt && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>
                            {new Date(item.publishedAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div onClick={e => e.stopPropagation()} className="flex items-center gap-1 flex-shrink-0">
                    {item.source === 'draft' ? (
                      <>
                        <button
                          onClick={() => {
                            const draft = drafts.find(d => d.id === item.id);
                            if (draft) handleEditDraft(draft);
                          }}
                          className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="Edit draft"
                        >
                          <EditIcon size={18} />
                        </button>
                        <button
                          onClick={() => {
                            const draft = drafts.find(d => d.id === item.id);
                            if (draft) handlePublishDraft(draft);
                          }}
                          className="p-2 text-slate-400 hover:text-green-600 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="Publish draft"
                        >
                          <PublishedIcon size={18} />
                        </button>
                        <button
                          onClick={() => {
                            const draft = drafts.find(d => d.id === item.id);
                            if (draft) handleDeleteDraft(draft);
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Delete draft"
                        >
                          <DeleteIcon size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        {item.status === 'PUBLISHED' && (
                          <button
                            onClick={() => window.open(`/post/${item.id}`, '_blank')}
                            className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="View post"
                          >
                            <EyeIcon size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const post = posts.find(p => p.id === item.id);
                            if (post) handleEditPost(post);
                          }}
                          className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="Edit post"
                        >
                          <EditIcon size={18} />
                        </button>
                        <button
                          onClick={() => {
                            const post = posts.find(p => p.id === item.id);
                            if (post) handleTogglePublish(post);
                          }}
                          className="p-2 text-slate-400 hover:text-amber-600 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                          title={item.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                        >
                          <PublishedIcon size={18} />
                        </button>
                        <button
                          onClick={() => {
                            const post = posts.find(p => p.id === item.id);
                            if (post) handleDeletePost(post);
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                          title="Delete post"
                        >
                          <DeleteIcon size={18} />
                        </button>
                      </>
                    )}
                    <Icon name="chevron_right" size={20} className="text-slate-300 dark:text-slate-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentManager;
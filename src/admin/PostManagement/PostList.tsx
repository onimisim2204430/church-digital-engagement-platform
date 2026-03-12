/**
 * PostList Component
 * Displays all posts with filtering and action buttons
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import postService, { Post } from '../../services/post.service';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '../../types/auth.types';
import './PostList.css';

interface PostListProps {
  onEdit: (post: Post) => void;
  onRefresh: () => void;
}

const PostList: React.FC<PostListProps> = ({ onEdit, onRefresh }) => {
  const { confirm } = useConfirm();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const canModifyPost = useCallback((post: Post): boolean => {
    if (user?.role === UserRole.ADMIN) return true;
    if (user?.role === UserRole.MODERATOR) {
      return post.author === user.id;
    }
    return false;
  }, [user]);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const data = await postService.getAllPosts();

      if (data && typeof data === 'object' && 'results' in data) {
        setPosts((data as any).results || []);
      } else if (Array.isArray(data)) {
        setPosts(data);
      } else {
        setPosts([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const filteredPosts = useMemo(() => {
    let filtered = posts;

    if (user?.role === UserRole.MODERATOR) {
      filtered = filtered.filter(post => post.author === user.id);
    }

    if (filterType) {
      filtered = filtered.filter(post =>
        post.content_type_slug?.toLowerCase() === filterType.toLowerCase() ||
        post.post_type === filterType
      );
    }

    if (filterStatus) {
      filtered = filtered.filter(post => post.status === filterStatus);
    }

    if (debouncedSearchQuery) {
      const searchLower = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title?.toLowerCase().includes(searchLower) ||
        post.content_type_name?.toLowerCase().includes(searchLower) ||
        post.post_type?.toLowerCase().includes(searchLower) ||
        post.status?.toLowerCase().includes(searchLower) ||
        post.author_name?.toLowerCase().includes(searchLower) ||
        post.author_email?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [posts, filterType, filterStatus, debouncedSearchQuery, user]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '—';
    }
  };

  const getLastUpdated = (post: Post): string => {
    if (!post.published_at) {
      return formatDate(post.created_at);
    }

    const publishedDate = new Date(post.published_at).getTime();
    const updatedDate = new Date(post.updated_at).getTime();

    if (updatedDate - publishedDate > 1000) {
      return formatDateTime(post.updated_at);
    }

    return formatDateTime(post.published_at);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'status-published';
      case 'DRAFT': return 'status-draft';
      default: return 'status-draft';
    }
  };

  const sortedPosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      if (a.status === 'DRAFT' && b.status !== 'DRAFT') return -1;
      if (a.status !== 'DRAFT' && b.status === 'DRAFT') return 1;
      if (a.status === 'DRAFT' && b.status === 'DRAFT') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }

      if (a.published_at && b.published_at) {
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      }
      return 0;
    });
  }, [filteredPosts]);

  const handleDelete = useCallback((id: string, title: string) => {
    confirm({
      title: 'Delete Post',
      message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      confirmLabel: 'Delete Post',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        await postService.deletePost(id);
        await loadPosts();
        onRefresh();
      },
    });
  }, [confirm, loadPosts, onRefresh]);

  const handlePublish = useCallback(async (id: string) => {
    try {
      await postService.publishPost(id);
      await loadPosts();
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to publish post');
    }
  }, [loadPosts, onRefresh]);

  const handleUnpublish = useCallback((id: string) => {
    confirm({
      title: 'Unpublish Post',
      message: 'Unpublish this post? It will be reverted to draft and hidden from users.',
      confirmLabel: 'Unpublish',
      cancelLabel: 'Cancel',
      variant: 'neutral',
      onConfirm: async () => {
        await postService.unpublishPost(id);
        await loadPosts();
        onRefresh();
      },
    });
  }, [confirm, loadPosts, onRefresh]);

  if (loading) {
    return <div className="loading">Loading posts...</div>;
  }

  return (
    <div className="post-list-container">
      <div className="post-list-header">
        <h2>Content Management</h2>
        <button className="btn-refresh" onClick={loadPosts}>
          Refresh
        </button>
      </div>

      <div className="post-filters">
        <div className="filter-group">
          <label>Type:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="SERMON">Sermon</option>
            <option value="ARTICLE">Article</option>
            <option value="ANNOUNCEMENT">Announcement</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search by title, type, status, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {sortedPosts.length === 0 ? (
        <div className="no-posts">
          {searchQuery || filterType || filterStatus
            ? 'No posts found matching your search criteria'
            : 'No posts found'}
        </div>
      ) : (
        <div className="post-table">
          <div className="result-count">
            Showing {sortedPosts.length} of {posts.length} post{posts.length !== 1 ? 's' : ''}
          </div>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Type</th>
                <th>Status</th>
                <th>Published At</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedPosts.map((post) => {
                const canModify = canModifyPost(post);
                const isOwnPost = post.author === user?.id;

                return (
                  <tr key={post.id} className={!canModify ? 'read-only-post' : ''}>
                    <td>
                      <div className="post-title">
                        {post.title}
                        {!isOwnPost && user?.role === UserRole.MODERATOR && (
                          <span className="ownership-badge" title={`Created by ${post.author_name}`}>
                            🔒
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="author-info" title={post.author_email}>
                        {post.author_name}
                      </div>
                    </td>
                    <td>
                      <span className="post-type-badge">{post.content_type_name || post.post_type}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(post.status)}`}>
                        {post.status}
                      </span>
                    </td>
                    <td>
                      {post.status === 'PUBLISHED' && post.published_at ? formatDateTime(post.published_at) : '—'}
                    </td>
                    <td>
                      {getLastUpdated(post)}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-action btn-edit"
                          onClick={() => onEdit(post)}
                          disabled={!canModify}
                          title={canModify ? 'Edit' : "You don't have permission to edit this post"}
                        >
                          Edit
                        </button>

                        {post.status !== 'PUBLISHED' && (
                          <button
                            className="btn-action btn-publish"
                            onClick={() => handlePublish(post.id)}
                            disabled={!canModify}
                            title={canModify ? 'Publish Now' : "You don't have permission to publish this post"}
                          >
                            Publish
                          </button>
                        )}

                        {post.status === 'PUBLISHED' && (
                          <button
                            className="btn-action btn-unpublish"
                            onClick={() => handleUnpublish(post.id)}
                            disabled={!canModify}
                            title={canModify ? 'Unpublish' : "You don't have permission to unpublish this post"}
                          >
                            Unpublish
                          </button>
                        )}

                        <button
                          className="btn-action btn-delete"
                          onClick={() => handleDelete(post.id, post.title)}
                          disabled={!canModify}
                          title={canModify ? 'Delete' : "You don't have permission to delete this post"}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PostList;

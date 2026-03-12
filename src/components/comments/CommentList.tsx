/**
 * CommentList Component
 * Main container for all comments on a post
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import commentService, { Comment } from '../../services/comment.service';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';
import './comments.css';

interface CommentListProps {
  postId: string;
  commentsEnabled?: boolean;
}

const CommentList: React.FC<CommentListProps> = ({ postId, commentsEnabled = true }) => {
  const { isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await commentService.getPostComments(postId);
      setComments(data);
    } catch (err: any) {
      console.error('Failed to load comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateComment = async (content: string, isQuestion?: boolean) => {
    try {
      await commentService.createComment({
        content,
        post: postId,
        is_question: isQuestion || false
      });
      await loadComments(); // Refresh comments
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="comments-section">
        <h3>Comments</h3>
        <div className="comments-loading">Loading comments...</div>
      </div>
    );
  }

  return (
    <div className="comments-section">
      <h3 className="comments-title">
        Comments ({comments.length})
      </h3>

      {/* Show disabled notice only to authenticated users */}
      {!commentsEnabled && isAuthenticated && (
        <div className="comments-disabled-notice">
          <p>💬 Comments are disabled for this post.</p>
          {comments.length > 0 && (
            <p className="existing-comments-info">Existing comments are shown below but new comments cannot be added.</p>
          )}
        </div>
      )}

      {/* Comment form for authenticated users - only if enabled */}
      {commentsEnabled && isAuthenticated && (
        <div className="new-comment-section">
          <CommentForm onSubmit={handleCreateComment} />
        </div>
      )}

      {/* Auth prompt for unauthenticated users (regardless of enabled state) */}
      {!isAuthenticated && (
        <div className="auth-prompt">
          <p>Please <a href="/login">sign in</a> to join the discussion.</p>
        </div>
      )}

      {/* Error message */}
      {error && <div className="comments-error">{error}</div>}

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="no-comments">
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="comments-list">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              onReplyAdded={loadComments}
              onCommentDeleted={loadComments}
              commentsEnabled={commentsEnabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentList;

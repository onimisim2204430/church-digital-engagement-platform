/**
 * Discussion Section Component
 * Nested comment system for sermon discussions
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../contexts/ToastContext';
import commentService, { Comment, CommentUser } from '../services/comment.service';
import Icon from './common/Icon';
import './DiscussionSection.css';

interface DiscussionSectionProps {
  postId: string;
  commentsEnabled?: boolean;
}

interface CommentItemProps {
  comment: Comment;
  postId: string;
  onReply: (commentId: string, content: string, isQuestion: boolean) => Promise<void>;
  depth?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, postId, onReply, depth = 0 }) => {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyIsQuestion, setReplyIsQuestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const MAX_PREVIEW_LENGTH = 300;

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onReply(comment.id, replyContent.trim(), replyIsQuestion);
      setReplyContent('');
      setReplyIsQuestion(false);
      setIsReplying(false);
      setShowReplies(true);
    } catch (error) {
      console.error('Failed to submit reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserInitials = (commentUser: CommentUser) => {
    return commentService.getUserInitials(commentUser);
  };

  const getUserFullName = (commentUser: CommentUser) => {
    return commentService.getUserFullName(commentUser);
  };

  const isOwnComment = user && comment.user.id === user.id;
  const maxDepth = 5; // Limit visual nesting depth

  return (
    <div className={`comment-item ${depth > 0 ? 'comment-reply' : ''}`} style={{ marginLeft: Math.min(depth, maxDepth) * 24 }}>
      <div className="comment-header">
        <div className="comment-avatar-wrapper">
          {comment.user.profile_picture ? (
            <img src={comment.user.profile_picture} alt={getUserFullName(comment.user)} className="comment-avatar" />
          ) : (
            <div className="comment-avatar comment-avatar-initials">
              {getUserInitials(comment.user)}
            </div>
          )}
        </div>
        
        <div className="comment-meta">
          <div className="comment-author">
            {getUserFullName(comment.user)}
            {isOwnComment && <span className="you-badge">You</span>}
            {comment.is_question && <span className="question-badge">Question</span>}
          </div>
          <div className="comment-time">{commentService.formatCommentDate(comment.created_at)}</div>
        </div>
      </div>

      <div className="comment-body">
        {isExpanded || comment.content.length <= MAX_PREVIEW_LENGTH ? (
          <p>{comment.content}</p>
        ) : (
          <>
            <p>{comment.content.substring(0, MAX_PREVIEW_LENGTH)}...</p>
            <button onClick={() => setIsExpanded(true)} className="read-more-btn">
              Read More
            </button>
          </>
        )}
      </div>

      <div className="comment-actions">
        {!comment.is_deleted && (
          <button onClick={() => setIsReplying(!isReplying)} className="comment-action-btn">
            <Icon name="reply" size={16} />
            Reply
          </button>
        )}
        {comment.reply_count > 0 && (
          <button onClick={() => setShowReplies(!showReplies)} className="comment-action-btn">
            <Icon name={showReplies ? 'expand_less' : 'expand_more'} size={16} />
            {showReplies ? 'Hide' : 'Show'} {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      {isReplying && (
        <div className="comment-reply-form">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write your reply..."
            className="comment-reply-textarea"
            rows={3}
          />
          <label className="question-checkbox">
            <input
              type="checkbox"
              checked={replyIsQuestion}
              onChange={(e) => setReplyIsQuestion(e.target.checked)}
            />
            <span>Mark as question</span>
          </label>
          <div className="comment-reply-actions">
            <button onClick={() => setIsReplying(false)} className="btn-cancel">Cancel</button>
            <button 
              onClick={handleReplySubmit} 
              disabled={!replyContent.trim() || isSubmitting}
              className="btn-submit"
            >
              {isSubmitting ? 'Posting...' : 'Post Reply'}
            </button>
          </div>
        </div>
      )}

      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DiscussionSection: React.FC<DiscussionSectionProps> = ({ postId, commentsEnabled = true }) => {
  const { user, isAuthenticated } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [newCommentIsQuestion, setNewCommentIsQuestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const data = await commentService.getPostComments(postId);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
      showError('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    if (!isAuthenticated) {
      showError('Please sign in to comment');
      return;
    }

    setIsSubmitting(true);
    try {
      await commentService.createComment({
        content: newComment.trim(),
        post: postId,
        is_question: newCommentIsQuestion
      });
      setNewComment('');
      setNewCommentIsQuestion(false);
      showSuccess('Comment posted successfully');
      await fetchComments();
    } catch (error: any) {
      console.error('Failed to post comment:', error);
      const msg = error.response?.data?.error || error.message || 'Failed to post comment';
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (commentId: string, content: string, isQuestion: boolean = false) => {
    if (!isAuthenticated) {
      showError('Please sign in to reply');
      return;
    }

    await commentService.replyToComment(commentId, content, postId, isQuestion);
    showSuccess('Reply posted successfully');
    await fetchComments();
  };

  if (!commentsEnabled) {
    return (
      <div className="discussion-disabled">
        <Icon name="comments_disabled" size={48} className="text-graphite opacity-40" />
        <p>Comments are disabled for this sermon.</p>
      </div>
    );
  }

  return (
    <div className="discussion-section">
      <div className="discussion-header">
        <h3>Discussion ({comments.length})</h3>
        <p className="discussion-subtitle">Share your thoughts and insights from this sermon</p>
      </div>

      {/* New Comment Form */}
      {isAuthenticated ? (
        <div className="new-comment-form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            className="new-comment-textarea"
            rows={4}
          />
          <div className="new-comment-form-footer">
            <label className="question-checkbox">
              <input
                type="checkbox"
                checked={newCommentIsQuestion}
                onChange={(e) => setNewCommentIsQuestion(e.target.checked)}
              />
              <span>Mark as question</span>
            </label>
            <button 
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              className="btn-post-comment"
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      ) : (
        <div className="login-prompt">
          <Icon name="lock" size={24} />
          <p>Please <a href="/login">sign in</a> to join the discussion</p>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="comments-loading">
          <div className="spinner"></div>
          <p>Loading discussion...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="comments-empty">
          <Icon name="chat_bubble_outline" size={64} className="text-graphite opacity-20" />
          <p>No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="comments-list">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              onReply={handleReply}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscussionSection;

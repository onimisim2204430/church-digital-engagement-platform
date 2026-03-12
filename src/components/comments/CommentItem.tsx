/**
 * CommentItem Component
 * Displays a single comment with nested replies
 */
import React, { useState } from 'react';
import { Comment } from '../../services/comment.service';
import commentService from '../../services/comment.service';
import CommentForm from './CommentForm';
import { useAuth } from '../../auth/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import './comments.css';

interface CommentItemProps {
  comment: Comment;
  postId: string;
  onReplyAdded: () => void;
  onCommentDeleted?: () => void;
  commentsEnabled?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  postId,
  onReplyAdded,
  onCommentDeleted,
  commentsEnabled = true
}) => {
  const { isAuthenticated, user } = useAuth();
  const { confirm } = useConfirm();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [moderatorReplyExpanded, setModeratorReplyExpanded] = useState(false);

  // Check if this is a question with moderator/admin reply
  const isQuestion = comment.is_question;
  const isAnswered = comment.question_status === 'ANSWERED';
  const moderatorReply = comment.replies?.find(reply => 
    ['ADMIN', 'MODERATOR'].includes(reply.user.role)
  );
  const hasModeratorReply = !!moderatorReply;
  
  // Collapse logic: Show first 2 replies, hide rest until expanded
  const INITIAL_VISIBLE_REPLIES = 2;
  const totalReplies = comment.replies?.length || 0;
  const shouldCollapse = totalReplies > 2;
  const visibleReplies = repliesExpanded || !shouldCollapse 
    ? comment.replies 
    : comment.replies?.slice(0, INITIAL_VISIBLE_REPLIES);
  const hiddenCount = totalReplies - INITIAL_VISIBLE_REPLIES;

  const handleReply = async (content: string, isQuestion?: boolean) => {
    try {
      await commentService.replyToComment(comment.id, content, postId, isQuestion);
      setShowReplyForm(false);
      onReplyAdded(); // Refresh comments
    } catch (error) {
      console.error('Failed to reply:', error);
      throw error;
    }
  };

  const handleDelete = async () => {
    confirm({
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment? This action cannot be undone.',
      confirmLabel: 'Delete Comment',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await commentService.deleteComment(comment.id);
          if (onCommentDeleted) {
            onCommentDeleted();
          }
        } catch (error) {
          console.error('Failed to delete comment:', error);
          alert('Failed to delete comment');
        } finally {
          setIsDeleting(false);
        }
      },
    });
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="comment-item">
      <div className="comment-avatar">
        {commentService.getUserInitials(comment.user)}
      </div>
      <div className="comment-content-wrapper">
        <div className="comment-header">
          <div className="comment-author">
            <strong>{comment.user.first_name} {comment.user.last_name}</strong>
            {comment.user.role === 'ADMIN' && (
              <span className="admin-badge">Admin</span>
            )}
            {comment.user.role === 'MODERATOR' && (
              <span className="admin-badge" style={{ backgroundColor: '#10b981' }}>Moderator</span>
            )}
            {isQuestion && (
              <span className="question-badge">Question</span>
            )}
            {isAnswered && (
              <span className="answered-badge">✓ Answered</span>
            )}
          </div>
          <span className="comment-date">
            {commentService.formatCommentDate(comment.created_at)}
          </span>
        </div>

        <div className="comment-body">
          {comment.content}
        </div>

        <div className="comment-actions">
          {isAuthenticated && !showReplyForm && commentsEnabled && (
            <button
              className="btn-comment-action"
              onClick={() => setShowReplyForm(true)}
            >
              Reply
            </button>
          )}
          {isAuthenticated && !showReplyForm && !commentsEnabled && (
            <span className="reply-disabled-notice" title="Comments are disabled for this post">
              Reply (Disabled)
            </span>
          )}
          {isAdmin && !comment.is_deleted && (
            <button
              className="btn-comment-action btn-delete"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>

        {showReplyForm && (
          <div className="reply-form-container">
            <CommentForm
              onSubmit={handleReply}
              placeholder="Write a reply..."
              buttonText="Post Reply"
              autoFocus={true}
            />
            <button
              className="btn-cancel-reply"
              onClick={() => setShowReplyForm(false)}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Moderator/Admin reply to question - shown collapsed with "Read more" */}
        {isQuestion && hasModeratorReply && moderatorReply && (
          <div className="moderator-reply-container">
            <div className="moderator-reply-preview">
              <div className="moderator-reply-header">
                <span className="moderator-label">
                  {moderatorReply.user.role === 'ADMIN' ? '👨‍💼 Admin' : '👤 Moderator'} Response:
                </span>
                <strong>{moderatorReply.user.first_name} {moderatorReply.user.last_name}</strong>
              </div>
              {!moderatorReplyExpanded && (
                <div className="moderator-reply-preview-text">
                  {moderatorReply.content.substring(0, 150)}{moderatorReply.content.length > 150 ? '...' : ''}
                </div>
              )}
            </div>
            
            <button
              className="btn-toggle-moderator-reply"
              onClick={() => setModeratorReplyExpanded(!moderatorReplyExpanded)}
            >
              {moderatorReplyExpanded ? '▲ Hide response' : '▼ Read more'}
            </button>
            
            {moderatorReplyExpanded && (
              <div className="moderator-reply-expanded">
                <CommentItem
                  commentsEnabled={commentsEnabled}
                  key={moderatorReply.id}
                  comment={moderatorReply}
                  postId={postId}
                  onReplyAdded={onReplyAdded}
                  onCommentDeleted={onReplyAdded}
                />
              </div>
            )}
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="comment-replies">
            {visibleReplies?.map((reply) => {
              // Skip moderator reply if it's being shown above
              if (isQuestion && hasModeratorReply && reply.id === moderatorReply?.id) {
                return null;
              }
              return (
                <CommentItem
                  commentsEnabled={commentsEnabled}
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  onReplyAdded={onReplyAdded}
                  onCommentDeleted={onReplyAdded}
                />
              );
            })}
            
            {/* Toggle button for collapsed replies */}
            {shouldCollapse && (
              <button
                className="btn-toggle-replies"
                onClick={() => setRepliesExpanded(!repliesExpanded)}
                aria-expanded={repliesExpanded}
                aria-label={repliesExpanded ? 'Hide replies' : `View ${hiddenCount} more ${hiddenCount === 1 ? 'reply' : 'replies'}`}
              >
                {repliesExpanded ? 'Hide replies' : `View ${hiddenCount} more ${hiddenCount === 1 ? 'reply' : 'replies'}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentItem;

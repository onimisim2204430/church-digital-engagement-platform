/**
 * CommentForm Component
 * Form for creating new comments
 */
import React, { useState } from 'react';
import './comments.css';

interface CommentFormProps {
  onSubmit: (content: string, isQuestion?: boolean) => Promise<void>;
  placeholder?: string;
  buttonText?: string;
  autoFocus?: boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  placeholder = 'Write a comment...',
  buttonText = 'Post Comment',
  autoFocus = false
}) => {
  const [content, setContent] = useState('');
  const [isQuestion, setIsQuestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    if (content.length > 5000) {
      setError('Comment is too long (max 5000 characters)');
      return;
    }

    try {
      setError('');
      setIsSubmitting(true);
      await onSubmit(content, isQuestion);
      setContent(''); // Clear form on success
      setIsQuestion(false); // Reset question checkbox
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <textarea
        className="comment-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={isSubmitting}
        autoFocus={autoFocus}
      />
      {error && <div className="comment-error">{error}</div>}
      
      <div className="comment-form-footer">
        <div className="comment-form-options">
          <label className="question-checkbox-label">
            <input
              type="checkbox"
              checked={isQuestion}
              onChange={(e) => setIsQuestion(e.target.checked)}
              disabled={isSubmitting}
            />
            <span className="checkbox-text">
              📝 Mark as question (requires moderator response)
            </span>
          </label>
        </div>
        
        <div className="comment-form-actions">
          <span className="character-count">{content.length} / 5000</span>
          <button
            type="submit"
            className="btn-submit-comment"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? 'Posting...' : buttonText}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CommentForm;

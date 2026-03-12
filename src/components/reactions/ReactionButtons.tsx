/**
 * ReactionButtons Component
 * WhatsApp-style emoji reactions for posts
 * Authenticated members can react, visitors see counts only
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import reactionService, { ReactionStats } from '../../services/reaction.service';
import './ReactionButtons.css';

interface ReactionButtonsProps {
  postId: string;
  reactionsEnabled?: boolean;
}

const ReactionButtons: React.FC<ReactionButtonsProps> = ({ postId, reactionsEnabled = true }) => {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<ReactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reacting, setReacting] = useState<string | null>(null);

  useEffect(() => {
    loadReactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const loadReactions = async () => {
    try {
      setLoading(true);
      const data = await reactionService.getReactions(postId);
      setStats(data);
    } catch (error) {
      console.error('Failed to load reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReact = async (emoji: string) => {
    if (!isAuthenticated || !reactionsEnabled) {
      return; // Disabled or not authenticated
    }

    try {
      setReacting(emoji);
      await reactionService.reactToPost(postId, emoji);
      // Reload reactions to get updated counts and user reaction
      await loadReactions();
    } catch (error: any) {
      console.error('Failed to react:', error);
      const errorMessage = error.response?.data?.error || 'Failed to react. Please try again.';
      alert(errorMessage);
    } finally {
      setReacting(null);
    }
  };

  if (loading) {
    return <div className="reactions-loading">Loading reactions...</div>;
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="reactions-container">
      <div className="reactions-buttons">
        {stats.reactions.map((reaction) => {
          const isSelected = stats.user_reaction === reaction.emoji;
          const isReacting = reacting === reaction.emoji;
          const isDisabled = !isAuthenticated || !reactionsEnabled || isReacting;
          
          // Determine tooltip text
          let tooltipText = '';
          if (!reactionsEnabled) {
            tooltipText = 'Reactions are disabled for this post';
          } else if (!isAuthenticated) {
            tooltipText = 'Log in to react';
          } else {
            tooltipText = `React with ${reactionService.getEmojiLabel(reaction.emoji)}`;
          }
          
          return (
            <button
              key={reaction.emoji}
              className={`btn-reaction ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => handleReact(reaction.emoji)}
              disabled={isDisabled}
              title={tooltipText}
              aria-label={`${reactionService.getEmojiLabel(reaction.emoji)}: ${reaction.count}`}
              aria-pressed={isSelected}
            >
              <span className="reaction-emoji">{reaction.emoji}</span>
              <span className="reaction-count">{reaction.count}</span>
            </button>
          );
        })}
      </div>
      
      {!reactionsEnabled && isAuthenticated ? (
        <p className="reactions-disabled">Reactions are disabled for this post</p>
      ) : !isAuthenticated ? (
        <p className="reactions-prompt">Log in to react to this post</p>
      ) : null}
    </div>
  );
};

export default ReactionButtons;

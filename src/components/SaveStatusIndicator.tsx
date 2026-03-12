import React from 'react';
import './SaveStatusIndicator.css';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  lastSaved: Date | null;
  error?: string | null;
}

const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({ 
  status, 
  lastSaved,
  error 
}) => {
  const getStatusText = () => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        if (lastSaved) {
          const secondsAgo = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
          if (secondsAgo < 60) {
            return 'All changes saved';
          }
          const minutesAgo = Math.floor(secondsAgo / 60);
          return `Saved ${minutesAgo}m ago`;
        }
        return 'All changes saved';
      case 'error':
        return error || 'Save failed';
      case 'idle':
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'saving':
        return (
          <svg className="save-status-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 12 12"
                to="360 12 12"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        );
      case 'saved':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'error':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (status === 'idle') {
    return null;
  }

  return (
    <div className={`save-status-indicator save-status-${status}`}>
      <span className="save-status-icon">{getStatusIcon()}</span>
      <span className="save-status-text">{getStatusText()}</span>
    </div>
  );
};

export default SaveStatusIndicator;

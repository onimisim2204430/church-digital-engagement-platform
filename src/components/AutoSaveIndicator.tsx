/**
 * AutoSaveIndicator Component
 * Displays subtle save status indicator during post creation/editing
 * Shows: saving, saved, error states
 */

import React from 'react';
import './AutoSaveIndicator.css';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSaved?: Date | null;
  error?: string | null;
}

const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  status,
  lastSaved,
  error
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'saving':
        return (
          <svg className="autosave-spinner" width="14" height="14" viewBox="0 0 14 14">
            <circle
              cx="7"
              cy="7"
              r="5"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="25.13"
              strokeDashoffset="12.57"
            />
          </svg>
        );
      case 'saved':
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M11.5 3.5L5.5 9.5L2.5 6.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'error':
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="2" />
            <path d="M7 4V7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="7" cy="10" r="0.5" fill="currentColor" />
          </svg>
        );
      case 'offline':
        return (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 7H5M9 7H12M7 2V5M7 9V12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return lastSaved ? `All changes saved (${formatTimeSince(lastSaved)})` : 'All changes saved';
      case 'error':
        return error || 'Save failed - retrying';
      case 'offline':
        return 'Connection lost - saving locally';
      case 'idle':
        return '';
      default:
        return '';
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 'saving':
        return 'autosave-status-saving';
      case 'saved':
        return 'autosave-status-saved';
      case 'error':
        return 'autosave-status-error';
      case 'offline':
        return 'autosave-status-offline';
      default:
        return '';
    }
  };

  const formatTimeSince = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (status === 'idle') {
    return null;
  }

  return (
    <div className={`autosave-indicator ${getStatusClass()}`}>
      <span className="autosave-icon">{getStatusIcon()}</span>
      <span className="autosave-text">{getStatusText()}</span>
    </div>
  );
};

export default AutoSaveIndicator;

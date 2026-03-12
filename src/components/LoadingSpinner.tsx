/**
 * LoadingSpinner - Premium Loading Component
 * Enterprise-grade loading states and indicators
 */
import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  variant = 'primary', 
  text,
  fullScreen = false,
  overlay = false,
  className = ''
}) => {
  const spinnerClasses = `
    loading-spinner
    loading-spinner--${size}
    loading-spinner--${variant}
    ${fullScreen ? 'loading-spinner--fullscreen' : ''}
    ${overlay ? 'loading-spinner--overlay' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const content = (
    <div className="loading-spinner__content">
      <div className="loading-spinner__icon">
        <div className="spinner-ring">
          <div className="spinner-ring__segment"></div>
          <div className="spinner-ring__segment"></div>
          <div className="spinner-ring__segment"></div>
          <div className="spinner-ring__segment"></div>
        </div>
      </div>
      {text && (
        <div className="loading-spinner__text">
          {text}
        </div>
      )}
    </div>
  );

  return (
    <div className={spinnerClasses}>
      {content}
    </div>
  );
};

// Skeleton Loading Component for Content Placeholders
export const SkeletonLoad: React.FC<{
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}> = ({ width = '100%', height = '20px', borderRadius = '4px', className = '' }) => {
  return (
    <div 
      className={`skeleton-load ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
};

// Card Skeleton for ContentCard placeholders
export const ContentCardSkeleton: React.FC<{
  showImage?: boolean;
  showAuthor?: boolean;
  showStats?: boolean;
}> = ({ showImage = true, showAuthor = true, showStats = true }) => {
  return (
    <div className="content-card-skeleton">
      {showImage && (
        <div className="content-card-skeleton__media">
          <SkeletonLoad width="100%" height="200px" borderRadius="0" />
        </div>
      )}
      <div className="content-card-skeleton__body">
        <SkeletonLoad width="60px" height="20px" borderRadius="12px" className="type-badge-skeleton" />
        <SkeletonLoad width="90%" height="24px" borderRadius="4px" className="title-skeleton" />
        <SkeletonLoad width="100%" height="16px" borderRadius="4px" />
        <SkeletonLoad width="80%" height="16px" borderRadius="4px" />
        <SkeletonLoad width="60%" height="16px" borderRadius="4px" />
        
        {showAuthor && (
          <div className="content-card-skeleton__meta">
            <div className="author-skeleton">
              <SkeletonLoad width="28px" height="28px" borderRadius="50%" />
              <SkeletonLoad width="120px" height="14px" borderRadius="4px" />
            </div>
            <SkeletonLoad width="80px" height="14px" borderRadius="4px" />
          </div>
        )}
        
        {showStats && (
          <div className="content-card-skeleton__stats">
            <SkeletonLoad width="60px" height="12px" borderRadius="4px" />
            <SkeletonLoad width="40px" height="12px" borderRadius="4px" />
            <SkeletonLoad width="70px" height="12px" borderRadius="4px" />
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
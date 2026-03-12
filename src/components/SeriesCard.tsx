/**
 * SeriesCard - Premium Series Display Component
 * Enterprise-grade card design for content series
 */
import React from 'react';
import { PublicSeries } from '../services/publicSeries.service';
import publicSeriesService from '../services/publicSeries.service';
import './SeriesCard.css';

interface SeriesCardProps {
  series: PublicSeries;
  size?: 'small' | 'medium' | 'large';
  showAuthor?: boolean;
  showStats?: boolean;
  showProgress?: boolean;
  onClick?: (series: PublicSeries) => void;
  className?: string;
}

const SeriesCard: React.FC<SeriesCardProps> = ({
  series,
  size = 'medium',
  showAuthor = true,
  showStats = true,
  showProgress = true,
  onClick,
  className = ''
}) => {
  const status = publicSeriesService.getSeriesStatus(series);
  const isNew = publicSeriesService.isNewSeries(series);
  const engagement = publicSeriesService.getEngagementSummary(series);
  
  const handleClick = () => {
    if (onClick) {
      onClick(series);
    }
  };

  const cardClasses = `
    series-card 
    series-card--${size} 
    ${onClick ? 'series-card--clickable' : ''}
    ${series.is_featured ? 'series-card--featured' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <article className={cardClasses} onClick={handleClick}>
      {/* New Series Badge */}
      {isNew && (
        <div className="series-card__new-badge">
          <span className="new-badge__icon">🆕</span>
          <span className="new-badge__text">New Series</span>
        </div>
      )}

      {/* Featured Badge */}
      {series.is_featured && (
        <div className="series-card__featured-badge">
          <span className="featured-badge__icon">⭐</span>
          <span className="featured-badge__text">Featured</span>
        </div>
      )}

      {/* Cover Image */}
      <div className="series-card__media">
        <img 
          src={series.cover_image || '/api/placeholder/400/240'} 
          alt={series.title}
          className="series-card__image"
          loading="lazy"
        />
        
        {/* Status Overlay */}
        <div className="series-card__status-overlay">
          <div 
            className="status-badge"
            style={{
              backgroundColor: status.color,
              color: 'white'
            }}
          >
            <span className="status-badge__icon">{status.icon}</span>
            <span className="status-badge__text">{status.label}</span>
          </div>
        </div>

        {/* Post Count */}
        <div className="series-card__post-count">
          <span className="post-count__value">{series.published_post_count}</span>
          <span className="post-count__label">posts</span>
        </div>
      </div>

      {/* Content Body */}
      <div className="series-card__body">
        {/* Title */}
        <h3 className="series-card__title">
          {series.title}
        </h3>

        {/* Description */}
        <p className="series-card__description">
          {series.description}
        </p>

        {/* Progress Bar */}
        {showProgress && series.completion_percentage !== undefined && (
          <div className="series-card__progress">
            <div className="progress-bar">
              <div 
                className="progress-bar__fill"
                style={{ width: `${series.completion_percentage}%` }}
              />
            </div>
            <span className="progress-text">
              {series.completion_percentage}% complete
            </span>
          </div>
        )}

        {/* Author */}
        {showAuthor && (
          <div className="series-card__author">
            {series.author.profile_picture ? (
              <img 
                src={series.author.profile_picture} 
                alt={series.author.full_name}
                className="author-avatar"
              />
            ) : (
              <div 
                className="author-avatar author-avatar-initials"
                title={series.author.full_name}
              >
                {(() => {
                  const parts = series.author.full_name.trim().split(' ').filter(Boolean);
                  if (parts.length === 1) return parts[0][0].toUpperCase();
                  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                })()}
              </div>
            )}
            <div className="author-info">
              <span className="author-name">{series.author.full_name}</span>
              <span className="author-title">Series Author</span>
            </div>
          </div>
        )}

        {/* Stats */}
        {showStats && series.total_views > 0 && (
          <div className="series-card__stats">
            <div className="series-card__engagement">
              <span className="engagement-text">{engagement}</span>
            </div>
            
            {series.duration_estimate && (
              <div className="series-card__duration">
                <span className="duration-icon">⏱️</span>
                <span className="duration-text">{series.duration_estimate}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Hint */}
        {onClick && (
          <div className="series-card__action">
            <span className="action-text">View Series</span>
            <span className="action-arrow">→</span>
          </div>
        )}
      </div>
    </article>
  );
};

export default SeriesCard;
/**
 * AuthorAvatar - Premium Author Display Component
 * Enterprise-grade author profile display with status indicators
 */
import React from 'react';
import './AuthorAvatar.css';

interface Author {
  id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  profile_picture?: string;
  full_name?: string;
}

interface AuthorAvatarProps {
  author: Author;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  showEmail?: boolean;
  showStatus?: boolean;
  isOnline?: boolean;
  badge?: string;
  badgeColor?: string;
  clickable?: boolean;
  onClick?: (author: Author) => void;
  className?: string;
}

const AuthorAvatar: React.FC<AuthorAvatarProps> = ({
  author,
  size = 'md',
  showName = false,
  showEmail = false,
  showStatus = false,
  isOnline = false,
  badge,
  badgeColor = '#2268f5',
  clickable = false,
  onClick,
  className = ''
}) => {
  const displayName = author.full_name || `${author.first_name} ${author.last_name}`.trim();
  const initials = `${author.first_name?.[0] || ''}${author.last_name?.[0] || ''}`.toUpperCase();

  const handleClick = () => {
    if (clickable && onClick) {
      onClick(author);
    }
  };

  const avatarClasses = `
    author-avatar
    author-avatar--${size}
    ${clickable ? 'author-avatar--clickable' : ''}
    ${showName || showEmail ? 'author-avatar--with-info' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={avatarClasses} onClick={handleClick}>
      {/* Avatar Container */}
      <div className="author-avatar__container">
        {/* Avatar Image or Initials */}
        <div className="author-avatar__image">
          {author.profile_picture ? (
            <img 
              src={author.profile_picture} 
              alt={displayName}
              className="avatar-img"
              loading="lazy"
            />
          ) : (
            <div className="avatar-initials">
              <span>{initials}</span>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        {showStatus && (
          <div className={`author-avatar__status ${isOnline ? 'status--online' : 'status--offline'}`} />
        )}

        {/* Badge */}
        {badge && (
          <div 
            className="author-avatar__badge"
            style={{ backgroundColor: badgeColor }}
          >
            <span className="badge-text">{badge}</span>
          </div>
        )}
      </div>

      {/* Author Info */}
      {(showName || showEmail) && (
        <div className="author-avatar__info">
          {showName && (
            <div className="author-avatar__name">{displayName}</div>
          )}
          {showEmail && author.email && (
            <div className="author-avatar__email">{author.email}</div>
          )}
        </div>
      )}
    </div>
  );
};

// Author Group Component for multiple authors
export const AuthorGroup: React.FC<{
  authors: Author[];
  maxVisible?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showOverflow?: boolean;
  className?: string;
}> = ({ 
  authors, 
  maxVisible = 3, 
  size = 'sm', 
  showOverflow = true,
  className = '' 
}) => {
  const visibleAuthors = authors.slice(0, maxVisible);
  const overflowCount = authors.length - maxVisible;

  return (
    <div className={`author-group author-group--${size} ${className}`}>
      {visibleAuthors.map((author, index) => (
        <AuthorAvatar
          key={author.id || index}
          author={author}
          size={size}
          className={`author-group__item author-group__item--${index}`}
        />
      ))}
      
      {showOverflow && overflowCount > 0 && (
        <div className={`author-avatar author-avatar--${size} author-group__overflow`}>
          <div className="author-avatar__container">
            <div className="author-avatar__image">
              <div className="avatar-initials overflow-count">
                <span>+{overflowCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Author Card for larger displays
export const AuthorCard: React.FC<{
  author: Author;
  subtitle?: string;
  description?: string;
  stats?: Array<{ label: string; value: string | number }>;
  actions?: React.ReactNode;
  className?: string;
}> = ({
  author,
  subtitle,
  description,
  stats = [],
  actions,
  className = ''
}) => {
  const displayName = author.full_name || `${author.first_name} ${author.last_name}`.trim();

  return (
    <div className={`author-card ${className}`}>
      <div className="author-card__header">
        <AuthorAvatar 
          author={author} 
          size="lg" 
          showStatus={true}
          isOnline={true}
        />
        <div className="author-card__info">
          <h3 className="author-card__name">{displayName}</h3>
          {subtitle && (
            <p className="author-card__subtitle">{subtitle}</p>
          )}
        </div>
      </div>

      {description && (
        <div className="author-card__description">
          <p>{description}</p>
        </div>
      )}

      {stats.length > 0 && (
        <div className="author-card__stats">
          {stats.map((stat, index) => (
            <div key={index} className="author-stat">
              <span className="author-stat__value">{stat.value}</span>
              <span className="author-stat__label">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {actions && (
        <div className="author-card__actions">
          {actions}
        </div>
      )}
    </div>
  );
};

export default AuthorAvatar;
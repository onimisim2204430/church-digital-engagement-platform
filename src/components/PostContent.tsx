/**
 * PostContent Component
 * Safely renders HTML content from posts created with RichTextEditor
 * Includes sanitization and formatting preservation
 */

import React from 'react';
// @ts-ignore - DOMPurify types issue
import DOMPurify from 'dompurify';
import './PostContent.css';

interface PostContentProps {
  content: string;
  className?: string;
}

const PostContent: React.FC<PostContentProps> = ({ content, className = '' }) => {
  // Sanitize HTML to prevent XSS attacks while preserving formatting
  const sanitizeContent = (html: string): string => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'strong', 'em', 'u', 's', 'strike',
        'blockquote', 'pre', 'code',
        'ul', 'ol', 'li',
        'a', 'img',
        'span', 'div',
        'table', 'thead', 'tbody', 'tr', 'th', 'td'
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel',
        'src', 'alt', 'width', 'height',
        'class', 'id',
        'style' // Allow inline styles for colors, alignment, etc.
      ],
      ALLOW_DATA_ATTR: false,
      ADD_ATTR: ['target'], // Allow target for links
    });
  };

  const sanitizedContent = sanitizeContent(content);

  return (
    <div 
      className={`post-content-display ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};

export default PostContent;

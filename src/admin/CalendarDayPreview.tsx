/**
 * Calendar Day Preview - Hover tooltip showing day summary
 * Displays title and first 100 chars of content
 */

import React from 'react';
import Icon from '../components/common/Icon';

interface PreviewItem {
  type: 'daily-word';
  title: string;
  content?: string;
  scripture?: string;
}

interface CalendarDayPreviewProps {
  date: string;
  items: PreviewItem[];
  position?: { x: number; y: number };
}

const CalendarDayPreview: React.FC<CalendarDayPreviewProps> = ({
  date,
  items,
  position = { x: 0, y: 0 },
}) => {
  if (items.length === 0) return null;

  const dateObj = new Date(date);
  const dateStr = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  // Responsive positioning - prevent cutoff
  const previewWidth = 320;
  const previewHeight = 200;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let left = position.x;
  let top = position.y;
  
  // Check if preview would go off right edge
  if (left + previewWidth > viewportWidth) {
    left = position.x - previewWidth - 20; // Position to the left instead
  }
  
  // Check if preview would go off bottom edge
  if (top + previewHeight > viewportHeight) {
    top = viewportHeight - previewHeight - 20;
  }
  
  // Ensure it doesn't go off top or left edges
  if (top < 10) top = 10;
  if (left < 10) left = 10;

  return (
    <div
      className="calendar-preview"
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 99,
      }}
    >
      <div className="preview-items">
        {items.map((item, idx) => (
          <div key={idx} className="preview-item">
            <div className="preview-content">
              <h4 className="preview-title">{item.title || 'Untitled'}</h4>
              {item.scripture && (
                <p className="preview-scripture">
                  <Icon name="auto_stories" size={12} />
                  {item.scripture}
                </p>
              )}
              {item.content && (
                <p className="preview-text">
                  {item.content.substring(0, 150)}
                  {item.content.length > 150 ? '...' : ''}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarDayPreview;

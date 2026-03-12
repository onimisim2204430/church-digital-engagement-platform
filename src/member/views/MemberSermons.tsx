/**
 * Member Sermons View
 * Browse and access sermons and teachings
 */

import React from 'react';
import { Card } from '../../shared/components/Card';
import { BookIcon } from '../../shared/components/Icons';

const MemberSermons: React.FC = () => {
  return (
    <>
      <div className="welcome-section-pro">
        <h1 className="welcome-title">Sermons & Teachings</h1>
        <p className="welcome-subtitle">Browse recent messages, watch videos, and grow spiritually</p>
      </div>

      <Card>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
            <BookIcon size={64} />
          </div>
          <h3 style={{ margin: '0 0 var(--space-2)', color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600, lineHeight: '1.3' }}>Coming Soon</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
            Sermon library and video content will be available here
          </p>
        </div>
      </Card>
    </>
  );
};

export default MemberSermons;

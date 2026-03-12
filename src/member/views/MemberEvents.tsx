/**
 * Member Events View
 * View and register for church events
 */

import React from 'react';
import { Card } from '../../shared/components/Card';
import { CalendarIcon } from '../../shared/components/Icons';

const MemberEvents: React.FC = () => {
  return (
    <>
      <div className="welcome-section-pro">
        <h1 className="welcome-title">Events & Activities</h1>
        <p className="welcome-subtitle">Stay updated with church events and register for activities</p>
      </div>

      <Card>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
            <CalendarIcon size={64} />
          </div>
          <h3 style={{ margin: '0 0 var(--space-2)', color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600, lineHeight: '1.3' }}>Coming Soon</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
            Church events and registration system will be available here
          </p>
        </div>
      </Card>
    </>
  );
};

export default MemberEvents;

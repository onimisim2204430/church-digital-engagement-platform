/**
 * Member Prayer View
 * Share and view prayer requests
 */

import React from 'react';
import { Card } from '../../shared/components/Card';
import { HeartIcon } from '../../shared/components/Icons';

const MemberPrayer: React.FC = () => {
  return (
    <>
      <div className="welcome-section-pro">
        <h1 className="welcome-title">Prayer Requests</h1>
        <p className="welcome-subtitle">Share your prayer needs and pray for others</p>
      </div>

      <Card>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
            <HeartIcon size={64} />
          </div>
          <h3 style={{ margin: '0 0 var(--space-2)', color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600, lineHeight: '1.3' }}>Coming Soon</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
            Prayer request sharing and prayer wall will be available here
          </p>
        </div>
      </Card>
    </>
  );
};

export default MemberPrayer;

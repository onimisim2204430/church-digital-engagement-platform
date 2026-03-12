/**
 * Member Community View
 * Engage with church community discussions
 */

import React from 'react';
import { Card } from '../../shared/components/Card';
import { MessageCircleIcon } from '../../shared/components/Icons';

const MemberCommunity: React.FC = () => {
  return (
    <>
      <div className="welcome-section-pro">
        <h1 className="welcome-title">Community Discussion</h1>
        <p className="welcome-subtitle">Engage with fellow members and join conversations</p>
      </div>

      <Card>
        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
            <MessageCircleIcon size={64} />
          </div>
          <h3 style={{ margin: '0 0 var(--space-2)', color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600, lineHeight: '1.3' }}>Coming Soon</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
            Community forums and discussion boards will be available here
          </p>
        </div>
      </Card>
    </>
  );
};

export default MemberCommunity;

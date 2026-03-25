/**
 * Member Events — Sovereign Component
 * SOVEREIGN: zero shared imports from admin or public.
 */

import React from 'react';

const MemberEvents: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--m-s5)' }}>
    <div>
      <h1 style={{
        fontSize: 'var(--m-text-2xl)',
        fontWeight: 'var(--m-w-bold)',
        color: 'var(--m-text-primary)',
        margin: '0 0 var(--m-s2)',
        letterSpacing: 'var(--m-tracking-snug)',
        lineHeight: 'var(--m-lh-snug)',
      }}>
        Events &amp; Activities
      </h1>
      <p style={{
        fontSize: 'var(--m-text-base)',
        color: 'var(--m-text-secondary)',
        margin: 0,
      }}>
        Stay updated with church events and register for activities
      </p>
    </div>

    <div className="m-card m-card-outlined" style={{ textAlign: 'center' }}>
      <div className="m-card-body" style={{ padding: 'var(--m-s9) var(--m-s6)' }}>
        <div className="m-empty-icon" style={{ margin: '0 auto var(--m-s4)' }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '40px' }}
            aria-hidden="true"
          >
            event
          </span>
        </div>
        <h3 style={{
          fontSize: 'var(--m-text-xl)',
          fontWeight: 'var(--m-w-semibold)',
          color: 'var(--m-text-primary)',
          margin: '0 0 var(--m-s2)',
        }}>
          Coming Soon
        </h3>
        <p style={{
          color: 'var(--m-text-secondary)',
          fontSize: 'var(--m-text-base)',
          margin: 0,
          lineHeight: 'var(--m-lh-relaxed)',
        }}>
          Church events and registration system will be available here
        </p>
      </div>
    </div>
  </div>
);

export default MemberEvents;

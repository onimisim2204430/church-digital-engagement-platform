/**
 * Member Sermons — Sovereign Component
 * SOVEREIGN: zero shared imports from admin or public.
 */

import React from 'react';

const MemberSermons: React.FC = () => (
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
        Sermons &amp; Teachings
      </h1>
      <p style={{
        fontSize: 'var(--m-text-base)',
        color: 'var(--m-text-secondary)',
        margin: 0,
      }}>
        Browse recent messages, watch videos, and grow spiritually
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
            play_circle
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
          Sermon library and video content will be available here
        </p>
      </div>
    </div>
  </div>
);

export default MemberSermons;

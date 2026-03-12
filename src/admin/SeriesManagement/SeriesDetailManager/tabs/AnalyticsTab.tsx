/* ─── AnalyticsTab.tsx ─────────────────────────────────────────────────────── */
/**
 * AnalyticsTab — restyled to admin design system
 */
import React from 'react';
import Icon from '../../../../components/common/Icon';

const mono = "'JetBrains Mono', monospace";
const syne = "'Syne', sans-serif";

export const AnalyticsTab: React.FC = () => (
  <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-color)', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--emd)', border: '1px solid var(--em-border, rgba(16,185,129,.22))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
      <Icon name="analytics" size={26} style={{ color: 'var(--em)' } as any} />
    </div>
    <p style={{ fontFamily: syne, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Analytics Coming Soon</p>
    <p style={{ fontFamily: mono, fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
      Detailed per-post engagement, retention curves, and share analytics will be available here in a future update.
    </p>
  </div>
);

AnalyticsTab.displayName = 'AnalyticsTab';
export default React.memo(AnalyticsTab);
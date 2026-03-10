/**
 * ResourcesTab.tsx — restyled to admin design system. Logic preserved.
 */
import React from 'react';
import Icon from '../../../../components/common/Icon';
import SeriesResourcesSidebar from '../components/SeriesResourcesSidebar';
import AdminNotesSidebar from '../components/AdminNotesSidebar';

const mono = "'JetBrains Mono', monospace";
const syne = "'Syne', sans-serif";

const ResourcesTab: React.FC = () => (
  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
    {/* Main placeholder */}
    <div style={{
      flex: '1 1 300px', minHeight: 240,
      background: 'var(--bg2)', border: '1px solid var(--border-color)', borderRadius: 12,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--emd)', border: '1px solid rgba(16,185,129,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Icon name="folder_open" size={24} style={{ color: 'var(--em)' } as any} />
      </div>
      <p style={{ fontFamily: syne, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>Series Resources</p>
      <p style={{ fontFamily: mono, fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.6, maxWidth: 320, margin: 0 }}>
        Attach discussion guides, PDFs, and supplementary materials to this series.
      </p>
    </div>

    {/* Sidebar */}
    <div style={{ width: '100%', maxWidth: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SeriesResourcesSidebar />
      <AdminNotesSidebar />
    </div>
  </div>
);

ResourcesTab.displayName = 'ResourcesTab';
export default React.memo(ResourcesTab);
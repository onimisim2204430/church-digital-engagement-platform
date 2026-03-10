/**
 * SeriesResourcesSidebar.tsx — restyled to admin design system. Logic preserved.
 */
import React, { useState } from 'react';
import Icon from '../../../../components/common/Icon';
import { Resource } from '../types/series-detail.types';

interface SeriesResourcesSidebarProps {
  resources?: Resource[];
  onRemove?: (id: number) => void;
}

const mono = "'JetBrains Mono', monospace";
const syne = "'Syne', sans-serif";

const SeriesResourcesSidebar: React.FC<SeriesResourcesSidebarProps> = ({ resources = [], onRemove }) => {
  const [items, setItems] = useState<Resource[]>(resources);

  const handleRemove = (id: number) => {
    setItems(items.filter(r => r.id !== id));
    onRemove?.(id);
  };

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="attach_file" size={14} style={{ color: 'var(--em)' } as any} />
          <span style={{ fontFamily: syne, fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>Series Resources</span>
        </div>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--em)'; (e.currentTarget as HTMLElement).style.background = 'var(--emd)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
        >
          <Icon name="add_circle" size={16} />
        </button>
      </div>

      <div style={{ padding: '8px 10px' }}>
        {items.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: mono, fontSize: 11 }}>
            No resources attached
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map(resource => (
              <li key={resource.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22, flexShrink: 0, color: resource.type === 'pdf' ? '#f87171' : '#60a5fa' }}>
                  {resource.type === 'pdf' ? 'picture_as_pdf' : 'description'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {resource.name}
                  </p>
                  <p style={{ fontFamily: mono, fontSize: 9.5, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                    Added {resource.dateAdded} · {resource.size}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(resource.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-tertiary)', borderRadius: 5, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                >
                  <Icon name="close" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Attach button */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
          <button style={{
            width: '100%', padding: '7px 0', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
            background: 'none', border: '1px dashed var(--border-color)',
            color: 'var(--text-tertiary)', fontFamily: mono, fontSize: 11, fontWeight: 600,
            transition: 'all .13s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--em)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--em)'; (e.currentTarget as HTMLElement).style.background = 'var(--emd)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
          >
            + Attach File
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SeriesResourcesSidebar);
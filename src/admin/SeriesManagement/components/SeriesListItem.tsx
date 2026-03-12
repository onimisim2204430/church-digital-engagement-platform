/**
 * SeriesListItem.tsx — restyled to admin CSS var system
 */
import React from 'react';
import { Series } from '../types/series-manager.types';
import SeriesViewsCell from './SeriesViewsCell';
import { getVisibilityBadgeClass } from '../helpers/series-manager.helpers';
import Icon from '../../../components/common/Icon';

interface SeriesListItemProps {
  series: Series;
  onClick: () => void;
}

const VISIBILITY_STYLES: Record<string, React.CSSProperties> = {
  PUBLIC:       { background: 'rgba(16,185,129,.10)', color: 'var(--em)',   border: '1px solid rgba(16,185,129,.25)' },
  MEMBERS_ONLY: { background: 'rgba(59,130,246,.10)', color: '#60a5fa',     border: '1px solid rgba(59,130,246,.25)' },
  HIDDEN:       { background: 'rgba(148,163,184,.08)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' },
};
const VISIBILITY_LABELS: Record<string, string> = {
  PUBLIC: 'Public', MEMBERS_ONLY: 'Members Only', HIDDEN: 'Hidden',
};

const mono = "'JetBrains Mono', monospace";
const syne = "'Syne', sans-serif";

const SeriesListItem: React.FC<SeriesListItemProps> = ({ series: s, onClick }) => {
  const visBadge = VISIBILITY_STYLES[s.visibility] || VISIBILITY_STYLES.HIDDEN;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border-color)',
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: 'pointer',
        transition: 'border-color .14s ease, background .14s ease, box-shadow .14s ease',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'rgba(16,185,129,.4)';
        el.style.background = 'var(--bg3)';
        el.style.boxShadow = '0 0 0 1px rgba(16,185,129,.12)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--border-color)';
        el.style.background = 'var(--bg2)';
        el.style.boxShadow = 'none';
      }}
    >
      {/* Cover thumbnail */}
      <div style={{
        width: 48, height: 48, flexShrink: 0, borderRadius: 8,
        overflow: 'hidden', border: '1px solid var(--border-color)',
        background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {s.cover_image
          ? <img src={s.cover_image} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Icon name="account_tree" size={20} style={{ color: 'var(--text-tertiary)' } as any} />}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
          <h3 style={{ fontFamily: syne, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.title}
          </h3>
          {s.is_featured && (
            <span style={{
              padding: '2px 7px', borderRadius: 9999,
              background: 'rgba(245,158,11,.12)', color: '#f59e0b',
              border: '1px solid rgba(245,158,11,.28)',
              fontFamily: mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em',
            }}>
              Featured
            </span>
          )}
          <span style={{
            padding: '2px 7px', borderRadius: 9999,
            fontFamily: mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em',
            ...visBadge,
          }}>
            {VISIBILITY_LABELS[s.visibility] || s.visibility}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontFamily: mono, fontSize: 10.5, color: 'var(--text-tertiary)' }}>
          <span>{s.published_post_count} / {s.post_count} posts published</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-tertiary)', flexShrink: 0 }} />
          <SeriesViewsCell seriesId={s.id} />
          {s.author_name && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-tertiary)', flexShrink: 0 }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="person" size={11} />
                {s.author_name}
              </span>
            </>
          )}
          {s.date_range?.start && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-tertiary)', flexShrink: 0 }} />
              <span>{new Date(s.date_range.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </>
          )}
        </div>
      </div>

      {/* Arrow */}
      <Icon name="chevron_right" size={17} style={{ color: 'var(--text-tertiary)', flexShrink: 0 } as any} />
    </div>
  );
};

export default React.memo(SeriesListItem);
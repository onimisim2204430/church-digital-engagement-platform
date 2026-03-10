/**
 * SettingsTab.tsx — restyled to admin design system. All logic preserved.
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SeriesDetail } from '../../../../services/series.service';
import seriesService from '../../../../services/series.service';
import Icon from '../../../../components/common/Icon';
import { fmtDate } from '../helpers/series-detail.helpers';

interface SettingsTabProps {
  series: SeriesDetail | null;
  totalViews: number;
  seriesId: string;
  onDeleteSuccess?: () => void;
  onSetHidden?: () => void;
  removeConfirmId?: string | null;
  onSetRemoveConfirm?: (id: string | null) => void;
  removingId?: string | null;
  showDeleteSeriesModal?: boolean;
  onSetShowDeleteModal?: (show: boolean) => void;
  deleteSeriesInput?: string;
  onSetDeleteInput?: (value: string) => void;
}

const mono = "'JetBrains Mono', monospace";
const syne = "'Syne', sans-serif";

const SettingsTab: React.FC<SettingsTabProps> = React.memo(({
  series, totalViews, seriesId, onDeleteSuccess, onSetHidden,
  showDeleteSeriesModal, onSetShowDeleteModal, deleteSeriesInput = '', onSetDeleteInput,
}) => {
  const navigate = useNavigate();

  const handleDeleteSeries = useCallback(async () => {
    if (!seriesId) return;
    try {
      await seriesService.deleteSeries(seriesId);
      navigate('/admin/series');
      onDeleteSuccess?.();
    } catch (err: any) {
      alert('Failed to delete: ' + (err.message || 'Unknown error'));
    } finally {
      onSetShowDeleteModal?.(false);
      onSetDeleteInput?.('');
    }
  }, [seriesId, navigate, onDeleteSuccess, onSetShowDeleteModal, onSetDeleteInput]);

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 14px',
    background: 'var(--bg3)', border: '1px solid var(--border-color)', borderRadius: 8,
    color: 'var(--text-primary)', fontFamily: mono, fontSize: 12, outline: 'none',
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }} className="settings-layout">

        {/* Left: Info cards */}
        <div style={{ flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Series Information */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg1)' }}>
              <Icon name="info" size={16} style={{ color: 'var(--em)' } as any} />
              <div>
                <p style={{ fontFamily: syne, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Series Information</p>
                <p style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-tertiary)', margin: 0 }}>Read-only metadata about this series</p>
              </div>
            </div>
            <div>
              {[
                { icon: 'tag',          label: 'Series ID',     value: series?.id || '' },
                { icon: 'link',         label: 'URL Slug',      value: series?.slug || '' },
                { icon: 'calendar_today', label: 'Created',     value: series ? fmtDate(series.created_at) : '' },
                { icon: 'article',      label: 'Total Posts',   value: series ? `${series.post_count} posts (${series.published_post_count} published)` : '' },
                { icon: 'visibility',   label: 'Total Views',   value: totalViews.toLocaleString() },
              ].map((row, i) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < 4 ? '1px solid var(--border-light, var(--border-color))' : 'none' }}>
                  <Icon name={row.icon} size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 } as any} />
                  <span style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-tertiary)', width: 110, flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontFamily: mono, fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Public URL */}
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg1)' }}>
              <Icon name="open_in_new" size={16} style={{ color: 'var(--em)' } as any} />
              <div>
                <p style={{ fontFamily: syne, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Public Page</p>
                <p style={{ fontFamily: mono, fontSize: 10, color: 'var(--text-tertiary)', margin: 0 }}>The live URL for this series</p>
              </div>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg3)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px 14px' }}>
                <Icon name="link" size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 } as any} />
                <span style={{ fontFamily: mono, fontSize: 11.5, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  /library/series/{series?.slug}
                </span>
                <a href={`/library/series/${series?.slug}`} target="_blank" rel="noreferrer"
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, fontFamily: mono, fontSize: 11, fontWeight: 700, color: 'var(--em)', textDecoration: 'none' }}>
                  Open <Icon name="open_in_new" size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Danger zone */}
        <div style={{ width: '100%', maxWidth: 300, flexShrink: 0 }} className="settings-danger">
          <div style={{ background: 'var(--bg2)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(239,68,68,.2)', background: 'rgba(239,68,68,.05)' }}>
              <Icon name="warning" size={16} style={{ color: '#ef4444' } as any} />
              <div>
                <p style={{ fontFamily: syne, fontSize: 13, fontWeight: 700, color: '#ef4444', margin: 0 }}>Danger Zone</p>
                <p style={{ fontFamily: mono, fontSize: 10, color: '#f87171', margin: 0 }}>Irreversible actions</p>
              </div>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Archive */}
              <div>
                <p style={{ fontFamily: syne, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 5px' }}>Archive Series</p>
                <p style={{ fontFamily: mono, fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 10px' }}>
                  Hides the series from public view without deleting any content. You can restore it later from Visibility settings.
                </p>
                <button type="button" onClick={onSetHidden}
                  style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: mono, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                >
                  <Icon name="archive" size={14} />
                  Archive (Set Hidden)
                </button>
              </div>
              <div style={{ height: 1, background: 'rgba(239,68,68,.15)' }} />
              {/* Delete */}
              <div>
                <p style={{ fontFamily: syne, fontSize: 13, fontWeight: 700, color: '#ef4444', margin: '0 0 5px' }}>Delete Series</p>
                <p style={{ fontFamily: mono, fontSize: 10.5, color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 10px' }}>
                  Permanently removes this series. Posts will not be deleted but will no longer be grouped.
                </p>
                <button type="button"
                  onClick={() => { onSetDeleteInput?.(''); onSetShowDeleteModal?.(true); }}
                  style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', fontFamily: mono, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#dc2626')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#ef4444')}
                >
                  <Icon name="delete_forever" size={14} />
                  Delete Series
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteSeriesModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.65)' }}
          onClick={e => { if (e.target === e.currentTarget) { onSetShowDeleteModal?.(false); onSetDeleteInput?.(''); } }}
        >
          <div style={{ background: 'var(--bg2)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 380, padding: 24, margin: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Icon name="delete_forever" size={22} style={{ color: '#ef4444' } as any} />
              <span style={{ fontFamily: syne, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Delete Series</span>
            </div>
            <p style={{ fontFamily: mono, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>"{series?.title}"</strong>? This cannot be undone. Posts will not be deleted but will no longer be grouped.
            </p>
            <p style={{ fontFamily: mono, fontSize: 10.5, color: 'var(--text-tertiary)', marginBottom: 8 }}>
              To confirm, type <strong style={{ color: 'var(--text-secondary)' }}>{series?.title}</strong> below:
            </p>
            <input
              type="text" value={deleteSeriesInput}
              onChange={e => onSetDeleteInput?.(e.target.value)}
              onPaste={e => e.preventDefault()}
              placeholder={series?.title || 'Series name'}
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', background: 'var(--bg3)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)', fontFamily: mono, fontSize: 12, outline: 'none', marginBottom: 20 }}
              onFocus={e => (e.target.style.borderColor = '#ef4444')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { onSetShowDeleteModal?.(false); onSetDeleteInput?.(''); }}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: mono, fontSize: 12, fontWeight: 600 }}
              >Cancel</button>
              <button
                onClick={handleDeleteSeries}
                disabled={deleteSeriesInput !== (series?.title || '')}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', fontFamily: mono, fontSize: 12, fontWeight: 700, opacity: deleteSeriesInput !== (series?.title || '') ? .4 : 1 }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .settings-layout { flex-direction: column !important; }
        @media (min-width: 1024px) {
          .settings-layout { flex-direction: row !important; }
          .settings-danger { max-width: 280px !important; }
        }
      `}</style>
    </>
  );
});

SettingsTab.displayName = 'SettingsTab';
export default SettingsTab;
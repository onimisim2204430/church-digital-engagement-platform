/**
 * SeriesManager.tsx — restyled to match admin layout design system
 * Fonts: Syne (headings) + JetBrains Mono (body) — via admin-root inheritance
 * Colors: CSS vars from AdminLayout injection
 * All logic preserved exactly
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import seriesService from '../../services/series.service';
import Icon from '../../components/common/Icon';
import SeriesListItem from './components/SeriesListItem';
import { Series } from './types/series-manager.types';

const SeriesManager: React.FC = () => {
  const [series, setSeries]       = useState<Series[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchSeries = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await seriesService.getAllSeries();
      setSeries(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load series');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSeries(); }, [fetchSeries]);

  const handleCreateNew = useCallback(() => navigate('/admin/series/new'), [navigate]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return series;
    return series.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [series, searchTerm]);

  /* ── shared style atoms ─────────────────────────────────────── */
  const mono = "'JetBrains Mono', monospace";
  const syne = "'Syne', sans-serif";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg1)',
        borderBottom: '1px solid var(--border-color)',
        padding: '20px 28px',
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: syne, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-.02em' }}>
              Series Management
            </h1>
            <p style={{ fontFamily: mono, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
              {loading ? 'Loading…' : `${series.length} series total`}
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--em)', color: '#fff',
              fontFamily: mono, fontSize: 12, fontWeight: 700,
              boxShadow: '0 0 0 0 rgba(16,185,129,0)',
              transition: 'opacity .15s ease, box-shadow .15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '.88'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(16,185,129,.35)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 rgba(16,185,129,0)'; }}
          >
            <Icon name="add" size={14} />
            New Series
          </button>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg1)',
        borderBottom: '1px solid var(--border-color)',
        padding: '10px 28px',
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
              <Icon name="search" size={15} />
            </span>
            <input
              type="text"
              placeholder="Search series by title…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                background: 'var(--bg2)', border: '1px solid var(--border-color)',
                borderRadius: 8, outline: 'none', color: 'var(--text-primary)',
                fontFamily: mono, fontSize: 12, boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--em)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
            />
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 28px', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                  height: 72, borderRadius: 10,
                  background: 'var(--bg2)',
                  border: '1px solid var(--border-color)',
                  animation: 'pulse 1.5s ease infinite',
                  opacity: 1 - i * 0.12,
                }} />
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div style={{
              background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.25)',
              borderRadius: 12, padding: '32px 24px', textAlign: 'center',
            }}>
              <Icon name="error_outline" size={32} style={{ color: '#ef4444' } as any} />
              <p style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, color: '#ef4444', marginTop: 10 }}>{error}</p>
              <button onClick={fetchSeries} style={{
                marginTop: 12, fontFamily: mono, fontSize: 11, color: 'var(--em)',
                background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
              }}>Try again</button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--bg2)', border: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="account_tree" size={26} style={{ color: 'var(--text-tertiary)' } as any} />
              </div>
              <p style={{ fontFamily: syne, fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>
                {searchTerm ? 'No series match your search' : 'No series yet'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleCreateNew}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'var(--em)', color: '#fff', fontFamily: mono, fontSize: 12, fontWeight: 700,
                  }}
                >
                  Create your first series
                </button>
              )}
            </div>
          )}

          {/* Series list */}
          {!loading && !error && filtered.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map(s => (
                <SeriesListItem
                  key={s.id}
                  series={s}
                  onClick={() => navigate(`/admin/series/${s.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
    </div>
  );
};

export default React.memo(SeriesManager);
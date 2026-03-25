/**
 * Member Community — Sovereign Component
 * SOVEREIGN: zero shared imports from admin or public.
 * Fetches connect ministries from backend. All backend calls preserved.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { connectService, type ConnectMinistry } from '../../services/connect.service';

const MemberCommunity: React.FC = () => {
  const [cards,   setCards]   = useState<ConnectMinistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await connectService.getPublicConnectMinistries();
        setCards(res.results || []);
      } catch (err) {
        console.error('[MemberCommunity] Failed to load', err);
        setCards([]);
        setError('Could not load community opportunities. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const summary = useMemo(() => ({
    groups: cards.filter(c => c.card_type === 'group').length,
    serve:  cards.filter(c => c.card_type === 'serve').length,
    events: cards.filter(c => c.card_type === 'event').length,
  }), [cards]);

  const typeLabel = (type: string) => {
    if (type === 'group') return 'Group';
    if (type === 'serve') return 'Serve';
    if (type === 'event') return 'Event';
    return type;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--m-s5)' }}>
      {/* Page header */}
      <div>
        <h1 style={{
          fontSize: 'var(--m-text-2xl)',
          fontWeight: 'var(--m-w-bold)',
          color: 'var(--m-text-primary)',
          margin: '0 0 var(--m-s2)',
          letterSpacing: 'var(--m-tracking-snug)',
          lineHeight: 'var(--m-lh-snug)',
        }}>
          Community Opportunities
        </h1>
        <p style={{ fontSize: 'var(--m-text-base)', color: 'var(--m-text-secondary)', margin: 0 }}>
          Discover groups, teams, and events you can join this week
        </p>
      </div>

      {/* Content card */}
      <div className="m-card">
        <div className="m-card-body">
          {loading ? (
            /* Skeleton state */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--m-s3)' }}>
              {[1,2,3].map(i => (
                <div key={i} className="m-skeleton" style={{ height: '64px', borderRadius: 'var(--m-r-md)' }} />
              ))}
            </div>
          ) : error ? (
            /* Error state */
            <div className="m-empty">
              <div className="m-empty-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }} aria-hidden="true">
                  error_outline
                </span>
              </div>
              <p className="m-empty-title">Something went wrong</p>
              <p className="m-empty-subtitle">{error}</p>
            </div>
          ) : cards.length === 0 ? (
            /* Empty state */
            <div className="m-empty">
              <div className="m-empty-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }} aria-hidden="true">
                  forum
                </span>
              </div>
              <p className="m-empty-title">No opportunities yet</p>
              <p className="m-empty-subtitle">
                Community groups and events will appear here when they become available.
              </p>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 'var(--m-s3)',
                marginBottom: 'var(--m-s5)',
              }}>
                {[
                  { label: 'Groups',      value: summary.groups, icon: 'group' },
                  { label: 'Serve Teams', value: summary.serve,  icon: 'handshake' },
                  { label: 'Events',      value: summary.events, icon: 'event' },
                ].map(s => (
                  <div key={s.label} className="m-stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--m-s2)', marginBottom: 'var(--m-s2)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--m-brand-primary)' }} aria-hidden="true">
                        {s.icon}
                      </span>
                      <span style={{ fontSize: 'var(--m-text-xs)', color: 'var(--m-text-tertiary)', fontWeight: 'var(--m-w-medium)' }}>
                        {s.label}
                      </span>
                    </div>
                    <div className="m-stat-value">{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Cards list */}
              <div className="m-list">
                {cards.slice(0, 8).map(card => (
                  <div key={card.id} className="m-list-item m-list-item-interactive">
                    <div className="m-avatar m-avatar-sm" style={{ background: 'var(--m-brand-primary-ghost)', color: 'var(--m-brand-primary)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }} aria-hidden="true">
                        {card.card_type === 'group' ? 'group' : card.card_type === 'serve' ? 'handshake' : 'event'}
                      </span>
                    </div>
                    <div className="m-list-item-body">
                      <div className="m-list-item-primary">{card.title}</div>
                      {card.description && (
                        <div className="m-list-item-secondary">{card.description}</div>
                      )}
                    </div>
                    <span className="m-badge m-badge-brand m-badge-sm">{typeLabel(card.card_type)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberCommunity;

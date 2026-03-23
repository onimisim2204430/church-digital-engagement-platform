import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../../shared/components/Card';
import { UsersIcon } from '../../shared/components/Icons';
import { connectService, type ConnectMinistry } from '../../services/connect.service';

const MemberCommunity: React.FC = () => {
  const [cards, setCards] = useState<ConnectMinistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await connectService.getPublicConnectMinistries();
        setCards(response.results || []);
      } catch (err) {
        console.error('Failed to load member community connect cards', err);
        setCards([]);
        setError('Could not load community opportunities.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const summary = useMemo(() => {
    const groups = cards.filter((c) => c.card_type === 'group').length;
    const serve = cards.filter((c) => c.card_type === 'serve').length;
    const events = cards.filter((c) => c.card_type === 'event').length;
    return { groups, serve, events };
  }, [cards]);

  return (
    <>
      <div className="welcome-section-pro">
        <h1 className="welcome-title">Community Opportunities</h1>
        <p className="welcome-subtitle">Discover groups, teams, and events you can join this week</p>
      </div>

      <Card>
        <div style={{ padding: 'var(--space-8)' }}>
          {loading ? (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Loading community opportunities...</p>
          ) : error ? (
            <p style={{ margin: 0, color: 'var(--error, #dc2626)' }}>{error}</p>
          ) : cards.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No active opportunities are available right now.</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '12px' }}>Groups</p>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-primary)', fontSize: '22px', fontWeight: 700 }}>{summary.groups}</p>
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '12px' }}>Serve Teams</p>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-primary)', fontSize: '22px', fontWeight: 700 }}>{summary.serve}</p>
                </div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '12px' }}>Events</p>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-primary)', fontSize: '22px', fontWeight: 700 }}>{summary.events}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                {cards.slice(0, 6).map((card) => (
                  <div key={card.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>{card.title}</p>
                        <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>{card.description}</p>
                      </div>
                      <UsersIcon size={20} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>
    </>
  );
};

export default MemberCommunity;

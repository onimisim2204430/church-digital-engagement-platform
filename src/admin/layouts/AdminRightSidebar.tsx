/**
 * AdminRightSidebar.tsx — CSS vars + JetBrains Mono, zero external CSS
 */
import React from 'react';
import Icon from '../../components/common/Icon';
import DailyWordQuickEditor from '../DailyWordQuickEditor';

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

const AdminRightSidebar: React.FC = () => (
  <aside
    className="flex flex-col admin-scroll no-scrollbar"
    style={{
      width: 288, flexShrink: 0, height: '100%', overflowY: 'auto',
      background: 'var(--bg1)',
      borderLeft: '1px solid var(--border-color)',
    }}
  >
    {/* ── Pastoral Priorities ──────────────────────────── */}
    <section style={{ padding: 16, borderBottom: '1px solid var(--border-color)' }}>
      <h2 style={{ ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                   letterSpacing: '.13em', color: 'var(--em)', margin: '0 0 12px' }}>
        Pastoral Priorities
      </h2>

      {/* Critical flag */}
      <div style={{
        borderRadius: 10, padding: 12, marginBottom: 8,
        background: 'rgba(244,63,94,.06)',
        border: '1px solid rgba(244,63,94,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Icon name="emergency" size={13} style={{ color: '#f43f5e', flexShrink: 0 } as any} />
          <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
                         letterSpacing: '.1em', color: '#f43f5e' }}>
            Critical Flag
          </span>
        </div>
        <p style={{ ...mono, fontSize: 11.5, fontWeight: 600, lineHeight: 1.45,
                    color: 'var(--text-primary)', margin: '0 0 8px' }}>
          Urgent prayer request regarding hospital visit (John Thompson)
        </p>
        <button style={{
          width: '100%', padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
          background: '#f43f5e', color: '#fff',
          ...mono, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#e11d48')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#f43f5e')}
        >
          Notify Care Team
        </button>
      </div>

      {/* Community question */}
      <div style={{
        borderRadius: 10, padding: 12,
        background: 'var(--bg2)',
        border: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
                         letterSpacing: '.1em', color: 'var(--text-secondary)' }}>
            Community Question
          </span>
          <span style={{ ...mono, fontSize: 10, color: 'var(--text-tertiary)' }}>4h ago</span>
        </div>
        <p style={{ ...mono, fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-primary)', margin: '0 0 8px' }}>
          "How can I register my family for the Winter Retreat? The link seems broken."
        </p>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                   ...mono, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
                   letterSpacing: '.07em', color: 'var(--em)' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.textDecoration = 'underline')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.textDecoration = 'none')}
        >
          Respond Now
        </button>
      </div>
    </section>

    {/* ── Daily Word ──────────────────────────────────── */}
    <DailyWordQuickEditor />

    {/* ── Network Performance ─────────────────────────── */}
    <section style={{ marginTop: 'auto', padding: 16, background: 'var(--bg2)',
                      borderTop: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ ...mono, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
                       letterSpacing: '.12em', color: 'var(--text-secondary)' }}>
          Network Performance
        </span>
        <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: 'var(--em)' }}>
          12ms Ping
        </span>
      </div>

      {/* Bar */}
      <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 9999,
                    overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ width: '24%', height: '100%', background: 'var(--em)', borderRadius: 9999 }} />
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {[
          { label: 'Req/min', val: '8.2k' },
          { label: 'Error Rate', val: '0.02%' },
          { label: 'Status', val: '● OK' },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <div style={{ width: 1, height: 28, background: 'var(--border-color)', flexShrink: 0 }} />}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ ...mono, fontSize: 12, fontWeight: 700,
                          color: s.label === 'Status' ? 'var(--em)' : 'var(--text-primary)',
                          margin: '0 0 2px' }}>
                {s.val}
              </p>
              <p style={{ ...mono, fontSize: 9.5, textTransform: 'uppercase',
                          letterSpacing: '.08em', color: 'var(--text-tertiary)', margin: 0 }}>
                {s.label}
              </p>
            </div>
          </React.Fragment>
        ))}
      </div>
    </section>
  </aside>
);

export default AdminRightSidebar;
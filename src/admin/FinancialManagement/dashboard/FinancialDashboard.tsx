// dashboard/FinancialDashboard.tsx
// "THE OBSERVATORY" — Church Financial Command Center
// Thin orchestrator shell: owns ThemeCtx, layout structure, and lazy-loads 6 sections.
// Ticker, topbar, sidebar, right panel are inline JSX — only sections are lazy.

import React, {
  useState, useEffect, useCallback, createContext, useContext, Suspense, lazy, memo,
} from 'react';
import Clock from './components/Clock';
import DashboardSkeleton from './components/DashboardSkeleton';
import Icon from '../../components/common/Icon';
import { injectObservatoryCSS } from '../helpers/dashboard.helpers';
import {
  TICKER_ITEMS_REAL, ALERTS, WATCHLIST, UPCOMING_EVENTS,
} from '../constants/dashboard.constants';

// ─── Theme Context ────────────────────────────────────────────────────────────
type Theme = 'dark' | 'light';
export const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
});
export const useTheme = () => useContext(ThemeCtx);

// ─── Nav Type ─────────────────────────────────────────────────────────────────
type NavSection = 'overview' | 'intelligence' | 'forecast' | 'analytics' | 'pulse' | 'risk';

// ─── Lazy Sections ────────────────────────────────────────────────────────────
const OverviewSection    = lazy(() => import('./sections/OverviewSection'));
const IntelligenceSection = lazy(() => import('./sections/IntelligenceSection'));
const ForecastSection    = lazy(() => import('./sections/ForecastSection'));
const AnalyticsSection   = lazy(() => import('./sections/AnalyticsSection'));
const PulseSection       = lazy(() => import('./sections/PulseSection'));
const RiskSection        = lazy(() => import('./sections/RiskSection'));

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FinancialDashboard() {
  const [theme, setTheme]       = useState<Theme>('dark');
  const [active, setActive]     = useState<NavSection>('overview');
  const [search, setSearch]     = useState('');
  const [alertsOpen, setAlertsOpen] = useState(false);

  useEffect(() => { injectObservatoryCSS(); }, []);

  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);

  const navItems: {
    id: NavSection; label: string; icon: string; badge?: string; badgeColor?: string;
  }[] = [
    { id: 'overview',     icon: 'dashboard',      label: 'Command Overview' },
    { id: 'intelligence', icon: 'psychology',    label: 'AI Intelligence', badge: '8', badgeColor: 'g' },
    { id: 'forecast',     icon: 'trending_up',  label: 'Forecast Engine' },
    { id: 'analytics',    icon: 'science',       label: 'Deep Analytics' },
    { id: 'pulse',        icon: 'bolt',         label: 'Live Pulse', badge: 'LIVE', badgeColor: 'g' },
    { id: 'risk',         icon: 'shield',       label: 'Risk Observatory', badge: '1' },
  ];

  const renderSection = () => {
    switch (active) {
      case 'overview':     return <OverviewSection />;
      case 'intelligence': return <IntelligenceSection />;
      case 'forecast':     return <ForecastSection />;
      case 'analytics':    return <AnalyticsSection />;
      case 'pulse':        return <PulseSection />;
      case 'risk':         return <RiskSection />;
    }
  };

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      <div className={`obs ${theme}`} style={{ height: '100%', minHeight: 0 }}>
        <div className="obs-root">

          {/* ── Ticker Bar ── */}
          <div className="obs-ticker-bar">
            <div className="obs-ticker-label">LIVE</div>
            <div className="obs-ticker-fade-l" />
            <div className="obs-ticker-scroll">
              <div className="obs-ticker-inner">
                {[...TICKER_ITEMS_REAL, ...TICKER_ITEMS_REAL].map((item, i) => (
                  <div key={i} className="obs-ticker-item">
                    <span>{item.label}:</span>
                    <b>{item.val}</b>
                    <span className={item.up ? 'up' : 'dn'}>{item.change}</span>
                    <span style={{ opacity: 0.3 }}>•</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="obs-ticker-fade-r" />
          </div>

          {/* ── Top Bar ── */}
          <div className="obs-topbar">
            <div className="obs-logo">
              THE OBSERVATORY
              <span className="obs-logo-sub"> · Financial Command</span>
            </div>
            <div className="obs-divv" />
            <div className="obs-live-chip">
              <div className="obs-live-dot" />
              <span>LIVE</span>
            </div>
            <div className="obs-divv" />
            <div className="obs-search-wrap">
              <span className="obs-search-icon">⌕</span>
              <input
                placeholder="Search metrics, members, funds..."
                value={search}
                onChange={e => setSearch(e.target.value)} />
              <span style={{ fontSize: 10, color: 'var(--t3)', flexShrink: 0, background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4 }}>
                ⌘K
              </span>
            </div>
            <div className="obs-topbar-right">
              <Clock />
              <div className="obs-divv" />
              <div className="obs-ibtn" title="Download Report">⬇</div>
              <div className="obs-ibtn" title="Print">🖨</div>
              <div className="obs-ibtn" title={`${ALERTS.length} alerts`}
                onClick={() => setAlertsOpen(!alertsOpen)}>
                <Icon name="notifications" size={18} />
              </div>
              <div className="obs-divv" />
              <button className="obs-theme-btn" onClick={toggle}>
                {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
              </button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="obs-body">

            {/* Sidebar */}
            <div className="obs-sidebar">
              <div className="obs-nav-sect-label">Navigation</div>
              <div className="obs-nav-group">
                {navItems.map(n => (
                  <div key={n.id} className={`obs-nav-item${active === n.id ? ' act' : ''}`}
                    onClick={() => setActive(n.id)}>
                    <span className="obs-nav-icon">{n.icon}</span>
                    <span className="obs-nav-label">{n.label}</span>
                    {n.badge && (
                      <span className={`obs-nav-badge${n.badgeColor ? ' ' + n.badgeColor : ''}`}>
                        {n.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="obs-nav-sect-label" style={{ marginTop: 8 }}>Quick Stats</div>
              <div className="obs-sidebar-bottom">
                {[
                  { label: 'Health Score', val: '78/100' },
                  { label: "Today's Giving", val: '₦4.28M' },
                  { label: 'Cash Runway', val: '3.2 mo' },
                  { label: 'Active Goals', val: '5 / 5' },
                ].map(s => (
                  <div key={s.label} className="obs-mini-stat">
                    <span className="obs-mini-stat-label">{s.label}</span>
                    <span className="obs-mini-stat-val">{s.val}</span>
                  </div>
                ))}
                <div className="obs-div" />
                <div style={{ padding: '6px 10px', fontSize: 10, color: 'var(--t3)' }}>
                  <div style={{ marginBottom: 3 }}>Church of Christ, Lekki</div>
                  <div style={{ color: 'var(--em)', fontWeight: 700 }}>FY 2025 · Q1</div>
                </div>
              </div>
            </div>

            {/* Main content — lazy-loaded section */}
            <div className="obs-main">
              <Suspense fallback={<DashboardSkeleton />}>
                {renderSection()}
              </Suspense>
            </div>

            {/* Right panel */}
            <div className="obs-rpanel">
              <div className="obs-rp-hd">
                <span>🔔 Alerts & Watchlist</span>
                <span className="obs-card-badge red">{ALERTS.length}</span>
              </div>
              <div className="obs-rp-scroll">
                <div style={{
                  padding: '8px 14px 4px', fontSize: 10, fontWeight: 700,
                  color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em',
                }}>
                  Recent Alerts
                </div>
                {ALERTS.map((a, i) => (
                  <div key={i} className="obs-alert-item">
                    <div className="obs-alert-dot" style={{ background: a.color }} />
                    <div>
                      <div className="obs-alert-text">{a.text}</div>
                      <div className="obs-alert-time">{a.time}</div>
                    </div>
                  </div>
                ))}
                <div className="obs-div" style={{ margin: '4px 14px' }} />
                <div style={{
                  padding: '4px 14px 4px', fontSize: 10, fontWeight: 700,
                  color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em',
                }}>
                  Watchlist
                </div>
                {WATCHLIST.map((w, i) => (
                  <div key={i} className="obs-watch-item">
                    <div className="obs-watch-label">{w.label}</div>
                    <div>
                      <div className="obs-watch-val">{w.val}</div>
                      <div className="obs-watch-chg" style={{
                        color: w.up ? 'var(--em)' : 'var(--red)', textAlign: 'right', fontSize: 10,
                      }}>{w.chg}</div>
                    </div>
                  </div>
                ))}
                <div className="obs-div" style={{ margin: '4px 14px' }} />
                <div style={{
                  padding: '4px 14px 4px', fontSize: 10, fontWeight: 700,
                  color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em',
                }}>
                  Upcoming
                </div>
                {UPCOMING_EVENTS.slice(0, 4).map((e, i) => (
                  <div key={i} style={{ padding: '7px 14px', borderBottom: '1px solid var(--b2)' }}>
                    <div className={`obs-cal-event ${e.type}`} style={{ margin: 0 }}>
                      <div className="obs-cal-title">{e.title}</div>
                      <div className="obs-cal-meta">
                        {e.days} days · {e.date}{e.amount && ` · ${e.amount}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
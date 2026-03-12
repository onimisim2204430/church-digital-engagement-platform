/**
 * AdminLayout.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dark palette: #030617 (main bg) · #0e1528 (panel overlay) — from uploaded image
 * Light palette: #f0fdf4 / #ffffff — green-tinted white (matches FD light mode)
 * Accent:  Emerald #10b981 / #34d399 — identical to FinancialDashboard
 * Fonts:   Syne (headers) + JetBrains Mono (body/data) — identical to FinancialDashboard
 * Theme:   Atomic instant switch — double-rAF freeze, zero stagger flicker
 * CSS:     All injected — no external .css imports
 */

import React, {
  useState, useEffect, useCallback, createContext, useContext,
  type ReactNode,
} from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import AdminTopBar from './AdminTopBar';
import AdminRightSidebar from './AdminRightSidebar';

// ─── Theme Context ────────────────────────────────────────────────────────────
interface ThemeCtx { isDark: boolean; toggle: () => void; }
export const AdminThemeContext = createContext<ThemeCtx>({ isDark: false, toggle: () => {} });
export const useAdminTheme = () => useContext(AdminThemeContext);

// ─── Style + font injection (singleton) ──────────────────────────────────────
let _injected = false;
function injectGlobalStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;

  /* Google Fonts — Syne display + JetBrains Mono data (same as FinancialDashboard) */
  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap';
  document.head.appendChild(link);

  const el = document.createElement('style');
  el.id = '__admin-global-styles';
  el.textContent = `

    /* ── Font inheritance ────────────────────────────────────── */
    .admin-root,
    .admin-root *:not(i):not([class*="material"]):not([class*="symbol"]) {
      font-family: 'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace;
      -webkit-font-smoothing: antialiased;
    }
    /* Syne for headings — mirrors FinancialDashboard's .obs-section-title etc. */
    .admin-root h1, .admin-root h2, .admin-root h3,
    .admin-root .font-display, .admin-root .brand-title {
      font-family: 'Syne', sans-serif;
    }

    /* ── Light mode tokens ───────────────────────────────────── */
    :root {
      --em:  #10b981;  --em2: #34d399;  --em3: #6ee7b7;
      --emd: rgba(16,185,129,.10);
      --emg: rgba(16,185,129,.22);
      --em-border: rgba(16,185,129,.22);

      --bg0: #edfdf6;
      --bg1: #ffffff;
      --bg2: #f8fafc;
      --bg3: #e2e8f0;

      --bg-primary:   #ffffff;
      --bg-secondary: #f0fdf4;
      --bg-hover:     #ecfdf5;

      --t1: #0f172a;
      --t2: #374151;
      --t3: #6b7280;
      --text-primary:   #0f172a;
      --text-secondary: #374151;
      --text-tertiary:  #9ca3af;

      --border-color: rgba(5,150,105,.18);
      --border-light: #d1fae5;

      --sidebar-bg:          #ffffff;
      --sidebar-border:      rgba(5,150,105,.16);
      --sidebar-hover:       #f0fdf4;
      --sidebar-active:      rgba(16,185,129,.10);
      --sidebar-text:        #6b7280;
      --sidebar-text-active: #0f172a;

      --primary-500: #10b981;
      --primary-600: #059669;
      --error: #ef4444;

      --shadow-sm: 0 1px 4px  rgba(0,0,0,.05);
      --shadow-md: 0 4px 16px rgba(0,0,0,.07);
      --shadow-lg: 0 10px 32px rgba(0,0,0,.09);

      --radius-sm:  4px; --radius-md:  8px;
      --radius-lg: 12px; --radius-full: 9999px;

      --topbar-h:    56px;
      --sidebar-w:  256px;
    }

    /* ── Dark mode tokens — exact colors from uploaded image ─── */
    .dark {
      /*  Image top area:    rgb(3,  6, 23)  → #030617            */
      /*  Image bottom area: rgb(14,21,40)   → #0e1528            */
      --bg0: #030617;   /* deepest bg — page canvas              */
      --bg1: #0a1628;   /* topbar + sidebar bg                   */
      --bg2: #0e1528;   /* cards, dropdowns                      */
      --bg3: #162035;   /* raised surfaces / active              */
      --bg4: #1d2d42;   /* highest surface / hover               */

      --bg-primary:   #0a1628;
      --bg-secondary: #030617;
      --bg-hover:     rgba(16,185,129,.07);

      --t1: #f1f5f9;
      --t2: #94a3b8;
      --t3: #4b6a8a;
      --text-primary:   #f1f5f9;
      --text-secondary: #94a3b8;
      --text-tertiary:  #4b6a8a;

      --border-color: rgba(16,185,129,.14);
      --border-light: rgba(16,185,129,.09);

      --sidebar-bg:          #0a1628;
      --sidebar-border:      rgba(16,185,129,.12);
      --sidebar-hover:       rgba(16,185,129,.06);
      --sidebar-active:      rgba(16,185,129,.13);
      --sidebar-text:        #4b6a8a;
      --sidebar-text-active: #f1f5f9;

      --shadow-sm: 0 1px 4px  rgba(0,0,0,.45);
      --shadow-md: 0 4px 16px rgba(0,0,0,.55);
      --shadow-lg: 0 10px 40px rgba(0,0,0,.65);
    }

    /* ── Atomic theme switch — freeze ALL transitions ─────────── */
    .theme-switching,
    .theme-switching *,
    .theme-switching *::before,
    .theme-switching *::after {
      transition:        none !important;
      animation-duration: 0.001ms !important;
    }

    /* ── Scrollbars ──────────────────────────────────────────── */
    .admin-scroll {
      scrollbar-width: thin;
      scrollbar-color: var(--border-color) transparent;
    }
    .admin-scroll::-webkit-scrollbar       { width:3px; height:3px; }
    .admin-scroll::-webkit-scrollbar-track { background:transparent; }
    .admin-scroll::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 9999px;
    }
    .admin-scroll::-webkit-scrollbar-thumb:hover { background: var(--em); }
    .no-scrollbar { scrollbar-width:none; }
    .no-scrollbar::-webkit-scrollbar { display:none; }

    /* ── Avatar ──────────────────────────────────────────────── */
    .admin-avatar-img { width:100%; height:100%; object-fit:cover; display:block; }

    /* ── Sidebar section label ───────────────────────────────── */
    .sidebar-group-label {
      display: block;
      padding: 5px 12px;
      background: var(--sidebar-hover);
      border-top:    1px solid var(--sidebar-border);
      border-bottom: 1px solid var(--sidebar-border);
      color: var(--sidebar-text);
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.14em;
    }

    /* ── Topbar icon button ──────────────────────────────────── */
    .tb-btn {
      position: relative;
      display: flex; align-items: center; justify-content: center;
      width: 34px; height: 34px; flex-shrink: 0;
      border-radius: var(--radius-md);
      border: none; background: none; cursor: pointer;
      color: var(--text-secondary);
      transition: background .14s ease, color .14s ease;
    }
    .tb-btn:hover { background: var(--emd); color: var(--em); }
    .tb-btn:focus-visible { outline: 2px solid var(--em); outline-offset: 2px; }

    /* ── Hamburger: hidden on desktop, visible on mobile ─────── */
    /* Overrides Tailwind lg:hidden which loses to .tb-btn display:flex */
    .tb-hamburger { display: none; }
    @media (max-width: 1023px) {
      .tb-hamburger { display: flex; }
    }

    /* ── Desktop sidebar wrapper ─────────────────────────────── */
    .admin-sidebar-desktop { display: none; }
    @media (min-width: 1024px) {
      .admin-sidebar-desktop { display: flex; flex-shrink: 0; width: 256px; }
    }

    /* ── Right panel: desktop permanent, mobile hidden ───────── */
    .admin-right-desktop { display: none; }
    @media (min-width: 1280px) {
      .admin-right-desktop { display: flex; flex-shrink: 0; }
    }

    /* ── Status chip: desktop only ───────────────────────────── */
    .status-chip-wrap { display: none; }
    @media (min-width: 1024px) {
      .status-chip-wrap { display: inline-flex; }
    }

    /* ── Right panel btn: hidden on xl+ ──────────────────────── */
    .tb-rpanel-btn { display: flex; }
    @media (min-width: 1280px) {
      .tb-rpanel-btn { display: none; }
    }

    /* ── Search bar: desktop only ────────────────────────────── */
    .admin-search-bar { display: none; }
    @media (min-width: 768px) {
      .admin-search-bar { display: block; flex: 1; max-width: 340px; margin: 0 16px; }
    }

    /* ── Mobile search button: hidden on md+ ─────────────────── */
    .tb-mobile-search { display: flex; }
    @media (min-width: 768px) {
      .tb-mobile-search { display: none; }
    }

    /* ── User name: hidden on mobile ─────────────────────────── */
    .tb-user-name { display: none; }
    @media (min-width: 640px) {
      .tb-user-name { display: block; }
    }

    /* ── Brand name: hidden on xs ────────────────────────────── */
    .tb-brand-name { display: none; }
    @media (min-width: 640px) {
      .tb-brand-name { display: block; }
    }

    /* ── Route title: hidden on mobile ──────────────────────── */
    .tb-route-title { display: none; }
    @media (min-width: 768px) {
      .tb-route-title { display: block; min-width: 0; }
    }

    /* ── Topbar divider: hidden on mobile ────────────────────── */
    .tb-divider-md { display: none; }
    @media (min-width: 768px) {
      .tb-divider-md { display: block; }
    }

    /* ── Status chip ─────────────────────────────────────────── */
    .status-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 9px; border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .1em;
      color: var(--em);
      background: var(--emd);
      border: 1px solid var(--em-border);
    }

    /* ── Search ──────────────────────────────────────────────── */
    .admin-search {
      width: 100%;
      background: var(--bg2);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      padding: 6px 44px 6px 34px;
      outline: none;
      transition: border-color .14s ease, box-shadow .14s ease;
    }
    .admin-search:focus {
      border-color: var(--em);
      box-shadow: 0 0 0 2px rgba(16,185,129,.12);
    }
    .admin-search::placeholder { color: var(--text-tertiary); }

    /* ── KBD key ─────────────────────────────────────────────── */
    .admin-kbd {
      padding: 1px 5px; border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9.5px;
      background: var(--bg3); color: var(--text-secondary);
      border: 1px solid var(--border-color);
    }

    /* ── Dropdown panel ──────────────────────────────────────── */
    .admin-dropdown {
      background: var(--bg2);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
    }

    /* ── Divider ─────────────────────────────────────────────── */
    .admin-vdiv { width:1px; height:20px; background:var(--border-color); flex-shrink:0; }

    /* ── Em badge ────────────────────────────────────────────── */
    .em-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 7px; border-radius: 9999px;
      font-size: 10px; font-weight: 700;
      background: var(--emd); color: var(--em);
      border: 1px solid var(--em-border);
    }

    /* ── Animations ──────────────────────────────────────────── */
    @keyframes dropdownIn   { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideLeft    { from{transform:translateX(100%)} to{transform:translateX(0)} }
    @keyframes softPulse    { 0%,100%{opacity:1} 50%{opacity:.3} }
    @keyframes overlayIn    { from{opacity:0} to{opacity:1} }

    .dropdown-animate      { animation: dropdownIn .14s ease forwards; }
    .right-panel-slideover { animation: slideLeft .2s cubic-bezier(.4,0,.2,1); }
    .pulse-dot             { animation: softPulse 2s ease infinite; }
    .sidebar-overlay       { position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:40;animation:overlayIn .18s ease; }

    /* ── Mobile search overlay ───────────────────────────────── */
    .mobile-search-overlay {
      position:absolute; inset-x:0; top:0; height:56px; z-index:60;
      display:flex; align-items:center; gap:10px; padding:0 12px;
      background:var(--bg1); border-bottom:1px solid var(--border-color);
    }

    /* ── Nav active left-bar glow ────────────────────────────── */
    .nav-item-active {
      background: var(--sidebar-active) !important;
      box-shadow: inset 3px 0 0 var(--em);
    }
  `;
  document.head.appendChild(el);
}

// ─── Route labels ─────────────────────────────────────────────────────────────
function getRouteLabel(pathname: string): { title: string; sub: string } {
  const MAP: Record<string, [string, string]> = {
    '':                    ['Dashboard',          'Church command overview'],
    'content-dashboard':   ['Content Pipeline',   'Posts, series & media'],
    'community-dashboard': ['Community',          'Members, groups & engagement'],
    'ministry-dashboard':  ['Ministry Hub',       'Events, volunteers & outreach'],
    'financial-dashboard': ['Financial Overview', 'Giving, budget & treasury'],
    'growth-dashboard':    ['Growth & Data',      'Analytics, KPIs & reports'],
    'content':             ['Posts & Sermons',    'Manage media content'],
    'series':              ['Series',             'Teaching series management'],
    'drafts':              ['Post Drafts',        'Unpublished content'],
    'weekly-flow':         ['Weekly Flow',        'Service schedule planner'],
    'podcasting':          ['Podcasting',         'Episode & feed management'],
    'users':               ['User Management',    'Accounts & roles'],
    'moderation':          ['Moderation',         'Community reviews & flags'],
    'small-groups':        ['Small Groups',       'Cell groups & leadership'],
    'prayer-wall':         ['Prayer Wall',        'Requests & intercession'],
    'events':              ['Events Calendar',    'Upcoming events & registration'],
    'seed':                ['Seed Manager',       'Giving programs'],
    'volunteers':          ['Volunteers',         'Teams & scheduling'],
    'financial-hub':       ['Financial Hub',      'Transactions, payouts & giving'],
    'payments':            ['Payment Records',    'Transaction history & exports'],
    'financial-reports':   ['Financial Reports',  'Statements & compliance'],
    'email':               ['Email Campaigns',    'Newsletters & automations'],
    'reports':             ['Reports',            'Analytics & insights'],
    'settings':            ['Settings',           'System configuration'],
  };
  const seg = pathname.replace('/admin', '').replace(/^\//, '').split('/')[0] || '';
  const [title, sub] = MAP[seg] || ['Admin', 'Church management'];
  return { title, sub };
}

// ─── Component ────────────────────────────────────────────────────────────────
interface AdminLayoutProps { children?: ReactNode; }

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isRightOpen,   setRightOpen]   = useState(false);
  const [isDark,        setIsDark]      = useState(false);

  useEffect(() => { injectGlobalStyles(); }, []);

  useEffect(() => {
    const saved   = localStorage.getItem('admin-theme');
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark    = saved === 'dark' || (!saved && sysDark);
    applyTheme(dark);
    setIsDark(dark);
  }, []);

  function applyTheme(dark: boolean) {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  const toggle = useCallback(() => {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    setIsDark(prev => {
      const next = !prev;
      applyTheme(next);
      localStorage.setItem('admin-theme', next ? 'dark' : 'light');
      return next;
    });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => root.classList.remove('theme-switching'))
    );
  }, []);

  const activeView = (() => {
    const p = location.pathname;
    if (p === '/admin' || p === '/admin/') return 'overview';
    const m = p.match(/^\/admin\/([^/]+)/);
    return m ? m[1] : 'overview';
  })();

  const isDashboard = activeView === 'overview';
  const isSettings  = location.pathname === '/admin/settings';
  const routeLabel  = getRouteLabel(location.pathname);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  return (
    <AdminThemeContext.Provider value={{ isDark, toggle }}>
      <div
        className={`admin-root h-screen flex flex-col overflow-hidden${isDark ? ' dark' : ''}`}
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
      >
        <AdminTopBar
          onMenuClick={() => setSidebarOpen(s => !s)}
          onRightPanelClick={() => setRightOpen(s => !s)}
          showRightPanelBtn={isDashboard}
          routeTitle={routeLabel.title}
          routeSub={routeLabel.sub}
        />

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

          {/* Mobile overlay — only when drawer open */}
          {isSidebarOpen && (
            <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden />
          )}

          {/* Desktop sidebar — injected CSS hides on <1024px */}
          <div className="admin-sidebar-desktop">
            <Sidebar activeView={activeView} isOpen={false} onClose={() => {}} />
          </div>

          {/* Mobile drawer — only rendered when toggled open */}
          {isSidebarOpen && (
            <div style={{
              position: 'fixed', inset: '0 auto 0 0', zIndex: 50,
              width: 256, display: 'flex', flexDirection: 'column',
              background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border-color)',
            }}>
              <button
                onClick={() => setSidebarOpen(false)}
                className="tb-btn"
                aria-label="Close menu"
                style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
              <Sidebar activeView={activeView} isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            </div>
          )}

          {/* Main content */}
          <main
            className={`flex-1 admin-scroll no-scrollbar ${isSettings ? 'overflow-hidden' : 'overflow-y-auto'}`}
            style={{ background: 'var(--bg-secondary)', minHeight: 0 }}
          >
            {children || <Outlet />}
          </main>

          {/* Right sidebar — desktop permanent, injected CSS hides on <1280px */}
          {isDashboard && (
            <>
              <div className="admin-right-desktop">
                <AdminRightSidebar />
              </div>

              {/* Right sidebar — mobile slide-over, only when opened */}
              {isRightOpen && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,.65)' }}
                    onClick={() => setRightOpen(false)}
                  />
                  <div
                    className="right-panel-slideover"
                    style={{
                      position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50,
                      width: 296, display: 'flex', flexDirection: 'column',
                      background: 'var(--bg1)', borderLeft: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '0 16px', height: 56, flexShrink: 0,
                      borderBottom: '1px solid var(--border-color)',
                    }}>
                      <span style={{ color: 'var(--em)', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em' }}>
                        Pastoral Priorities
                      </span>
                      <button className="tb-btn" onClick={() => setRightOpen(false)} aria-label="Close">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }} className="admin-scroll">
                      <AdminRightSidebar />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </AdminThemeContext.Provider>
  );
};

export default AdminLayout;
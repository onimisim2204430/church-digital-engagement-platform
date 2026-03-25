/**
 * Member Overview — Professional Dashboard
 * Rebuilt for production-grade UI/UX quality.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import Icon from '../../components/common/Icon';
import './MemberOverview.css';

/* ─── Types ─────────────────────────────────────────────────── */

interface Stat {
  id: number;
  label: string;
  value: number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
  bg: string;
}

interface QuickAction {
  id: string;
  label: string;
  desc: string;
  icon: string;
  color: string;
  bg: string;
  badge?: string;
}

interface FeedItem {
  id: number;
  title: string;
  desc: string;
  time: string;
  icon: string;
  color: string;
  bg: string;
}

interface UpcomingEvent {
  id: number;
  title: string;
  month: string;
  day: number;
  time: string;
}

/* ─── Static data ────────────────────────────────────────────── */

const stats: Stat[] = [
  {
    id: 1, label: 'New Sermons', value: 3, change: '+2 this week', trend: 'up',
    icon: 'videocam', color: '#2268f5', bg: 'rgba(34,104,245,0.10)',
  },
  {
    id: 2, label: 'Upcoming Events', value: 5, change: '+1 this month', trend: 'up',
    icon: 'calendar_today', color: '#10b981', bg: 'rgba(16,185,129,0.10)',
  },
  {
    id: 3, label: 'Unread Messages', value: 2, change: 'New today', trend: 'neutral',
    icon: 'chat_bubble', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',
  },
  {
    id: 4, label: 'Prayer Requests', value: 8, change: '3 this week', trend: 'up',
    icon: 'favorite', color: '#ef4444', bg: 'rgba(239,68,68,0.10)',
  },
];

const quickActions: QuickAction[] = [
  {
    id: 'sermons', label: 'Sermons', desc: 'Watch & grow',
    icon: 'play_circle', color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)', badge: '3 new',
  },
  {
    id: 'events', label: 'Events', desc: 'Upcoming activities',
    icon: 'event', color: '#10b981', bg: 'rgba(16,185,129,0.10)', badge: '5 upcoming',
  },
  {
    id: 'community', label: 'Community', desc: 'Connect & discuss',
    icon: 'forum', color: '#0ea5e9', bg: 'rgba(14,165,233,0.10)',
  },
  {
    id: 'prayer', label: 'Prayer', desc: 'Share & intercede',
    icon: 'volunteer_activism', color: '#f43f5e', bg: 'rgba(244,63,94,0.10)',
  },
  {
    id: 'giving', label: 'Giving', desc: 'Support the ministry',
    icon: 'redeem', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',
  },
  {
    id: 'chat', label: 'Chat', desc: 'Message your community',
    icon: 'chat', color: '#6366f1', bg: 'rgba(99,102,241,0.10)',
  },
];

const feedItems: FeedItem[] = [
  {
    id: 1, title: 'Walking in Faith — Part 3', desc: 'New sermon is now available to watch',
    time: '2 hours ago', icon: 'videocam', color: '#2268f5', bg: 'rgba(34,104,245,0.10)',
  },
  {
    id: 2, title: 'Youth Fellowship Night', desc: 'Event reminder: Tomorrow at 6:00 PM',
    time: '5 hours ago', icon: 'calendar_today', color: '#10b981', bg: 'rgba(16,185,129,0.10)',
  },
  {
    id: 3, title: 'Sarah replied to your prayer', desc: '"Praying with you — God is faithful!"',
    time: '1 day ago', icon: 'chat_bubble', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',
  },
  {
    id: 4, title: 'New prayer request shared', desc: 'James posted a new request in the community',
    time: '2 days ago', icon: 'favorite', color: '#ef4444', bg: 'rgba(239,68,68,0.10)',
  },
];

const upcomingEvents: UpcomingEvent[] = [
  { id: 1, title: 'Sunday Worship Service', month: 'MAR', day: 9,  time: '10:00 AM' },
  { id: 2, title: 'Youth Fellowship Night',  month: 'MAR', day: 11, time: '6:00 PM'  },
  { id: 3, title: 'Men\'s Bible Study',       month: 'MAR', day: 14, time: '7:30 PM'  },
];

/* ─── Component ──────────────────────────────────────────────── */

const MemberOverview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const greeting = () => {
    const h = now.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const displayName = user?.firstName
    ? `, ${user.firstName}`
    : '';

  const initials = (() => {
    const f = user?.firstName?.charAt(0) ?? '';
    const l = user?.lastName?.charAt(0) ?? '';
    return (f + l).toUpperCase() || 'M';
  })();

  const fullName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.email?.split('@')[0] ?? 'Member';

  const nav = (id: string) => navigate(`/member/${id}`);

  return (
    <div className="ov-page">

      {/* ── WELCOME BANNER ─────────────────────────────────── */}
      <section className="ov-banner" aria-label="Welcome">
        <div className="ov-banner-text">
          <p className="ov-banner-eyebrow">Member Portal</p>
          <h1 className="ov-banner-title">
            {greeting()}{displayName}!
          </h1>
          <p className="ov-banner-date">{formattedDate}</p>
        </div>

        <div className="ov-banner-actions">
          <button
            className="ov-btn-watch"
            onClick={() => navigate('/member/sermons')}
          >
            <Icon name="play_circle" size={18} />
            Watch Latest Sermon
          </button>
          <button
            className="ov-btn-events"
            onClick={() => navigate('/member/events')}
          >
            <Icon name="event" size={18} />
            View Events
          </button>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────── */}
      <section className="ov-stats" aria-label="Summary statistics">
        {stats.map((s) => (
          <div key={s.id} className="ov-stat">
            <div className="ov-stat-top">
              <div className="ov-stat-icon" style={{ backgroundColor: s.bg }}>
                <Icon name={s.icon} size={22} color={s.color} />
              </div>
              <div className={`ov-stat-trend ${s.trend}`}>
                {s.trend === 'up'   && <Icon name="trending_up"   size={13} />}
                {s.trend === 'down' && <Icon name="trending_down" size={13} />}
                <span>{s.change}</span>
              </div>
            </div>
            <div className="ov-stat-bottom">
              <div className="ov-stat-value">{s.value}</div>
              <div className="ov-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </section>

      {/* ── MAIN GRID ──────────────────────────────────────── */}
      <div className="ov-grid">

        {/* LEFT column */}
        <div className="ov-col">

          {/* Quick Actions */}
          <section aria-label="Quick access">
            <div className="ov-section-head">
              <h2 className="ov-section-title">
                <Icon name="bolt" size={18} />
                Quick Access
              </h2>
            </div>
            <div className="ov-actions-grid">
              {quickActions.map((a) => (
                <button
                  key={a.id}
                  className="ov-action"
                  onClick={() => nav(a.id)}
                >
                  <div className="ov-action-icon" style={{ backgroundColor: a.bg }}>
                    <Icon name={a.icon} size={22} color={a.color} />
                  </div>
                  <div className="ov-action-body">
                    <div className="ov-action-row">
                      <span className="ov-action-label">{a.label}</span>
                      {a.badge && (
                        <span className="ov-action-badge">{a.badge}</span>
                      )}
                    </div>
                    <p className="ov-action-desc">{a.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Activity Feed */}
          <section aria-label="Recent activity">
            <div className="ov-section-head">
              <h2 className="ov-section-title">
                <Icon name="notifications" size={18} />
                Recent Activity
              </h2>
              <button className="ov-section-link">
                View all <Icon name="arrow_forward" size={13} />
              </button>
            </div>
            <div className="ov-feed">
              <div className="ov-feed-list">
                {feedItems.map((item, i) => (
                  <div
                    key={item.id}
                    className="ov-feed-item"
                    style={{ animationDelay: `${i * 0.07}s` }}
                  >
                    <div
                      className="ov-feed-icon"
                      style={{ backgroundColor: item.bg }}
                    >
                      <Icon name={item.icon} size={19} color={item.color} />
                    </div>
                    <div className="ov-feed-content">
                      <h4 className="ov-feed-title">{item.title}</h4>
                      <p className="ov-feed-desc">{item.desc}</p>
                      <span className="ov-feed-meta">
                        <Icon name="schedule" size={12} />
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="ov-feed-footer">
                View All Activity
                <Icon name="arrow_forward" size={14} />
              </button>
            </div>
          </section>

        </div>

        {/* RIGHT column */}
        <div className="ov-col ov-col-right">

          {/* Profile Card */}
          <section aria-label="My profile">
            <div className="ov-section-head">
              <h2 className="ov-section-title">
                <Icon name="person" size={18} />
                My Account
              </h2>
            </div>
            <div className="ov-profile">
              <div className="ov-profile-banner">
                <div className="ov-profile-avatar-wrap">
                  {user?.profilePicture ? (
                    <div className="ov-profile-avatar">
                      <img src={user.profilePicture} alt={fullName} />
                    </div>
                  ) : (
                    <div className="ov-profile-avatar">{initials}</div>
                  )}
                </div>
              </div>
              <div className="ov-profile-body">
                <h3 className="ov-profile-name">{fullName}</h3>
                <p className="ov-profile-email">{user?.email}</p>

                <div className="ov-profile-badges">
                  <span className="ov-badge ov-badge-role">
                    <Icon name="badge" size={11} />
                    {user?.role ?? 'Member'}
                  </span>
                  <span className={`ov-badge ${user?.isActive ? 'ov-badge-active' : 'ov-badge-inactive'}`}>
                    <Icon name="circle" size={8} />
                    {user?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="ov-profile-meta">
                  <div className="ov-meta-row">
                    <span className="ov-meta-label">
                      <Icon name="calendar_month" size={13} />
                      Member since
                    </span>
                    <span className="ov-meta-value">
                      {user?.dateJoined
                        ? new Date(user.dateJoined).toLocaleDateString('en-US', {
                            month: 'short', year: 'numeric',
                          })
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="ov-meta-row">
                    <span className="ov-meta-label">
                      <Icon name="verified" size={13} />
                      Verified
                    </span>
                    <span className="ov-meta-value">Yes</span>
                  </div>
                </div>

                <button
                  className="ov-btn-manage"
                  onClick={() => navigate('/member/chat')}
                >
                  <Icon name="settings" size={16} />
                  Open Chat
                </button>
              </div>
            </div>
          </section>

          {/* Upcoming Events */}
          <section aria-label="Upcoming events">
            <div className="ov-section-head">
              <h2 className="ov-section-title">
                <Icon name="event" size={18} />
                Upcoming Events
              </h2>
              <button
                className="ov-section-link"
                onClick={() => navigate('/member/events')}
              >
                All <Icon name="arrow_forward" size={13} />
              </button>
            </div>
            <div className="ov-events">
              <div className="ov-events-body">
                {upcomingEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="ov-event-item"
                    onClick={() => navigate('/member/events')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/member/events')}
                  >
                    <div className="ov-event-date">
                      <span className="ov-event-month">{ev.month}</span>
                      <span className="ov-event-day">{ev.day}</span>
                    </div>
                    <div className="ov-event-info">
                      <p className="ov-event-title">{ev.title}</p>
                      <span className="ov-event-time">
                        <Icon name="schedule" size={11} />
                        {ev.time}
                      </span>
                    </div>
                    <Icon name="chevron_right" size={16} color="var(--m-text-tertiary)" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Helpful Links */}
          <section aria-label="Helpful links">
            <div className="ov-section-head">
              <h2 className="ov-section-title">
                <Icon name="link" size={18} />
                Helpful Links
              </h2>
            </div>
            <div className="ov-links">
              <button className="ov-link-item" onClick={() => navigate('/member/help')}>
                <Icon name="help_outline" size={17} color="var(--m-text-secondary)" />
                <span className="ov-link-text">Help &amp; Support</span>
                <Icon name="arrow_forward" size={15} className="ov-link-arrow" />
              </button>
              <button className="ov-link-item" onClick={() => navigate('/member/settings')}>
                <Icon name="tune" size={17} color="var(--m-text-secondary)" />
                <span className="ov-link-text">Preferences</span>
                <Icon name="arrow_forward" size={15} className="ov-link-arrow" />
              </button>
              <button className="ov-link-item" onClick={() => window.open('/terms', '_blank')}>
                <Icon name="description" size={17} color="var(--m-text-secondary)" />
                <span className="ov-link-text">Terms &amp; Privacy</span>
                <Icon name="open_in_new" size={15} className="ov-link-arrow" />
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default MemberOverview;
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import MemberIcon, { type MemberIconName } from '../components/MemberIcon';
import './MemberOverview.css';

interface Stat {
  id: number;
  label: string;
  value: number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: MemberIconName;
  color: string;
  bg: string;
}

interface QuickAction {
  id: string;
  label: string;
  desc: string;
  icon: MemberIconName;
  color: string;
  bg: string;
  badge?: string;
}

interface FeedItem {
  id: number;
  title: string;
  desc: string;
  time: string;
  icon: MemberIconName;
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

const stats: Stat[] = [
  {
    id: 1,
    label: 'New Sermons',
    value: 3,
    change: '+2 this week',
    trend: 'up',
    icon: 'sermons',
    color: '#4338CA',
    bg: 'rgba(67,56,202,0.10)',
  },
  {
    id: 2,
    label: 'Upcoming Events',
    value: 5,
    change: '+1 this month',
    trend: 'up',
    icon: 'events',
    color: '#16A34A',
    bg: 'rgba(22,163,74,0.10)',
  },
  {
    id: 3,
    label: 'Unread Messages',
    value: 2,
    change: 'New today',
    trend: 'neutral',
    icon: 'chat',
    color: '#D97706',
    bg: 'rgba(217,119,6,0.10)',
  },
  {
    id: 4,
    label: 'Prayer Requests',
    value: 8,
    change: '3 this week',
    trend: 'up',
    icon: 'prayer',
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.10)',
  },
];

const quickActions: QuickAction[] = [
  {
    id: 'sermons',
    label: 'Sermons',
    desc: 'Watch and grow',
    icon: 'sermons',
    color: '#4338CA',
    bg: 'rgba(67,56,202,0.10)',
    badge: '3 new',
  },
  {
    id: 'events',
    label: 'Events',
    desc: 'Upcoming activities',
    icon: 'events',
    color: '#16A34A',
    bg: 'rgba(22,163,74,0.10)',
    badge: '5 upcoming',
  },
  {
    id: 'community',
    label: 'Community',
    desc: 'Connect and discuss',
    icon: 'community',
    color: '#0891B2',
    bg: 'rgba(8,145,178,0.10)',
  },
  {
    id: 'prayer',
    label: 'Prayer',
    desc: 'Share and intercede',
    icon: 'prayer',
    color: '#E11D48',
    bg: 'rgba(225,29,72,0.10)',
  },
  {
    id: 'giving',
    label: 'Giving',
    desc: 'Support the ministry',
    icon: 'giving',
    color: '#D97706',
    bg: 'rgba(217,119,6,0.10)',
  },
  {
    id: 'chat',
    label: 'Chat',
    desc: 'Message your community',
    icon: 'chat',
    color: '#4F46E5',
    bg: 'rgba(79,70,229,0.10)',
  },
];

const feedItems: FeedItem[] = [
  {
    id: 1,
    title: 'Walking in Faith - Part 3',
    desc: 'A new sermon is now available to watch.',
    time: '2 hours ago',
    icon: 'sermons',
    color: '#4338CA',
    bg: 'rgba(67,56,202,0.10)',
  },
  {
    id: 2,
    title: 'Youth Fellowship Night',
    desc: 'Event reminder: Tomorrow at 6:00 PM.',
    time: '5 hours ago',
    icon: 'events',
    color: '#16A34A',
    bg: 'rgba(22,163,74,0.10)',
  },
  {
    id: 3,
    title: 'Reply on your prayer request',
    desc: 'A member of the community prayed with you.',
    time: '1 day ago',
    icon: 'chat',
    color: '#D97706',
    bg: 'rgba(217,119,6,0.10)',
  },
  {
    id: 4,
    title: 'New prayer request posted',
    desc: 'A fresh request was shared in the prayer wall.',
    time: '2 days ago',
    icon: 'heart',
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.10)',
  },
];

const upcomingEvents: UpcomingEvent[] = [
  { id: 1, title: 'Sunday Worship Service', month: 'MAR', day: 9, time: '10:00 AM' },
  { id: 2, title: 'Youth Fellowship Night', month: 'MAR', day: 11, time: '6:00 PM' },
  { id: 3, title: "Men's Bible Study", month: 'MAR', day: 14, time: '7:30 PM' },
];

const MemberOverview: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const greeting = (): string => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const displayName = user?.firstName ? `, ${user.firstName}` : '';

  const initials = (() => {
    const first = user?.firstName?.charAt(0) ?? '';
    const last = user?.lastName?.charAt(0) ?? '';
    return (first + last).toUpperCase() || 'M';
  })();

  const fullName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email?.split('@')[0] ?? 'Member';

  const navToMemberRoute = (id: string): void => {
    navigate(id === 'overview' ? '/member' : `/member/${id}`);
  };

  return (
    <div className="ov-page">
      <section className="ov-banner" aria-label="Member welcome">
        <div className="ov-banner-text">
          <p className="ov-banner-eyebrow">Member Portal</p>
          <h1 className="ov-banner-title">
            {greeting()}
            {displayName}!
          </h1>
          <p className="ov-banner-date">{formattedDate}</p>
        </div>

        <div className="ov-banner-actions">
          <button className="ov-btn-watch" onClick={() => navigate('/member/sermons')}>
            <MemberIcon name="sermons" size={17} />
            Watch Latest Sermon
          </button>
          <button className="ov-btn-events" onClick={() => navigate('/member/events')}>
            <MemberIcon name="events" size={17} />
            View Events
          </button>
        </div>
      </section>

      <section className="ov-stats" aria-label="Summary statistics">
        {stats.map((item) => (
          <article key={item.id} className="ov-stat">
            <div className="ov-stat-top">
              <div className="ov-stat-icon" style={{ backgroundColor: item.bg }}>
                <MemberIcon name={item.icon} size={20} color={item.color} />
              </div>
              <div className={`ov-stat-trend ${item.trend}`}>
                {item.trend === 'up' && <MemberIcon name="trendUp" size={13} />}
                {item.trend === 'down' && <MemberIcon name="trendDown" size={13} />}
                <span>{item.change}</span>
              </div>
            </div>

            <div className="ov-stat-bottom">
              <div className="ov-stat-value">{item.value}</div>
              <div className="ov-stat-label">{item.label}</div>
            </div>
          </article>
        ))}
      </section>

      <div className="ov-grid">
        <div className="ov-col">
          <section aria-label="Quick access">
            <div className="ov-section-head">
              <h2 className="ov-section-title">
                <MemberIcon name="spark" size={17} />
                Quick Access
              </h2>
            </div>

            <div className="ov-actions-grid">
              {quickActions.map((action) => (
                <button key={action.id} className="ov-action" onClick={() => navToMemberRoute(action.id)}>
                  <div className="ov-action-icon" style={{ backgroundColor: action.bg }}>
                    <MemberIcon name={action.icon} size={20} color={action.color} />
                  </div>

                  <div className="ov-action-body">
                    <div className="ov-action-row">
                      <span className="ov-action-label">{action.label}</span>
                      {action.badge && <span className="ov-action-badge">{action.badge}</span>}
                    </div>
                    <p className="ov-action-desc">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section aria-label="Recent activity">
            <div className="ov-section-head">
              <h2 className="ov-section-title">
                <MemberIcon name="notifications" size={17} />
                Recent Activity
              </h2>
              <button className="ov-section-link" onClick={() => navigate('/member/community')}>
                View all
                <MemberIcon name="arrowRight" size={13} />
              </button>
            </div>

            <div className="ov-feed">
              <div className="ov-feed-list">
                {feedItems.map((item, index) => (
                  <div key={item.id} className="ov-feed-item" style={{ animationDelay: `${index * 0.07}s` }}>
                    <div className="ov-feed-icon" style={{ backgroundColor: item.bg }}>
                      <MemberIcon name={item.icon} size={18} color={item.color} />
                    </div>

                    <div className="ov-feed-content">
                      <h4 className="ov-feed-title">{item.title}</h4>
                      <p className="ov-feed-desc">{item.desc}</p>
                      <span className="ov-feed-meta">
                        <MemberIcon name="clock" size={12} />
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button className="ov-feed-footer" onClick={() => navigate('/member/community')}>
                View Community Activity
                <MemberIcon name="arrowRight" size={14} />
              </button>
            </div>
          </section>
        </div>

        <div className="ov-col ov-col-right">
          <section aria-label="My account">
            <div className="ov-section-head">
              <h2 className="ov-section-title">
                <MemberIcon name="user" size={17} />
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
                    <MemberIcon name="verified" size={11} />
                    {user?.role ?? 'Member'}
                  </span>
                  <span className={`ov-badge ${user?.isActive ? 'ov-badge-active' : 'ov-badge-inactive'}`}>
                    <MemberIcon name="verified" size={10} />
                    {user?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="ov-profile-meta">
                  <div className="ov-meta-row">
                    <span className="ov-meta-label">
                      <MemberIcon name="events" size={13} />
                      Member since
                    </span>
                    <span className="ov-meta-value">
                      {user?.dateJoined
                        ? new Date(user.dateJoined).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="ov-meta-row">
                    <span className="ov-meta-label">
                      <MemberIcon name="verified" size={13} />
                      Verified
                    </span>
                    <span className="ov-meta-value">Yes</span>
                  </div>
                </div>

                <button className="ov-btn-manage" onClick={() => navigate('/member/settings')}>
                  <MemberIcon name="settings" size={16} />
                  Manage Account
                </button>
              </div>
            </div>
          </section>

          <section aria-label="Upcoming events">
            <div className="ov-section-head">
              <h2 className="ov-section-title">
                <MemberIcon name="events" size={17} />
                Upcoming Events
              </h2>
              <button className="ov-section-link" onClick={() => navigate('/member/events')}>
                All
                <MemberIcon name="arrowRight" size={13} />
              </button>
            </div>

            <div className="ov-events">
              <div className="ov-events-body">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="ov-event-item"
                    onClick={() => navigate('/member/events')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/member/events')}
                  >
                    <div className="ov-event-date">
                      <span className="ov-event-month">{event.month}</span>
                      <span className="ov-event-day">{event.day}</span>
                    </div>

                    <div className="ov-event-info">
                      <p className="ov-event-title">{event.title}</p>
                      <span className="ov-event-time">
                        <MemberIcon name="clock" size={11} />
                        {event.time}
                      </span>
                    </div>

                    <MemberIcon name="chevronRight" size={16} color="var(--m-text-tertiary)" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section aria-label="Helpful links">
            <div className="ov-section-head">
              <h2 className="ov-section-title">
                <MemberIcon name="link" size={17} />
                Helpful Links
              </h2>
            </div>

            <div className="ov-links">
              <button className="ov-link-item" onClick={() => navigate('/contact')}>
                <MemberIcon name="help" size={17} color="var(--m-text-secondary)" />
                <span className="ov-link-text">Help and Support</span>
                <MemberIcon name="arrowRight" size={15} className="ov-link-arrow" />
              </button>

              <button className="ov-link-item" onClick={() => navigate('/member/settings')}>
                <MemberIcon name="settings" size={17} color="var(--m-text-secondary)" />
                <span className="ov-link-text">Preferences</span>
                <MemberIcon name="arrowRight" size={15} className="ov-link-arrow" />
              </button>

              <button className="ov-link-item" onClick={() => window.open('/privacy-policy', '_blank')}>
                <MemberIcon name="link" size={17} color="var(--m-text-secondary)" />
                <span className="ov-link-text">Privacy Policy</span>
                <MemberIcon name="external" size={15} className="ov-link-arrow" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MemberOverview;

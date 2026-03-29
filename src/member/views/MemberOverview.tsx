/**
 * Member Overview — Sanctuary Bento Dashboard
 * Layout matches the Sanctuary HTML design exactly:
 *   • Greeting section (Noto Serif, navy)
 *   • 12-col bento grid:
 *       8 col — Word for the Day (image + Psalm quote)
 *       4 col — Give CTA (navy + amber gradient button)
 *       6 col — Recent Sermon (thumb + play button)
 *       6 col — Upcoming Event (details + avatar stack + RSVP)
 *      12 col — Daily Prayer | Community Post
 *
 * Auth: useAuth() for user first name only. All content is mock.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CirclePlus,
  HandHeart,
  Headphones,
  Heart,
  MessageCircle,
  Play,
  Users,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import './MemberOverview.css';

/* ── Mock data ────────────────────────────────────────────────
   Replace these with real API calls when your backend is ready.
─────────────────────────────────────────────────────────────── */
const DAILY_VERSE = {
  label: 'Word for the Day',
  quote:
    '"The Lord is my shepherd; I shall not want. He makes me lie down in green pastures. He leads me beside still waters."',
  citation: '— Psalm 23:1-2',
  /* Unsplash free-to-use landscape image */
  imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
};

const LATEST_SERMON = {
  tag: 'Latest Sermon',
  date: 'Sunday, Oct 22',
  title: 'Finding Peace in the Midst of Storms',
  desc:
    'Join Pastor Marcus as he explores the theological depth of resilience and how we can anchor our souls during seasons of uncertainty.',
  audioAvailable: true,
  imageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80',
};

const UPCOMING_EVENT = {
  eyebrow: 'Next Up',
  title: 'Community Harvest Festival',
  desc:
    "A time of gratitude and fellowship for the whole family. We'll have local produce, music, and children's activities in the North Courtyard.",
  attendeeCount: '+12',
};

const DAILY_PRAYER = {
  quote: '"May your grace guide my hands today, and your wisdom speak through my words."',
};

const COMMUNITY_POST = {
  author: 'Sarah J.',
  role: '• Community Council',
  text: '"Does anyone have recommendations for devotional books for the Advent season? Looking for something meditative..."',
  replies: 8,
  likes: 14,
};

/* ── Component ────────────────────────────────────────────────  */
const MemberOverview: React.FC = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const firstName = user?.firstName ?? 'Friend';

  return (
    <div className="ov-page">

      {/* ── Bento Grid ───────────────────────────────────── */}
      <div className="ov-bento">

        {/* 1 — Word for the Day (8 cols) */}
        <div className="ov-word ov-card" aria-label="Word for the Day">
          {/* Decorative background */}
          <div className="ov-word-bg" aria-hidden="true" />

          {/* Hero image */}
          <img
            className="ov-word-img"
            src={DAILY_VERSE.imageUrl}
            alt="Mountain landscape at dawn"
            aria-hidden="true"
          />

          {/* Gradient overlay */}
          <div className="ov-word-overlay" aria-hidden="true" />

          {/* Content */}
          <div className="ov-word-body">
            <span className="ov-word-label">{DAILY_VERSE.label}</span>
            <blockquote className="ov-word-quote">
              {DAILY_VERSE.quote}
            </blockquote>
            <cite className="ov-word-cite">{DAILY_VERSE.citation}</cite>
          </div>
        </div>

        {/* 2 — Give CTA (4 cols) */}
        <div className="ov-give" aria-label="Give and support the mission">
          <div>
            <HandHeart
              className="ov-give-icon"
              size={40}
              strokeWidth={1.9}
              aria-hidden="true"
            />
            <h2 className="ov-give-title">Support the Mission</h2>
            <p className="ov-give-desc">
              Your generosity fuels our outreach, community care, and local
              sanctuary improvements.
            </p>
          </div>

          <button
            className="ov-give-btn"
            onClick={() => navigate('/member/giving')}
            aria-label="Give tithe and offering"
          >
            <span>Give Tithe &amp; Offering</span>
            <ArrowRight className="ov-give-btn-icon" size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>

        {/* 3 — Recent Sermon (6 cols) */}
        <article
          className="ov-sermon ov-card"
          aria-label="Latest sermon"
        >
          {/* Thumbnail */}
          <div className="ov-sermon-thumb">
            <div className="ov-sermon-bg" aria-hidden="true" />
            <img
              className="ov-sermon-img"
              src={LATEST_SERMON.imageUrl}
              alt="Church sanctuary interior"
            />
            <div className="ov-sermon-tint" aria-hidden="true">
              <button
                className="ov-sermon-play"
                onClick={() => navigate('/member/sermons')}
                aria-label="Play latest sermon"
              >
                <Play className="ov-sermon-play-icon" size={30} strokeWidth={2.3} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="ov-sermon-body">
            <div className="ov-sermon-meta">
              <span className="ov-sermon-tag">{LATEST_SERMON.tag}</span>
              <span className="ov-sermon-date">{LATEST_SERMON.date}</span>
            </div>

            <h3 className="ov-sermon-title">{LATEST_SERMON.title}</h3>
            <p className="ov-sermon-desc">{LATEST_SERMON.desc}</p>

            {LATEST_SERMON.audioAvailable && (
              <div className="ov-sermon-audio" aria-label="Audio reflection available">
                <Headphones className="ov-sermon-audio-icon" size={18} strokeWidth={2} aria-hidden="true" />
                <span className="ov-sermon-audio-label">
                  Audio Reflection Available
                </span>
              </div>
            )}
          </div>
        </article>

        {/* 4 — Upcoming Event (6 cols) */}
        <div
          className="ov-event-card"
          aria-label="Upcoming event"
        >
          <div>
            {/* Eyebrow */}
            <div className="ov-event-card-eyebrow">
              <CalendarDays
                className="ov-event-card-eyebrow-icon"
                size={18}
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="ov-event-card-eyebrow-text">
                {UPCOMING_EVENT.eyebrow}
              </span>
            </div>

            <h2 className="ov-event-card-title">{UPCOMING_EVENT.title}</h2>
            <p className="ov-event-card-desc">{UPCOMING_EVENT.desc}</p>
          </div>

          {/* Footer */}
          <div className="ov-event-card-footer">
            {/* Avatar stack */}
            <div className="ov-event-avatars" aria-label="Attendees">
              {/* Placeholder avatars — replace with real attendee data */}
              <div className="ov-event-avatar" aria-hidden="true">
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #506169 0%, #37474f 100%)',
                  }}
                />
              </div>
              <div className="ov-event-avatar" aria-hidden="true">
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #000666 0%, #1a237e 100%)',
                  }}
                />
              </div>
              <div
                className="ov-event-avatar-more"
                aria-label={`${UPCOMING_EVENT.attendeeCount} more attendees`}
              >
                {UPCOMING_EVENT.attendeeCount}
              </div>
            </div>

            <button
              className="ov-event-rsvp"
              onClick={() => navigate('/member/events')}
              aria-label="View event details and RSVP"
            >
              Details &amp; RSVP
            </button>
          </div>
        </div>

        {/* 5 — Bottom row: Prayer + Community (full 12 cols) */}
        <div className="ov-bottom">

          {/* Daily Prayer */}
          <div className="ov-prayer" aria-label="Daily prayer">
            <h3 className="ov-prayer-title">The Daily Prayer</h3>
            <p className="ov-prayer-quote">{DAILY_PRAYER.quote}</p>

            <button
              className="ov-prayer-btn"
              onClick={() => navigate('/member/prayer')}
              aria-label="Submit a prayer request"
            >
              <span className="ov-prayer-btn-icon">
                <CirclePlus
                  className="ov-prayer-btn-icon-sym"
                  size={18}
                  strokeWidth={2.1}
                  aria-hidden="true"
                />
              </span>
              <span>Submit Prayer Request</span>
            </button>
          </div>

          {/* Community Post */}
          <div className="ov-community" aria-label="Recent community post">
            <div className="ov-community-icon-wrap" aria-hidden="true">
              <Users className="ov-community-icon-sym" size={22} strokeWidth={2} aria-hidden="true" />
            </div>

            <div className="ov-community-body">
              <div className="ov-community-author-row">
                <span className="ov-community-author">
                  {COMMUNITY_POST.author}
                </span>
                <span className="ov-community-role">
                  {COMMUNITY_POST.role}
                </span>
              </div>

              <p className="ov-community-text">{COMMUNITY_POST.text}</p>

              <div className="ov-community-actions">
                <button
                  className="ov-community-action-btn"
                  onClick={() => navigate('/member/community')}
                  aria-label={`${COMMUNITY_POST.replies} replies`}
                >
                  <MessageCircle
                    className="ov-community-action-icon"
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  {COMMUNITY_POST.replies} replies
                </button>

                <button
                  className="ov-community-action-btn"
                  onClick={() => navigate('/member/community')}
                  aria-label={`${COMMUNITY_POST.likes} likes`}
                >
                  <Heart
                    className="ov-community-action-icon"
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  {COMMUNITY_POST.likes}
                </button>
              </div>
            </div>
          </div>

        </div>{/* /.ov-bottom */}

      </div>{/* /.ov-bento */}
    </div>
  );
};

export default MemberOverview;
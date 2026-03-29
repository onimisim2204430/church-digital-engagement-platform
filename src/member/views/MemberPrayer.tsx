/**
 * Prayer Requests — Sanctuary
 * Converted from reference HTML exactly.
 */

import React from 'react';
import {
  CirclePlus,
  Heart,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import './MemberPrayer.css';

const PrayerRequests: React.FC = () => {
  return (
    <div className="pr-page">
      {/* Hero / Action Section */}
      <section className="pr-hero-section">
        <div className="pr-hero-card">
          {/* Background image + overlay */}
          <div className="pr-hero-bg" aria-hidden="true">
            <img
              alt="Peaceful background"
              className="pr-hero-bg-img"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCa2C8R3DLHAvNHw2eKtzVhWbZrx68ZPyjt3gPBidrCB04zDhJibGKGhr-BTCYI8Mk2YhbUiZkunKuszrn0FV7Oc4KqID-1YN4gDse_74K6GRehxgJWgWNFF-1FJaPVx97Q_duv0_AcIxODGY22qk0haOlU4SLvZKWxwAHJhnCRRH68WfIVKymhh-Kl1ivDriXAdY4bkk8gjL58eU16-pjsYpoGaZJKRD8FeCXfVX_16HcOMM1Ne1yYTj1BUlKZuOqKC5sWHtjf1MU"
            />
            <div className="pr-hero-overlay" />
          </div>

          {/* Content */}
          <div className="pr-hero-content">
            <h4 className="pr-hero-heading">Carry one another's burdens.</h4>
            <p className="pr-hero-sub">
              In our digital sanctuary, your requests are heard, and your spirit is supported by a
              community that cares.
            </p>
            <button type="button" className="pr-hero-btn">
              <CirclePlus />
              Submit a Prayer Request
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="pr-layout">
        {/* Feed Section */}
        <div className="pr-feed">
          <div className="pr-feed-header">
            <h3 className="pr-feed-title">Shared Prayer Requests</h3>
            <div className="pr-toggle">
              <button type="button" className="pr-toggle-btn pr-toggle-active">Public</button>
              <button type="button" className="pr-toggle-btn">Leadership Only</button>
            </div>
          </div>

          {/* Prayer Card 1 */}
          <article className="pr-card pr-card-featured">
            <div className="pr-card-top">
              <div className="pr-card-author">
                <div className="pr-avatar pr-avatar-secondary">M</div>
                <div>
                  <h4 className="pr-author-name">Martha Jenkins</h4>
                  <p className="pr-author-meta">2 hours ago • Health &amp; Healing</p>
                </div>
              </div>
              <span className="pr-group-badge">Bible Study Group</span>
            </div>
            <p className="pr-card-text pr-card-text-italic">
              "Please pray for my grandson who is undergoing surgery tomorrow morning. We are leaning
              on faith but seeking peace for his parents."
            </p>
            <div className="pr-card-actions">
              <button type="button" className="pr-action-btn pr-action-primary">
                <Heart />
                <span className="pr-action-label">Praying (42)</span>
              </button>
              <button type="button" className="pr-action-btn pr-action-secondary">
                <MessageCircle />
                <span className="pr-action-label">Leave Encouragement (8)</span>
              </button>
            </div>
          </article>

          {/* Prayer Card 2 */}
          <article className="pr-card pr-card-plain">
            <div className="pr-card-top">
              <div className="pr-card-author">
                <div className="pr-avatar pr-avatar-primary">D</div>
                <div>
                  <h4 className="pr-author-name">David Chen</h4>
                  <p className="pr-author-meta">Yesterday • Career Guidance</p>
                </div>
              </div>
            </div>
            <p className="pr-card-text">
              Asking for clarity and wisdom as I navigate a difficult transition at work. Seeking
              God's hand in every decision I make this week.
            </p>
            <div className="pr-card-actions">
              <button type="button" className="pr-action-btn pr-action-primary">
                <Heart />
                <span className="pr-action-label">Praying (15)</span>
              </button>
              <button type="button" className="pr-action-btn pr-action-secondary">
                <MessageCircle />
                <span className="pr-action-label">Leave Encouragement</span>
              </button>
            </div>
          </article>
        </div>

        {/* Sidebar */}
        <aside className="pr-sidebar">
          {/* My Prayer History */}
          <section className="pr-history-card">
            <h3 className="pr-sidebar-title">My Prayer History</h3>
            <div className="pr-history-list">
              <div className="pr-history-item">
                <div className="pr-history-item-head">
                  <p className="pr-history-status pr-history-answered">Answered</p>
                  <p className="pr-history-date">Oct 12</p>
                </div>
                <p className="pr-history-text line-clamp-2">
                  Strength for the community outreach event...
                </p>
              </div>
              <div className="pr-history-item">
                <div className="pr-history-item-head">
                  <p className="pr-history-status pr-history-requested">Requested</p>
                  <p className="pr-history-date">2 days ago</p>
                </div>
                <p className="pr-history-text line-clamp-2">
                  Healing for my neighbor Sarah...
                </p>
              </div>
            </div>
            <button type="button" className="pr-history-btn">
              View Full History
            </button>
          </section>

          {/* Reflection Space */}
          <section className="pr-reflection-card">
            <Sparkles className="pr-reflection-icon" />
            <h3 className="pr-reflection-title">A Quiet Reflection</h3>
            <p className="pr-reflection-verse">
              "Be still, and know that I am God."
            </p>
            <div className="pr-reflection-input">
              Write a personal reflection or private note...
            </div>
          </section>
        </aside>
      </div>

      {/* Scripture for Comfort */}
      <section className="pr-scripture-section">
        <div className="pr-scripture-rule" aria-hidden="true" />
        <h3 className="pr-scripture-heading">Scripture for Comfort</h3>
        <blockquote className="pr-scripture-quote">
          "Come to me, all you who are weary and burdened, and I will give you rest. Take my yoke
          upon you and learn from me, for I am gentle and humble in heart, and you will find rest
          for your souls."
        </blockquote>
        <cite className="pr-scripture-cite">— Matthew 11:28-29</cite>
      </section>
    </div>
  );
};

export default PrayerRequests;
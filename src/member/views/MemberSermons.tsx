/**
 * Sermons Page — Sanctuary
 * Converted from reference HTML exactly.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Filter,
  Play,
  Search,
  User,
} from 'lucide-react';
import seriesService, { MemberRecentSermon } from '../../services/series.service';
import './MemberSermons.css';

type RecentSermonCard = {
  id: string;
  title: string;
  description: string;
  speaker: string;
  dateLabel: string;
  imageSrc: string;
  speakerAvatar?: string;
  seriesLabel: string;
};

const STATIC_RECENT_FALLBACK: RecentSermonCard[] = [
  {
    id: 'fallback-1',
    title: 'Finding Peace in the Midst of Storms',
    description:
      'Explore how to anchor your soul in the promises of God during seasons of uncertainty and high-pressure transitions.',
    speaker: 'Pastor David Chen',
    dateLabel: 'Oct 15, 2023',
    imageSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCR9OFK_iE9VzhhB4PML0qv2ewAR6SMA_E9scHOqdpEfKtUOFAzL2cAZPUnZw_KPRR5vb5aD9BXo6YvO3_aOLTzB5fB0Hzv-5PD54ysz4bnqngx4SYO1htdv0cNC3uxt8QpGwA3iUXzP1r7ptCzzkiGaozvC3T4Ed3PvLZqInLtLgAPkH_ngO2P4SR56L3upTOQjfWrz85yz2OpDVJ9Q1D8aJbRx8NzdZRXCf6swuuLZnnXxUEhIpqOdtkxtI6GzrUuwAhF_d5ivPs',
    speakerAvatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBOuP-hJQPQxOwW1LTVUqa1RK4R_ABPcHZsHWISp-pueHmKhhLH8SlLznbR2u6TTmvOdyhRATVKYiEiesUZjPuTE6zku1lPCGU95F-TgYLQBjfLNd5Jttv3BWIvbz9z3JHeuXI0Aw4-HuessCDak91YuJ0KVjqu9hz4YbsHimxv0T_NYQ3WldA2p_id6xwGEoK3xtyZk3mH-KSFiJkgC9M7dumVI4z1OU5PiLUZzyKF43YS0RS1J7jG1QcF8xNw28qbW4P-SMIC9c4',
    seriesLabel: 'Teaching Series',
  },
  {
    id: 'fallback-2',
    title: 'The Architecture of Prayer',
    description: '',
    speaker: 'Sarah Jenkins',
    dateLabel: 'Oct 12, 2023',
    imageSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBl7IX5fPWCWEHZ0uRvlI1jZQ0CaI_qN3AVDAsv3Oh2VAkLPACMW-7-h-sEBfQFkdSa5wII29-LlerugeslkcrJ2WTtTnQLJnW8DdoYgtZ3rMUFWHvuftLfr6rrWwILi8UppmVUXlvErjX8ZRk0YLQ1HL1OrMFfVD4DHkPkLHwHTDhtJ1MlDY7We-lc0FFToGmt2WKSrWvCyGz5H5XRnRls9GUgWUCCfFtAoQG86GrmGpFSwC-eGKrviDthYzoernIaJq1iPZaZtho',
    seriesLabel: 'Teaching Series',
  },
  {
    id: 'fallback-3',
    title: 'Community: The New Commandment',
    description: '',
    speaker: 'Rev. Mark Solano',
    dateLabel: 'Oct 10, 2023',
    imageSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAOug4oTXeR7EJRAndlpgiiUxI5oUxEWoLOtvvjRCJsaDFK6dpMBcjhhAd2Q2Qqx4u1DN2nenrqvIcm6tnGauoF0cuAJBGJVBgdwDJJEiliszciuIlCsGVINTroJBX4xMJukU0-Jkfs4LpXbL7vxOihCvtyvugqTWBapK3lwUZML4Zq2GFBOUjJ5i56XtFzYYHR2FNUq73pj1-hTCegpGFlrNjn212md7vQNPmKnj9ycdtnXk3okQQep7RG_tm1tbwDWFiMfua3a8k',
    seriesLabel: 'Teaching Series',
  },
];

const stripHtml = (value: string): string => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const formatDateLabel = (value?: string | null): string => {
  if (!value) {
    return 'Recently';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const mapRecentSermonToCard = (item: MemberRecentSermon): RecentSermonCard => ({
  id: item.id,
  title: item.title,
  description: stripHtml(item.content || ''),
  speaker: item.speaker_name || 'Guest Speaker',
  dateLabel: formatDateLabel(item.published_at || item.created_at),
  imageSrc: item.featured_image || STATIC_RECENT_FALLBACK[0].imageSrc,
  speakerAvatar: item.speaker_avatar || undefined,
  seriesLabel: item.series_title || 'Teaching Series',
});

const SermonsPage: React.FC = () => {
  const [recentCards, setRecentCards] = useState<RecentSermonCard[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    const loadRecentSermons = async () => {
      try {
        const [data, saved] = await Promise.all([
          seriesService.getMemberRecentSermons(),
          seriesService.getMemberSavedPosts(),
        ]);
        if (!isMounted) {
          return;
        }
        const mapped = data.map(mapRecentSermonToCard);
        setRecentCards(mapped);
        setSavedPostIds(new Set(saved.map((item) => item.post.id)));
      } catch {
        if (!isMounted) {
          return;
        }
        setRecentCards([]);
      }
    };

    loadRecentSermons();

    return () => {
      isMounted = false;
    };
  }, []);

  const cards = useMemo(() => {
    const merged = [...recentCards];
    for (const fallback of STATIC_RECENT_FALLBACK) {
      if (merged.length >= 3) {
        break;
      }
      if (!merged.some((item) => item.id === fallback.id)) {
        merged.push(fallback);
      }
    }
    return merged.slice(0, 3);
  }, [recentCards]);

  const featuredCard = cards[0] || STATIC_RECENT_FALLBACK[0];
  const stackCards = cards.slice(1, 3);

  const toggleSave = async (postId: string) => {
    if (!postId || postId.startsWith('fallback-')) {
      return;
    }

    try {
      const response = await seriesService.toggleSavedPost(postId);
      setSavedPostIds((prev) => {
        const next = new Set(prev);
        if (response.saved) {
          next.add(postId);
        } else {
          next.delete(postId);
        }
        return next;
      });
    } catch {
      // Preserve existing UI state if save toggle fails.
    }
  };

  return (
    <div className="sp-page">
      {/* Featured Sermon Section */}
      <section className="sp-featured-section">
        <div className="sp-featured-wrap">
          <img
            alt="Featured Sermon"
            className="sp-featured-img"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFAd3e3MFz_shbuhh3pWe8eriaYQ4gLmZk4-QFUi7_1OO6RHrr7eP76ymoDpTm9dVE8PU-LudcO6n_8QDEuqGBFCBimoP2dWCtt_-BD5W2AN-vfOmTkYkCMlK4JB9tWAqOZ3j_Um1-wuORX4UmtEuDM_xw1DgS5amyEXSMSWe0ettV1n4Hp6uXh3a_atMjWFFj_o1lokm_cOfIXCWOXdRNQsGM0SMcND_GbUsyTVupKc6grPCEpl2fRRAW1VZh74NteGw6XOhnwok"
          />
          <div className="sp-featured-overlay" />
          <div className="sp-featured-bottom">
            <div className="sp-featured-text">
              <span className="sp-featured-badge">Featured Message</span>
              <h1 className="sp-featured-title">Walking in Grace: The Journey of Faith</h1>
              <div className="sp-featured-meta">
                <span>Dr. Elias Thorne</span>
                <span className="sp-dot" />
                <span>October 22, 2023</span>
              </div>
            </div>
            <div className="sp-featured-play-wrap">
              <button className="sp-play-btn" type="button" aria-label="Play featured sermon">
                <Play className="sp-play-icon" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <section className="sp-search-section">
        <div className="sp-search-filter-row">
          <div className="sp-search-wrap">
            <Search className="sp-search-icon" />
            <input
              className="sp-search-input"
              type="text"
              placeholder="Search sermons, speakers, or topics..."
            />
          </div>
          <div className="sp-filter-chips">
            <button type="button" className="sp-filter-btn">
              <Filter className="sp-filter-icon" />
              All Topics
            </button>
            <button type="button" className="sp-filter-btn">
              <User className="sp-filter-icon" />
              All Speakers
            </button>
            <button type="button" className="sp-filter-btn">
              <CalendarDays className="sp-filter-icon" />
              Latest First
            </button>
          </div>
        </div>
      </section>

      {/* Recent Sermons */}
      <section className="sp-recent-section">
        <h2 className="sp-section-title">
          Recent Sermons
          <span className="sp-title-line" />
        </h2>

        <div className="sp-recent-grid">
          {/* Large Highlight Card */}
          <div className="sp-large-card">
            <div className="sp-large-card-thumb">
              <img
                alt="Sermon Thumbnail"
                className="sp-large-card-img"
                src={featuredCard.imageSrc}
              />
            </div>
            <div className="sp-large-card-body">
              <div className="sp-large-card-top">
                <span className="sp-series-badge">{featuredCard.seriesLabel}</span>
                <button
                  type="button"
                  className="sp-bookmark-btn"
                  onClick={() => {
                    void toggleSave(featuredCard.id);
                  }}
                >
                  <Bookmark fill={savedPostIds.has(featuredCard.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
              <h3 className="sp-large-card-title">
                {featuredCard.title}
              </h3>
              <p className="sp-large-card-desc line-clamp-2">
                {featuredCard.description}
              </p>
              <div className="sp-large-card-foot">
                <div className="sp-speaker-row">
                  <div className="sp-speaker-avatar">
                    <img
                      alt="Speaker"
                      src={featuredCard.speakerAvatar || STATIC_RECENT_FALLBACK[0].speakerAvatar}
                    />
                  </div>
                  <span className="sp-speaker-name">{featuredCard.speaker}</span>
                </div>
                <span className="sp-card-date">{featuredCard.dateLabel}</span>
              </div>
            </div>
          </div>

          {/* Vertical Card Stack */}
          <div className="sp-card-stack">
            {stackCards.map((card) => (
              <div className="sp-small-card" key={card.id}>
                <div className="sp-small-card-thumb">
                  <img
                    alt="Sermon Thumbnail"
                    className="sp-small-card-img"
                    src={card.imageSrc}
                  />
                </div>
                <div className="sp-small-card-body">
                  <button
                    type="button"
                    className="sp-bookmark-btn sp-bookmark-float"
                    onClick={() => {
                      void toggleSave(card.id);
                    }}
                  >
                    <Bookmark fill={savedPostIds.has(card.id) ? 'currentColor' : 'none'} />
                  </button>
                  <h3 className="sp-small-card-title">{card.title}</h3>
                  <div className="sp-small-card-meta">
                    <span>{card.speaker}</span>
                    <span className="sp-dot-sm" />
                    <span>{card.dateLabel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Teaching Series Section */}
      <section className="sp-series-section">
        <div className="sp-series-header">
          <h2 className="sp-series-title">Teaching Series</h2>
          <button type="button" className="sp-view-all-btn">
            View All Series
            <ArrowRight className="sp-arrow-icon" />
          </button>
        </div>

        <div className="sp-series-grid">
          {[
            {
              parts: '6 Parts',
              title: 'Echoes of Eternity',
              desc: 'An in-depth look at the book of Revelation and future hope.',
              src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBeZnQjk5dmCV6LBYv53L8jvQWwt4Xezf-_Mk8JcN-RA76GTkoPHQ-8kjIR7MdCbL4W6Evr_olr9QLwIpvfOIvuESQlupm4YeTeSWqiTMYCDX6xdIQJ3OpENbYBT3hCe4wBwjZ5VqLRcvqCFjTW5G1AgysZzcu0w5MJ2m2vcOspvq5p6gmv4Rq2B5lOIq4m5D4GefXdzedJR8N-I7t872DxFrqSJSScW3za_5bSEQYx9xvGD4gq72PG3lNeCZY7qO5ew7wJjhFQmDU',
            },
            {
              parts: '4 Parts',
              title: 'The Ascent',
              desc: 'Practical disciplines for climbing higher in your spiritual walk.',
              src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPB2boEHTZHALbkUi132cZ_zm3urkackqoBopMeoow-W-uuO2M2su0dLawb8PmRgc-N_cyTKPxy1jXiupALl380YNX35v8t0xRBvRXGdFg_B5oLBPpySCtb0UMcKfHPy9cBO97cRhSZiqw71kV-Lx1WpwWeJmdCoAYIRcS0GHQqaXtzA8F5DghHhAVgQ7IsbdiAUVoFv6RZVV8ygp1BSHYlQeZbkrCKSQLuDWL0r-KL5CBRPiY8O5VAXS0uPK6upAWFiYKh4uuE7k',
            },
            {
              parts: '8 Parts',
              title: 'Heart of Worship',
              desc: 'Rediscovering the true meaning of praise in daily life.',
              src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdoNuseXps0XvvwyZ7VNILKs_lHx1Z4-HxuWS3kjjubprNeZD3RtDseEWUA7YtakUPQYVDZMmI1YgjenxYRFDXamcJtgLerAlwME0wFg0pzdN8rH1_Zj1iDcV_qqmNuR8p8vHtRndvL0lqnTwS7MiIWO_F2zX0omY8h-oPANVxXw6Dak_uMZML4JlcupYJv9b-ZM8cOpobVECMpupKAqOCubx6jLsMgWj9cVBeNrtfDFT4XhP4p_htQVxJ_gbH76xkE_AyjORF_ek',
            },
            {
              parts: '5 Parts',
              title: 'Sabbath Rest',
              desc: 'Biblical rhythms of restoration in a 24/7 world.',
              src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAx2bwB4LjzVgPP5qZ1pvsEMMqE4nwL81xfwyoZkTdNU1l8SnoTj4SmxONNeUQn_NhVJWunUrlpm4c0cHfx997NR5rSnmOv1Ep2nqwa9PI9fahOV6dLkfNkW1nzQN18BbwgkDa-oT8vuUs_BCoEnnx5NG8iIos08YWmjpt-3ShzJE4R2OzLahOyBck8NSPsRgWsiu1P05FUA4dLc4GaeYLOpDL9zsJTkoIHP3z5ewe1bwK_4HZuJzjcvjeOo6eEdmdF1nhV2AHNK2g',
            },
          ].map((s) => (
            <div className="sp-series-card" key={s.title}>
              <img alt="Series" className="sp-series-img" src={s.src} />
              <div className="sp-series-card-content">
                <span className="sp-series-parts">{s.parts}</span>
                <h4 className="sp-series-card-title">{s.title}</h4>
                <p className="sp-series-card-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Spiritual Growth Reflections */}
      <section className="sp-reflection-section">
        <div className="sp-reflection-card">
          <div className="sp-reflection-inner">
            <h2 className="sp-reflection-title">Spiritual Growth Reflections</h2>
            <p className="sp-reflection-body">
              "Your word is a lamp to my feet and a light to my path." Every sermon is designed to
              be more than a speech; it's an invitation to go deeper. Below you will find guided
              reflection journals for our current series.
            </p>
            <div className="sp-reflection-actions">
              <button type="button" className="sp-btn-primary">
                Download Study Guide
              </button>
              <button type="button" className="sp-btn-outline">
                Submit a Prayer Request
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SermonsPage;
  /**
 * Member Community — Sanctuary
 * Converted from reference HTML exactly.
 */

import React from 'react';
import {
  Bookmark,
  Heart,
  Image,
  MessageCircle,
  Plus,
  Search,
  Share2,
} from 'lucide-react';
import './MemberCommunity.css';

const MemberCommunity: React.FC = () => {
  return (
    <div className="mc-page">
      {/* ── Hero Section ── */}
      <section className="mc-hero">
        <div
          className="mc-hero-bg"
          aria-hidden="true"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800')",
          }}
        />
        <div className="mc-hero-content">
          <h1 className="mc-hero-title">Better Together</h1>
          <p className="mc-hero-sub">
            Connect with your brothers and sisters, share your journey, and find your place in the
            family.
          </p>
          <div className="mc-hero-actions">
            <button type="button" className="mc-btn-join">
              Join a Group
            </button>
            <button type="button" className="mc-btn-directory">
              <div className="mc-btn-directory-inner">
                <Search className="mc-icon-sm" />
                Directory
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* ── My Groups ── */}
      <section className="mc-groups-section">
        <div className="mc-groups-header">
          <h2 className="mc-groups-title">My Groups</h2>
          <button type="button" className="mc-view-all">View All</button>
        </div>

        <div className="mc-groups-scroll">
          {/* Group: Young Adults (active/selected border) */}
          <div className="mc-group-item">
            <div className="mc-group-ring mc-group-ring-active">
              <img
                alt="Young Adults Group"
                className="mc-group-img"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBSVIN6EoqkIpUCb4UBjz96-GniT7Ic-agKad1BAEQ36ar1Ehci1fXyJUCwNe1erq2doVpesR-C7-5sDjQ2FTTlrNFdjePRjUScUfXz5_sfVws5XOLmmfe1JQjzvLJOVgnHqGPKm8cKrY3nLpl8xfiWDJMFQlL-IdVkWeXtXVdw9g8iC8KosGrrsXbdMEqSHXKFIG8Av6JHEpk1PkUvEuA3X1zp9AAv7HxKXl69PRm1ADKMtYgBNxMBKa0jDpCat1McaVlsV6sWcro"
              />
            </div>
            <span className="mc-group-label mc-group-label-active">Young Adults</span>
          </div>

          {/* Group: Bible Study */}
          <div className="mc-group-item">
            <div className="mc-group-ring">
              <img
                alt="Bible Study"
                className="mc-group-img"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8RS5ujQKrIb-yLngS7TMWCapGVPwGV_qemDXzQUB8L1TXW2XxAXUMyCJbKr4b9U77FCdYy50SnZNtbw2mmXdo5BDHCqVNviV3gHMN1LW0Z6U8EdsSQDz0_tjiC9mKApYcYMzjyy23xMCqpnEivEsbjhtN6wq0eBMrahMEDedA_HiXONmHZ3ybaPpm8ShZvaFohusQiTogHyoWliN-_qwErJcEM-qMZTpaplY4naxwN9DiXFiyiuwTheBo3AP_OiQz5y3jneOnkpM"
              />
            </div>
            <span className="mc-group-label">Bible Study</span>
          </div>

          {/* Group: Worship Team */}
          <div className="mc-group-item">
            <div className="mc-group-ring">
              <img
                alt="Worship Team"
                className="mc-group-img"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_fHMBQdoW1KakGsTH6TjYnJ7omkYpRnJdhSiRjqOkrP5KauJfTkasli5HkaVqCNoftSPenTkxFZ-HCusOFH2W43rQFqO8vFiahD2B2aeMNtbGVjbEYz8FKSAXCXhIi-4El-ybYCftqS3LHTlqmxvszsRqoClSkPfYgguObYfKGaPQo0kNmB0D3RQP-pdTzlBrWscWrv49g679lCZiCpB1BqeTj1vUigtCNtuj40cP4woIlb4UnWYKlNW3ZbpMdX9Do5Qp49P0bz8"
              />
            </div>
            <span className="mc-group-label">Worship Team</span>
          </div>

          {/* Group: Women's Prayer */}
          <div className="mc-group-item">
            <div className="mc-group-ring">
              <img
                alt="Womens Prayer"
                className="mc-group-img"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0EVmJVuPfbq7tvXB-Moh5qVMyUAlMCjYW-HPfCiiSJN1QWtUAaIxIAGr-kUFLbRh2rhZuVgjABQsyJvSOEAM2Rmx2JiLvQ_EhQaQLunNqpFAvWAAk1xmbqtJXnKLxsf6obyW5pXKGi37PSaTRjsF9JvJJqOgTq-EMUmCDDvkkzKWLgEEiIRGYsV8kfExj7IgF6nWoOdM_stEGjn8hJjUdTpAAOclzyyFhMyO2y32IZ6e7GMVaphxnog4wtjyLZIXpdnVqD1JE7aw"
              />
            </div>
            <span className="mc-group-label">Women's Prayer</span>
          </div>

          {/* Discover */}
          <div className="mc-group-item">
            <div className="mc-group-ring mc-group-discover">
              <Plus className="mc-discover-icon" />
            </div>
            <span className="mc-group-label mc-group-label-muted">Discover</span>
          </div>
        </div>
      </section>

      {/* ── Main Grid ── */}
      <div className="mc-grid">
        {/* ── Feed ── */}
        <div className="mc-feed">
          {/* Compose bar */}
          <div className="mc-compose">
            <img
              alt="Member Avatar"
              className="mc-compose-avatar"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZlx2R0jupa3aOTAc9pwzd7a4iSB9sZC7BeeLBHfTW0uz0uc8IyrEQvSYVtNvxVSrPFWfFgryKSmi_vLB5zKrEF1jO2bnCCdelLrTfQvEzxKuBgS10OTAWLe5ZlUR6Qzbdzy-NlBuGTcWLVTWUe7gTRG4OdgZu2Ckar4cyO7hFS205yJH2IqnqyUBobfo32TWWw9ASf5npKUc2EswO7V1CBRHNO8ZTh97RhSByaCOWx7Ohs5GzuBaz1gQqBf4hHsHJer0DRTqooOc"
            />
            <div className="mc-compose-input">
              Share a reflection or prayer request...
            </div>
            <button type="button" className="mc-compose-img-btn">
              <Image />
            </button>
          </div>

          {/* Feed Post 1 */}
          <article className="mc-post mc-post-with-img">
            <div className="mc-post-body">
              <div className="mc-post-author-row">
                <img
                  alt="Sarah J."
                  className="mc-post-avatar"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmJCOI-Mchb9d-PKy1daR1Wul17qH9s6sSMX1QhdxW7DWr3Y0TGOOAW2wwUX73ToltCzKWNzYKMQcyEsTbLuJi7RDCywKjhXK29U6Jh5MwltPqQHmRn0vCSyRGLiVqCr--SWTF_2zaoM8iE3cS7a6Dez6gEHNQ8YM6k3dQS9V3XrfnXpLirQ0imQ5l3nQki6Hfgfd-39kZkbYBqvoVI31Ufs9KntZMrq9HBKt2wTmcc8DeXZ8trIC9DYeT68eYs7zlVryUgpJ2i0I"
                />
                <div>
                  <h4 className="mc-post-name">Sarah Jenkins</h4>
                  <span className="mc-post-meta">Worship Team • 2h ago</span>
                </div>
              </div>

              <p className="mc-post-text">
                So encouraged by our rehearsal tonight! There's something powerful about the unity
                we feel when we lift our voices together. Can't wait for Sunday morning. ✨
              </p>

              <img
                alt="Worship Team Rehearsal"
                className="mc-post-media"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCYWp_l2-QJ7p21YajnM3CJ5TVYwPvKlOL-M_3gT9g4PrM6DGAv2_BkmMtRismh4eIkArN776f0QfHcUwCvyxVUrQ--vZaklLdHnnmZtSwf0ILcVMY05jZGX3B9dBiEpOpyhPvfnjeyOuVsOdJIIs7CwQZyybn7OwS0kGtT7nXPBxVzrD-a38rkUh8AnmQEbAW2Mvi1MKlElbxc6lPvqMPTVkJ1zilkA2QWsviR6CTatNSQtIGKR9kPHfwCE6UF4CDy5f8vfG-nvk"
              />

              <div className="mc-post-actions">
                <div className="mc-post-reactions">
                  <button type="button" className="mc-reaction-btn mc-reaction-like">
                    <Heart className="mc-reaction-icon" />
                    <span className="mc-reaction-count">24</span>
                  </button>
                  <button type="button" className="mc-reaction-btn mc-reaction-comment">
                    <MessageCircle className="mc-reaction-icon" />
                    <span className="mc-reaction-count">5</span>
                  </button>
                </div>
                <button type="button" className="mc-share-btn">
                  <Share2 className="mc-reaction-icon" />
                </button>
              </div>
            </div>
          </article>

          {/* Feed Post 2 */}
          <article className="mc-post">
            <div className="mc-post-author-row">
              <img
                alt="David L."
                className="mc-post-avatar"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJgMrIK-vhvRNsUKFa0ZlhvCaGmICty8CGud8cLbwZjq3f3l9C1cmVtP1pnY9uZSPuSpfcj4V5dkYrpcOQu9jwcpeniLS4ifxzGelKswDibAnv0ukhMkGcHNZ2npniCqjHFNr0_P2q8sXKoUmCmyOraBz9qw0Y-JG-vKQsdfPA8qZcbjbpzk-_iFD7dUsPScdX-N2GQudMdgoVHGcGOKzRooP6FTk1CJhy3bZNsRbATF9sSYHa45kkqeGOVKrh4BeBz2bU9jp3K74"
              />
              <div>
                <h4 className="mc-post-name">David Lawson</h4>
                <span className="mc-post-meta">Community Service • 6h ago</span>
              </div>
            </div>

            <p className="mc-post-text">
              The soup kitchen outreach this morning was such a blessing. Thank you to everyone who
              showed up to serve. We were able to provide over 150 meals today!
            </p>

            <div className="mc-post-actions">
              <div className="mc-post-reactions">
                <button type="button" className="mc-reaction-btn mc-reaction-like">
                  <Heart className="mc-reaction-icon" fill="currentColor" />
                  <span className="mc-reaction-count">42</span>
                </button>
                <button type="button" className="mc-reaction-btn mc-reaction-comment">
                  <MessageCircle className="mc-reaction-icon" />
                  <span className="mc-reaction-count">12</span>
                </button>
              </div>
              <button type="button" className="mc-share-btn">
                <Bookmark className="mc-reaction-icon" />
              </button>
            </div>
          </article>
        </div>

        {/* ── Sidebar ── */}
        <aside className="mc-sidebar">
          {/* Outreach Impact */}
          <div className="mc-outreach-card">
            <h3 className="mc-outreach-title">Outreach Impact</h3>
            <div className="mc-outreach-stats">
              <div className="mc-stat-item">
                <div className="mc-stat-value mc-stat-tertiary">450+</div>
                <div className="mc-stat-label">Families Helped</div>
              </div>
              <div className="mc-stat-item">
                <div className="mc-stat-value mc-stat-primary">1,200</div>
                <div className="mc-stat-label">Volunteer Hours</div>
              </div>
            </div>
            <div className="mc-outreach-footer">
              <p className="mc-outreach-quote">
                "For I was hungry and you gave me something to eat, I was thirsty and you gave me
                something to drink..."
              </p>
              <button type="button" className="mc-missions-btn">
                Upcoming Missions
              </button>
            </div>
          </div>

          {/* Trending Topics */}
          <div className="mc-trending-card">
            <h3 className="mc-trending-title">Trending Topics</h3>
            <div className="mc-trending-list">
              <div className="mc-trending-item">
                <span className="mc-tag">#SpringFestival</span>
                <span className="mc-tag-count">12 posts</span>
              </div>
              <div className="mc-trending-item">
                <span className="mc-tag">#PrayerRequest</span>
                <span className="mc-tag-count">28 posts</span>
              </div>
              <div className="mc-trending-item">
                <span className="mc-tag">#Gratitude</span>
                <span className="mc-tag-count">45 posts</span>
              </div>
            </div>
          </div>

          {/* Connect with Others */}
          <div className="mc-connect-section">
            <h3 className="mc-connect-title">Connect with Others</h3>
            <div className="mc-connect-list">
              <div className="mc-connect-item">
                <div className="mc-connect-user">
                  <img
                    alt="Michael R."
                    className="mc-connect-avatar"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVly95eYI7SWg108rpI1-KJa5SbHZF5coLQfG9d6BrLl-jYU69W5zXO3TOtBdg7XSpQ-ki_grvMxQuPQx7sjfrWfBitDM5h62DNDRnxsPOShJJsvn8-nbxH_iPOTUxa6T2CW3H34rJAzF8oTJP7VOnZqYaUE-j-_4m7pnC373Bzfyy2lE-AOa99Rbbf1tu9xeufRfdlcCLb4XoX46F7Y7Ys-mHuyO5C2GTpOSn8k65clmhvefEVEo0yfk4vZLoR4jvbg0esPemWaI"
                  />
                  <div className="mc-connect-name">Michael Reed</div>
                </div>
                <button type="button" className="mc-follow-btn">Follow</button>
              </div>
              <div className="mc-connect-item">
                <div className="mc-connect-user">
                  <img
                    alt="Elena S."
                    className="mc-connect-avatar"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC1YVaz1I-PyMHcCvNV4zzrGLXsASrHgFGnvg1t-revzthpVDnNeMJH-fze_hftiEAALo4YcD7zU02Swgc0fsVEEj2QltPqdcIhGzJ2bayQvF3HlH3OHEhkdHMxpxCrvqMkF9Q670aXr1-ePk2ldmtc35XNz4dYi091IARPxaNh8mKOPsr63e5hmmv08N1WXEZzIG78ax8HL-HlOzNm6ItlU5tCs1A3OHlCYRksxJzzsQ210KiKoIOPL9Gk1XuSLtRLiMgiIdPO29Q"
                  />
                  <div className="mc-connect-name">Elena Santos</div>
                </div>
                <button type="button" className="mc-follow-btn">Follow</button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default MemberCommunity;
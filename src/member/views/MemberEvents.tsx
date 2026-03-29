/**
 * Member Events — Sanctuary
 * Rebuilt to match the reference HTML exactly.
 */

import React from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Search,
  Users,
} from 'lucide-react';
import './MemberEvents.css';

const MemberEvents: React.FC = () => {
  return (
    <div className="mev-page">
      {/* Hero Search Section */}
      <section className="mev-hero">
        <p>
          Join us in fellowship, worship, and service.
        </p>
        <div className="mev-search-wrap">
          <div className="mev-search-icon" aria-hidden="true">
            <Search />
          </div>
          <input
            type="text"
            placeholder="Search events, workshops, or ministries..."
          />
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="mev-layout">
        {/* Sidebar: Calendar & Filters */}
        <aside className="mev-sidebar">
          {/* Calendar */}
          <div className="mev-calendar-card">
            <div className="mev-calendar-head">
              <h3>October 2023</h3>
              <div className="mev-calendar-nav">
                <button type="button" aria-label="Previous month">
                  <ChevronLeft />
                </button>
                <button type="button" aria-label="Next month">
                  <ChevronRight />
                </button>
              </div>
            </div>

            <div className="mev-weekdays" aria-hidden="true">
              <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
            </div>

            <div className="mev-days">
              <div className="muted">27</div><div className="muted">28</div><div className="muted">29</div><div className="muted">30</div><div>1</div><div>2</div><div>3</div>
              <div>4</div><div className="dot-amber">5</div><div>6</div><div>7</div><div className="dot-primary">8</div><div>9</div><div>10</div>
              <div className="selected">11</div><div>12</div><div className="dot-amber">13</div><div>14</div><div>15</div><div>16</div><div>17</div>
              <div className="dot-primary">18</div><div>19</div><div>20</div><div>21</div><div>22</div><div>23</div><div>24</div>
              <div>25</div><div>26</div><div>27</div><div>28</div><div>29</div><div>30</div><div>31</div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="mev-filters">
            <h4>Filter Categories</h4>
            <div className="mev-filter-chips">
              <button type="button" className="active">All Events</button>
              <button type="button">Worship</button>
              <button type="button">Youth</button>
              <button type="button">Outreach</button>
              <button type="button">Classes</button>
            </div>
          </div>
        </aside>

        {/* Main List: Upcoming Events */}
        <section className="mev-main">
          {/* Event Group 1 */}
          <div className="mev-group">
            <div className="mev-group-title-row">
              <span />
              <h2>Upcoming This Week</h2>
              <span />
            </div>

            <div className="mev-bento-grid">
              {/* Featured Event */}
              <article className="mev-featured-event">
                <div className="mev-featured-media" aria-hidden="true">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBEm0BPhHj0rtALWSEldTLz8XxkCEhjOys-J9oe8nTHJXr6-3KgC6VbNO8f4x2S7oWw96k5oZZ39vJYGBe--p7t0JTFQgKnih-YTjKdEuc_jK1Q9BMNe7_bNdny5cVgKVi3ocw8mQb0Zvmj0nJ5YnNNsfS8c6WSkXVu-DdnBNf7kKnro4sLgrfG_Wqkxy6toM8ynQmAk98d6xnoyEh0wVA04a0_cqKHou1zrWQof-T_j_DGh5AAa1AqBEFVFUtmHB6d4ztS6XtANYY"
                    alt="Vibrant community festival at night"
                  />
                  <div className="mev-featured-overlay" />
                </div>
                <div className="mev-featured-content">
                  <span className="mev-featured-pill">Featured Outreach</span>
                  <h3>Annual Harvest Fellowship</h3>
                  <p>
                    An evening of celebration, food trucks, and live music for the whole
                    neighborhood. Bring a friend!
                  </p>
                  <div className="mev-featured-meta">
                    <div>
                      <CalendarDays />
                      Oct 13, 6:00 PM
                    </div>
                    <div>
                      <MapPin />
                      Community Plaza
                    </div>
                    <button type="button">Register Now</button>
                  </div>
                </div>
              </article>

              {/* Standard Event Card 1 */}
              <article className="mev-event-card">
                <div className="mev-event-card-top">
                  <div className="mev-event-icon" aria-hidden="true">
                    <BookOpen />
                  </div>
                  <span>CLASS</span>
                </div>
                <h4>Morning Wisdom Study</h4>
                <p>Exploring the Psalms of Ascent. Led by Pastor Miller in the Fireside Room.</p>
                <div className="mev-event-card-foot">
                  <div>Tue, 8:30 AM</div>
                  <button type="button">Details</button>
                </div>
              </article>

              {/* Standard Event Card 2 */}
              <article className="mev-event-card">
                <div className="mev-event-card-top">
                  <div className="mev-event-icon mev-event-icon-primary" aria-hidden="true">
                    <Users />
                  </div>
                  <span>COMMUNITY</span>
                </div>
                <h4>Youth Group Connect</h4>
                <p>Pizza, games, and honest conversations for grades 9-12. No RSVP required.</p>
                <div className="mev-event-card-foot">
                  <div>Wed, 7:00 PM</div>
                  <button type="button">Details</button>
                </div>
              </article>
            </div>
          </div>

          {/* Event Group 2 */}
          <div className="mev-group">
            <div className="mev-group-title-row">
              <span />
              <h2>Later This Month</h2>
              <span />
            </div>

            <div className="mev-list-stack">
              <article className="mev-list-item">
                <div className="mev-list-date-box">
                  <div>Oct</div>
                  <div>18</div>
                </div>
                <div className="mev-list-body">
                  <h5>Mid-Week Praise &amp; Prayer</h5>
                  <div>
                    <span>
                      <Clock3 />
                      6:30 PM
                    </span>
                    <span>
                      <MapPin />
                      Sanctuary
                    </span>
                  </div>
                </div>
                <button type="button">Remind Me</button>
              </article>

              <article className="mev-list-item">
                <div className="mev-list-date-box">
                  <div>Oct</div>
                  <div>22</div>
                </div>
                <div className="mev-list-body">
                  <h5>Men&apos;s Breakfast</h5>
                  <div>
                    <span>
                      <Clock3 />
                      8:00 AM
                    </span>
                    <span>
                      <MapPin />
                      Main Hall
                    </span>
                  </div>
                </div>
                <button type="button">Remind Me</button>
              </article>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MemberEvents;
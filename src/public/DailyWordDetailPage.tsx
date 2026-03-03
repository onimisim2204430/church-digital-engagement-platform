/**
 * Daily Word Detail Page - Public View
 * Display full devotional content for a specific day
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SharedNavigation from './shared/SharedNavigation';
import Icon from '../components/common/Icon';
import { dailyWordService } from '../services/dailyWord.service';
import { weeklyFlowService } from '../services/weeklyFlow.service';
import { DailyWord } from '../types/dailyWord.types';
import './DailyWordDetailPage.css';

const DailyWordDetailPage: React.FC = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  
  const [dailyWord, setDailyWord] = useState<DailyWord | null>(null);
  const [weeklyEvent, setWeeklyEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        if (!date) {
          setError('No date provided');
          return;
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
          setError('Invalid date format');
          return;
        }

        // Fetch daily word
        const word = await dailyWordService.getByDate(date);
        if (!word) {
          setError('No daily word found for this date');
          setDailyWord(null);
        } else {
          setDailyWord(word);
          
          // Load weekly events to find related event
          const events = await weeklyFlowService.getAllWithCache();
          const dateObj = new Date(date);
          const dayOfWeek = dateObj.getDay();
          const relatedEvent = events.find((e: any) => e.day_of_week === dayOfWeek);
          setWeeklyEvent(relatedEvent || null);
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || 'Failed to load daily word';
        setError(errorMessage);
        console.error('Error loading daily word:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [date]);

  const handlePreviousDay = () => {
    if (!date) return;
    const currentDate = new Date(date);
    const previousDate = new Date(currentDate);
    previousDate.setDate(currentDate.getDate() - 1);
    const dateStr = previousDate.toISOString().split('T')[0];
    navigate(`/daily-word/${dateStr}`);
  };

  const handleNextDay = () => {
    if (!date) return;
    const currentDate = new Date(date);
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + 1);
    const dateStr = nextDate.toISOString().split('T')[0];
    navigate(`/daily-word/${dateStr}`);
  };

  const handleTodaysWord = () => {
    const today = new Date().toISOString().split('T')[0];
    navigate(`/daily-word/${today}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      <SharedNavigation />
      
      <main className="daily-word-detail">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="container">
            <div className="breadcrumb">
              <button onClick={() => navigate('/')} className="breadcrumb-link">
                Home
              </button>
              <Icon name="chevron_right" size={16} />
              <span className="breadcrumb-current">Daily Word</span>
            </div>

            {date && (
              <h1 className="hero-title">
                {formatDate(date)}
              </h1>
            )}
          </div>
        </section>

        {/* Main Content */}
        {loading ? (
          <section className="content-section">
            <div className="container">
              <div className="skeleton-content">
                <div className="skeleton-title"></div>
                <div className="skeleton-scripture"></div>
                <div className="skeleton-body"></div>
                <div className="skeleton-body"></div>
              </div>
            </div>
          </section>
        ) : error || !dailyWord ? (
          <section className="content-section">
            <div className="container">
              <div className="error-state">
                <Icon name="error" size={48} className="error-icon" />
                <h2>{error || 'Daily Word Not Found'}</h2>
                <p>
                  {error === 'No daily word found for this date'
                    ? 'There is no daily word scheduled for this date. Please check back later.'
                    : 'Unable to load the daily word. Please try again.'}
                </p>
                <button onClick={handleTodaysWord} className="btn btn-primary">
                  Go to Today's Word
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="content-section">
            <div className="container">
              <article className="word-article">
                {/* Content Card */}
                <div className="word-card">
                  {/* Title */}
                  <header className="word-header">
                    <h2 className="word-title">{dailyWord.title}</h2>
                    {dailyWord.scripture && (
                      <p className="word-scripture">{dailyWord.scripture}</p>
                    )}
                  </header>

                  {/* Meta Info */}
                  <div className="word-meta">
                    <div className="meta-item">
                      <span className="meta-label">Author</span>
                      <span className="meta-value">{dailyWord.author}</span>
                    </div>
                    {weeklyEvent && (
                      <div className="meta-item">
                        <span className="meta-label">Flow Event</span>
                        <span className="meta-value">{weeklyEvent.title}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="word-content">
                    <div 
                      className="content-text"
                      dangerouslySetInnerHTML={{ __html: dailyWord.content }}
                    />
                  </div>

                  {/* Prayer */}
                  {dailyWord.prayer && (
                    <div className="word-prayer">
                      <h3 className="prayer-title">Prayer</h3>
                      <div 
                        className="prayer-text"
                        dangerouslySetInnerHTML={{ __html: dailyWord.prayer }}
                      />
                    </div>
                  )}

                  {/* Engagement Stats */}
                  <div className="word-stats">
                    <div className="stat-item">
                      <Icon name="favorite" size={16} />
                      <span>{dailyWord.likes || 0}</span>
                    </div>
                    <div className="stat-item">
                      <Icon name="comment" size={16} />
                      <span>{dailyWord.reply_count || 0}</span>
                    </div>
                    <div className="stat-item">
                      <Icon name="share" size={16} />
                      <span>Share</span>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="word-navigation">
                  <button
                    onClick={handlePreviousDay}
                    className="btn btn-nav"
                    title="Previous day"
                  >
                    <Icon name="chevron_left" size={20} />
                    <span>Previous Day</span>
                  </button>

                  <button
                    onClick={handleTodaysWord}
                    className="btn btn-nav btn-today"
                  >
                    Today
                  </button>

                  <button
                    onClick={handleNextDay}
                    className="btn btn-nav"
                    title="Next day"
                  >
                    <span>Next Day</span>
                    <Icon name="chevron_right" size={20} />
                  </button>
                </div>
              </article>

              {/* Related Weekly Event */}
              {weeklyEvent && (
                <aside className="related-event">
                  <div className="event-card">
                    <h3 className="event-title">{weeklyEvent.title}</h3>
                    <p className="event-time">{weeklyEvent.time}</p>
                    {weeklyEvent.description && (
                      <p className="event-description">{weeklyEvent.description}</p>
                    )}
                    <button className="btn btn-primary btn-sm">
                      Learn More
                    </button>
                  </div>
                </aside>
              )}
            </div>
          </section>
        )}
      </main>
    </>
  );
};

export default DailyWordDetailPage;

/**
 * Daily Word Detail Page - Public View
 * Professional devotional reading experience
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PublicLayout } from './layouts';
import Icon from '../components/common/Icon';
import { dailyWordService } from '../services/dailyWord.service';
import { DailyWord } from '../types/dailyWord.types';

const DailyWordDetailPage: React.FC = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();

  const [dailyWord, setDailyWord] = useState<DailyWord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!date) { setError('No date provided'); return; }
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) { setError('Invalid date format'); return; }
        const word = await dailyWordService.getByDate(date);
        setDailyWord(word);
      } catch (err: any) {
        setError(err.response?.status === 404
          ? 'No daily word for this date yet.'
          : 'Failed to load. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, [date]);

  const goToDate = (offset: number) => {
    if (!date) return;
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    navigate(`/daily-word/${d.toISOString().split('T')[0]}`);
  };

  const goToToday = () => {
    navigate(`/daily-word/${new Date().toISOString().split('T')[0]}`);
  };

  const isToday = date === new Date().toISOString().split('T')[0];

  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : '';

  const dayLabel = date
    ? new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
    : '';

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: dailyWord?.title || 'Daily Word', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  /* â”€â”€â”€ Loading â”€â”€â”€ */
  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
            <p className="text-graphite text-sm tracking-widest uppercase">Loading devotionalâ€¦</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  /* â”€â”€â”€ Error / Empty â”€â”€â”€ */
  if (error || !dailyWord) {
    return (
      <PublicLayout>
        <div className="min-h-[70vh] flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            {/* Decorative cross */}
            <div className="w-16 h-16 mx-auto mb-8 flex items-center justify-center rounded-full bg-primary/10">
              <Icon name="auto_stories" size={32} className="text-primary" />
            </div>
            <h2 className="text-2xl font-display font-normal text-ink mb-3">
              {error || 'Word Not Found'}
            </h2>
            <p className="text-graphite text-sm leading-relaxed mb-8">
              There is no daily word scheduled for this date. Check back later or read today's devotional.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={goToToday}
                className="px-6 py-3 bg-primary text-white text-sm font-semibold rounded-btn hover:bg-primary/90 transition-colors"
              >
                Today's Word
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 border border-rule text-graphite text-sm font-semibold rounded-btn hover:border-ink hover:text-ink transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  /* â”€â”€â”€ Main Page â”€â”€â”€ */
  return (
    <PublicLayout>
      {/* â”€â”€ Hero â”€â”€ */}
      <div className="relative overflow-hidden bg-[#0f1923]" style={{ minHeight: 320 }}>
        {/* Background texture */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 30% 50%, #3B6E96 0%, transparent 60%), radial-gradient(circle at 80% 20%, #5D7A68 0%, transparent 50%)',
          }}
        />
        {/* Cross watermark */}
        <div className="absolute right-0 top-0 h-full w-1/3 flex items-center justify-center opacity-5 select-none pointer-events-none">
          <span className="text-white font-display" style={{ fontSize: 320, lineHeight: 1 }}>âœ¦</span>
        </div>

        <div className="relative z-10 max-w-[900px] mx-auto px-6 lg:px-10 py-16 md:py-24">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => navigate('/')} className="text-white/50 text-xs uppercase tracking-widest font-medium hover:text-white/80 transition-colors">
              Home
            </button>
            <Icon name="chevron_right" size={14} className="text-white/30" />
            <span className="text-white/50 text-xs uppercase tracking-widest font-medium">Daily Word</span>
          </div>

          {/* Label */}
          <p className="text-primary text-[11px] font-bold uppercase tracking-[3px] mb-4">
            {isToday ? 'Today Â· ' : ''}{dayLabel}
          </p>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-display font-normal text-white leading-tight mb-6 max-w-2xl">
            {dailyWord.title}
          </h1>

          {/* Scripture excerpt in hero */}
          {dailyWord.scripture && (
            <p className="text-white/60 text-sm italic font-serif max-w-lg">
              "{dailyWord.scripture}"
            </p>
          )}

          {/* Date */}
          <p className="mt-6 text-white/40 text-xs uppercase tracking-widest">{formattedDate}</p>
        </div>
      </div>

      {/* â”€â”€ Body â”€â”€ */}
      <div className="max-w-[900px] mx-auto px-6 lg:px-10 py-12 md:py-16 flex flex-col md:flex-row gap-8 lg:gap-12">

        {/* â”€â”€ Desktop Sidebar â”€â”€ */}
        <aside className="hidden md:flex flex-col items-center w-10 flex-shrink-0">
          <div className="sticky top-28 flex flex-col gap-5 text-graphite">
            <button
              onClick={handleShare}
              className="hover:text-primary transition-colors"
              title="Share"
            >
              <Icon name="share" size={22} />
            </button>
            <button
              onClick={() => setBookmarked(b => !b)}
              className={`transition-colors ${bookmarked ? 'text-primary' : 'hover:text-primary'}`}
              title="Bookmark"
            >
              <Icon name={bookmarked ? 'bookmark' : 'bookmark_border'} size={22} />
            </button>

            <div className="w-px h-6 bg-rule mx-auto" />

            {/* Day navigation compact */}
            <button
              onClick={() => goToDate(-1)}
              className="hover:text-primary transition-colors"
              title="Previous day"
            >
              <Icon name="arrow_upward" size={20} />
            </button>
            <button
              onClick={() => goToDate(1)}
              className="hover:text-primary transition-colors"
              title="Next day"
            >
              <Icon name="arrow_downward" size={20} />
            </button>
          </div>
        </aside>

        {/* â”€â”€ Article â”€â”€ */}
        <article className="flex-1 max-w-[720px] min-w-0">

          {/* Scripture Pullquote */}
          {dailyWord.scripture && (
            <blockquote className="border-l-4 border-primary pl-6 mb-10 py-2">
              <p className="text-lg md:text-xl font-serif text-ink leading-relaxed italic">
                {dailyWord.scripture}
              </p>
            </blockquote>
          )}

          {/* Content */}
          <div
            className="prose prose-lg max-w-none text-ink space-y-5 leading-relaxed"
            style={{ lineHeight: 1.85, fontSize: '1.0625rem' }}
            dangerouslySetInnerHTML={{ __html: dailyWord.content }}
          />

          {/* Prayer Section */}
          {dailyWord.prayer && (
            <div className="mt-12 rounded-[16px] bg-primary/5 border border-primary/15 px-8 py-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Icon name="volunteer_activism" size={16} className="text-primary" />
                </div>
                <h3 className="text-[11px] font-bold uppercase tracking-[3px] text-primary">
                  Prayer
                </h3>
              </div>
              <div
                className="text-ink/80 leading-relaxed italic font-serif text-base"
                style={{ lineHeight: 1.85 }}
                dangerouslySetInnerHTML={{ __html: dailyWord.prayer }}
              />
            </div>
          )}

          {/* Bottom meta */}
          <div className="mt-12 pt-8 border-t border-rule flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-graphite text-xs uppercase tracking-widest font-medium">
              {dailyWord.author && <span>{dailyWord.author}</span>}
              {dailyWord.author && <span className="text-rule">â€¢</span>}
              <span>{formattedDate}</span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-rule text-graphite">
                #Devotional
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-rule text-graphite">
                #DailyWord
              </span>
            </div>
          </div>

          {/* Day Navigation */}
          <div className="mt-10 flex items-center justify-between gap-4">
            <button
              onClick={() => goToDate(-1)}
              className="flex items-center gap-2 text-graphite hover:text-ink text-sm font-semibold transition-colors group"
            >
              <Icon name="arrow_back" size={18} className="group-hover:-translate-x-1 transition-transform" />
              Previous Day
            </button>

            {!isToday && (
              <button
                onClick={goToToday}
                className="px-5 py-2 border border-primary text-primary rounded-btn text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
              >
                Today
              </button>
            )}

            <button
              onClick={() => goToDate(1)}
              className="flex items-center gap-2 text-graphite hover:text-ink text-sm font-semibold transition-colors group"
            >
              Next Day
              <Icon name="arrow_forward" size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </article>
      </div>

      {/* â”€â”€ Mobile Bottom Bar â”€â”€ */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-rule px-6 py-4 flex justify-between items-center z-50">
        <button onClick={() => goToDate(-1)} className="text-graphite flex flex-col items-center gap-1">
          <Icon name="arrow_back" size={20} />
          <span className="text-[10px] uppercase tracking-wider">Prev</span>
        </button>
        <button onClick={handleShare} className="text-graphite flex flex-col items-center gap-1">
          <Icon name="share" size={20} />
          <span className="text-[10px] uppercase tracking-wider">Share</span>
        </button>
        <button onClick={() => setBookmarked(b => !b)} className={`flex flex-col items-center gap-1 ${bookmarked ? 'text-primary' : 'text-graphite'}`}>
          <Icon name={bookmarked ? 'bookmark' : 'bookmark_border'} size={20} />
          <span className="text-[10px] uppercase tracking-wider">Save</span>
        </button>
        <button onClick={() => goToDate(1)} className="text-graphite flex flex-col items-center gap-1">
          <Icon name="arrow_forward" size={20} />
          <span className="text-[10px] uppercase tracking-wider">Next</span>
        </button>
      </div>

      {/* Bottom spacer for mobile bar */}
      <div className="md:hidden h-20" />
    </PublicLayout>
  );
};

export default DailyWordDetailPage;

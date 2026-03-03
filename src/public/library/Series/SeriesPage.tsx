// SeriesPage.tsx
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import SharedNavigation from '../../shared/SharedNavigation';
import seriesService, { Series } from '../../../services/series.service';
import Icon from '../../../components/common/Icon';

// Lazy load footer for performance
const Footer = lazy(() =>
  import('../../sections').then(module => ({ default: module.Footer }))
);

// ─── Constants ───────────────────────────────────────────────────────────────

const FILTERS = ['All', 'Featured'] as const;
type Filter = typeof FILTERS[number];

const AVATAR_COLOURS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-teal-500',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns two-letter initials from a full name, e.g. "John Doe" → "JD" */
const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** Picks a deterministic background colour based on first character */
const avatarColour = (name: string): string =>
  AVATAR_COLOURS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLOURS.length];

// ─── Component ───────────────────────────────────────────────────────────────

const SeriesPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch series whenever the filter changes
  const fetchSeries = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await seriesService.getPublicSeries(
        activeFilter === 'Featured' ? { is_featured: true } : undefined
      );
      setSeriesList(data);
    } catch (err) {
      console.error('Failed to load series:', err);
      setSeriesList([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => { fetchSeries(); }, [fetchSeries]);

  return (
    <div className="text-text-main relative min-h-screen w-full overflow-x-hidden">
      <div className="relative flex min-h-screen w-full flex-col">

        {/* Navigation */}
        <SharedNavigation currentPage="series" />
        <div className="h-20" />

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 py-12 md:py-20 flex flex-col gap-12">

          {/* ── Page header ── */}
          <div className="flex flex-col items-center justify-center text-center gap-4 max-w-2xl mx-auto">
            <span className="uppercase tracking-[0.2em] text-sm font-bold text-text-muted">
              Sermon Series
            </span>
            <h1 className="text-5xl md:text-6xl font-serif font-normal text-text-main leading-[1.1] tracking-tight">
              Our Series
            </h1>
            <p className="text-xl md:text-2xl text-text-muted font-display leading-relaxed max-w-lg">
              Explore our curated sermon series — each one a deep-dive journey through Scripture
              designed to shape and renew your heart.
            </p>
          </div>

          {/* ── Filter bar ── */}
          <div className="sticky top-20 z-30 -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12 py-4 bg-background-light/95 backdrop-blur-sm border-b border-transparent transition-all duration-300">
            <div className="flex items-center justify-between gap-4">

              {/* Filter pills */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {FILTERS.map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`whitespace-nowrap px-6 py-2 rounded-full text-base font-medium transition-all ${
                      activeFilter === filter
                        ? 'bg-primary text-white shadow-sm ring-1 ring-primary/10'
                        : 'bg-transparent border border-accent text-text-muted hover:border-primary hover:text-primary'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* View-mode toggle (desktop only) */}
              <div className="hidden lg:flex items-center gap-1 bg-surface rounded-full p-1 shadow-sm border border-accent/30 ml-4 shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-full transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-background-light text-text-main shadow-sm'
                      : 'text-text-muted hover:bg-background-light/50 hover:text-text-main'
                  }`}
                >
                  <Icon name="grid_view" className="text-[20px]" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-full transition-colors ${
                    viewMode === 'list'
                      ? 'bg-background-light text-text-main shadow-sm'
                      : 'text-text-muted hover:bg-background-light/50 hover:text-text-main'
                  }`}
                >
                  <Icon name="view_list" className="text-[20px]" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Loading skeletons ── */}
          {isLoading && (
            <div className={`grid ${
              viewMode === 'grid'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1'
            } gap-6 md:gap-8`}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse flex flex-col gap-3">
                  <div className="aspect-video rounded-2xl bg-accent/20" />
                  <div className="h-3 w-1/3 rounded bg-accent/20" />
                  <div className="h-6 w-3/4 rounded bg-accent/20" />
                  <div className="h-3 w-full rounded bg-accent/20" />
                  <div className="h-3 w-4/5 rounded bg-accent/20" />
                  <div className="flex items-center gap-3 mt-1">
                    <div className="w-8 h-8 rounded-full bg-accent/20" />
                    <div className="h-3 w-1/3 rounded bg-accent/20" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Series grid ── */}
          {!isLoading && seriesList.length > 0 && (
            <div className={`grid ${
              viewMode === 'grid'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1'
            } gap-6 md:gap-8`}>
              {seriesList.map(series => {
                const authorName = series.author_name || series.author?.full_name || 'Unknown';
                const initials   = getInitials(authorName);
                const bg         = avatarColour(authorName);
                const partCount  = series.published_post_count ?? series.post_count ?? 0;

                return (
                  <Link key={series.id} to={`/library/series/${series.slug}`} className="block">
                    <article className="group flex flex-col gap-3 cursor-pointer">

                      {/* Cover image */}
                      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-accent/20">
                        {series.cover_image ? (
                          <img
                            alt={series.title}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            src={series.cover_image}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-accent/10">
                            <Icon name="collections_bookmark" size={36} className="text-text-muted" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        {/* Parts count badge */}
                        {partCount > 0 && (
                          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-white text-xs font-bold uppercase tracking-wider">
                            {partCount} {partCount === 1 ? 'Part' : 'Parts'}
                          </div>
                        )}
                        {/* Featured badge */}
                        {series.is_featured && (
                          <div className="absolute top-3 left-3 bg-primary/90 backdrop-blur-md px-2 py-1 rounded text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <Icon name="star" size={14} />
                            Featured
                          </div>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex flex-col gap-1">
                        <h3 className="font-serif text-2xl font-normal text-text-main group-hover:text-primary transition-colors leading-tight tracking-tight">
                          {series.title}
                        </h3>

                        {series.description && (
                          <p className="text-sm text-text-muted font-display leading-relaxed line-clamp-2">
                            {series.description}
                          </p>
                        )}

                        {/* Author — initials avatar */}
                        <div className="mt-2 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${bg}`}>
                            {initials}
                          </div>
                          <span className="text-base text-text-muted font-display">{authorName}</span>
                        </div>
                      </div>

                    </article>
                  </Link>
                );
              })}
            </div>
          )}

          {/* ── Empty state ── */}
          {!isLoading && seriesList.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-primary mb-2">
                <Icon name="collections_bookmark" className="text-[32px]" />
              </div>
              <h3 className="font-serif text-3xl font-normal text-text-main tracking-tight">No series found</h3>
              <p className="text-lg text-text-muted max-w-sm font-display">
                {activeFilter === 'Featured'
                  ? 'There are no featured series at the moment.'
                  : 'No sermon series have been published yet. Check back soon.'}
              </p>
              {activeFilter !== 'All' && (
                <button
                  onClick={() => setActiveFilter('All')}
                  className="mt-4 text-base text-primary font-medium hover:underline underline-offset-4"
                >
                  View all series
                </button>
              )}
            </div>
          )}

        </main>

        {/* Footer */}
        <Suspense fallback={<div className="py-12" />}>
          <Footer />
        </Suspense>

      </div>
    </div>
  );
};

export default SeriesPage;

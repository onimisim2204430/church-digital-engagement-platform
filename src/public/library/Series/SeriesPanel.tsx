// SeriesPanel.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PublicLayout } from '../../layouts';
import seriesService, { SeriesDetail, SeriesPost } from '../../../services/series.service';
import Icon from '../../../components/common/Icon';

interface Discussion {
  id: number;
  user: string;
  avatar?: string;
  comment: string;
  time: string;
  amens: number;
  isAuthor?: boolean;
}

const FALLBACK_THUMBNAIL = 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&q=80';
const FALLBACK_COVER = 'https://images.unsplash.com/photo-1438232992991-995b671e5f2d?w=1600&q=80';

const discussions: Discussion[] = [
  {
    id: 1,
    user: 'Michael T.',
    comment: '"Episode 02 really challenged my perception of boundaries. I never thought of \'no\' as a spiritual protection before..."',
    time: '2 hours ago',
    amens: 12
  },
  {
    id: 2,
    user: 'Sarah Jenkins',
    comment: '"I\'m so encouraged by the depth of reflection here. Tomorrow\'s episode on the Garden of the Heart will build on this..."',
    time: 'Yesterday',
    amens: 45,
    isAuthor: true
  }
];

const SeriesPanel: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    seriesService.getPublicSeriesBySlug(slug)
      .then((data) => setSeries(data))
      .catch(() => setError('Series not found.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const episodes: SeriesPost[] = series?.posts ?? [];
  const displayedEpisodes = showAllEpisodes ? episodes : episodes.slice(0, 3);

  if (loading) {
    return (
      <PublicLayout currentPage="series" fullWidth={true}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-slate-500 text-sm">Loading series…</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !series) {
    return (
      <PublicLayout currentPage="series" fullWidth={true}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-slate-500 text-lg">{error ?? 'Series not found.'}</p>
        </div>
      </PublicLayout>
    );
  }

  const coverImage = series.cover_image || FALLBACK_COVER;
  const authorName = series.author_name || (series.author ? `${(series.author as any).first_name ?? ''} ${(series.author as any).last_name ?? ''}`.trim() : 'Unknown');
  const authorAvatar = (series.author as any)?.profile_picture || null;
  const rawDateRange = (series as any).date_range;
  const dateRange = (() => {
    if (!rawDateRange) return '—';
    if (typeof rawDateRange === 'string') return rawDateRange;
    if (rawDateRange.start && rawDateRange.end) {
      const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${fmt(rawDateRange.start)} – ${fmt(rawDateRange.end)}`;
    }
    return '—';
  })();
  const episodeCount = series.post_count ?? episodes.length;
  const hasVideo = episodes.some((ep) => !!(ep as any).video_url);

  return (
    <PublicLayout currentPage="series" fullWidth={true}>

      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] w-full flex items-center justify-center -mt-20 pb-16">
        {/* Background image + overlays */}
        <div
          className="absolute inset-0 bg-cover bg-center overflow-hidden"
          style={{ backgroundImage: `url('${coverImage}')` }}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 px-6 text-center max-w-4xl mx-auto mt-20">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-primary text-xs font-bold uppercase tracking-widest mb-8">
            {series.is_featured ? `Featured ${episodeCount}-Part Series` : `${episodeCount}-Part Series`}
          </span>
          <h1 className="text-5xl md:text-8xl font-medium text-white mb-6 leading-[1.1]">
            {series.title}
          </h1>
          <p className="text-xl md:text-2xl text-slate-200 mb-12 font-light italic">
            {series.description || '—'}
          </p>
          {hasVideo && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button className="group flex min-w-[200px] items-center justify-center gap-3 rounded-full bg-primary px-8 py-4 text-lg font-bold text-background-dark hover:scale-105 transition-transform">
                <Icon name="play_circle" size={24} />
                Watch Latest
              </button>
              <button className="flex min-w-[200px] items-center justify-center gap-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-8 py-4 text-lg font-bold text-white hover:bg-white/20 transition-all">
                View Trailer
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12">

        {/* Series Metadata */}
        <div className="mb-20 grid grid-cols-1 md:grid-cols-4 gap-8 border-b border-primary/10 pb-12">
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Led by</span>
            <div className="flex items-center gap-3">
              {authorAvatar ? (
                <div
                  className="h-10 w-10 rounded-full bg-cover bg-center ring-2 ring-primary/20"
                  style={{ backgroundImage: `url('${authorAvatar}')` }}
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/20 ring-2 ring-primary/20 flex items-center justify-center">
                  <Icon name="person" size={18} className="text-primary" />
                </div>
              )}
              <span className="text-lg font-medium text-slate-800">{authorName}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Schedule</span>
            <span className="text-lg font-medium text-slate-800">{dateRange}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Thematic Focus</span>
            <span className="text-lg font-medium text-slate-400 italic">Undefined</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Episodes</span>
            <span className="text-lg font-medium text-slate-800">{episodeCount}-Part Exploration</span>
          </div>
        </div>

        {/* Episodes + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

          {/* Episode List */}
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-3xl font-bold text-slate-900">Series Journey</h2>
              <span className="text-slate-500 text-sm">Sorted by Release Date</span>
            </div>

            <div className="space-y-12">
              {displayedEpisodes.length === 0 ? (
                <p className="text-slate-400 italic text-center py-12">No episodes published yet.</p>
              ) : (
                displayedEpisodes.map((episode, index) => {
                  const episodeNumber = episode.series_order ?? index + 1;
                  const thumbnail = episode.featured_image || FALLBACK_THUMBNAIL;
                  const excerpt = (episode as any).excerpt || '';
                  const postUrl = `/library/sermon/${episode.id}`;
                  return (
                    <div key={episode.id} className="group grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      <div className="md:col-span-1">
                        <span className="text-5xl font-light italic text-primary/30 group-hover:text-primary transition-colors">
                          {String(episodeNumber).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="md:col-span-4">
                        <Link to={postUrl} className="block relative aspect-video w-full overflow-hidden rounded-xl bg-slate-200">
                          <img
                            alt={episode.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            src={thumbnail}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_THUMBNAIL; }}
                          />
                          <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm uppercase tracking-tighter">
                            --:--
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                            <Icon name="play_circle" size={48} className="text-white" />
                          </div>
                        </Link>
                      </div>
                      <div className="md:col-span-7 flex flex-col justify-center">
                        <Link to={postUrl} className="block group-hover:text-primary transition-colors">
                          <h3 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-primary transition-colors">
                            {episode.title}
                          </h3>
                        </Link>
                        <p className="text-slate-600 mb-4 line-clamp-2 italic font-light">
                          {excerpt || <span className="text-slate-300">No description available.</span>}
                        </p>
                        <div className="flex items-center gap-6">
                          <Link to={postUrl} className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-widest hover:opacity-80 transition-opacity">
                            <Icon name="headphones" size={18} />
                            Listen
                          </Link>
                          <Link to={postUrl} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-primary uppercase tracking-widest transition-colors">
                            <Icon name="menu_book" size={18} />
                            Read
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!showAllEpisodes && episodes.length > 3 && (
              <div className="mt-16 flex justify-center">
                <button
                  onClick={() => setShowAllEpisodes(true)}
                  className="px-8 py-3 rounded-lg border-2 border-primary/20 text-primary font-bold hover:bg-primary/5 transition-colors"
                >
                  Load Remaining Episodes
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Resources */}
          <aside className="lg:col-span-4 space-y-12">
            <div className="rounded-2xl bg-white p-8 shadow-sm border border-primary/5">
              <h4 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Icon name="folder_open" className="text-primary" />
                Series Resources
              </h4>
              <div className="space-y-4">
                {[
                  { icon: 'picture_as_pdf', label: 'Full Series Study Guide', action: 'download' },
                  { icon: 'auto_stories', label: 'Weekly Scripture List', action: 'open_in_new' },
                  { icon: 'chat_bubble', label: 'Discussion Prompts', action: 'download' },
                ].map((item) => (
                  <a
                    key={item.label}
                    href="#"
                    className="group flex items-center justify-between p-4 rounded-xl bg-[#fcfaf7] border border-transparent hover:border-primary/20 hover:bg-white transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Icon name="{item.icon}" className="text-slate-400 group-hover:text-primary" />
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    </div>
                    <Icon name="{item.action}" size={14} className="text-slate-300" />
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-primary/10 p-8 border border-primary/20">
              <h4 className="text-lg font-bold text-slate-900 mb-4">Support this Series</h4>
              <p className="text-sm text-slate-700 mb-6 font-light leading-relaxed italic">
                Your contributions help us produce high-quality teachings and maintain the sanctuary for all.
              </p>
              <button className="w-full py-3 rounded-lg bg-background-dark text-primary font-bold text-sm tracking-wide uppercase hover:opacity-90 transition-opacity">
                Give Locally
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Community Engagement ─────────────────────────────────────────── */}
      <section className="bg-white py-24 border-t border-primary/10">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Join the Conversation</h2>
          <p className="text-slate-500 mb-12 max-w-2xl mx-auto italic font-light">
            Share your reflections, ask questions, and connect with {series.total_views > 0 ? series.total_views.toLocaleString() : 'others'} currently journeying through this series.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mb-16">
            {discussions.map((discussion) => (
              <div key={discussion.id} className="p-6 rounded-2xl bg-[#fcfaf7] border border-primary/5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-300" />
                    <span className={`text-sm font-bold ${discussion.isAuthor ? 'text-primary' : 'text-slate-800'}`}>
                      {discussion.user}
                      {discussion.isAuthor && (
                        <span className="ml-2 text-xs font-normal text-slate-400">(Author)</span>
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{discussion.time}</span>
                </div>
                <p className="text-slate-600 text-sm italic font-light leading-relaxed">{discussion.comment}</p>
                <div className="flex items-center gap-4 pt-2">
                  <button className="flex items-center gap-1.5 text-xs font-bold text-primary">
                    <Icon name="volunteer_activism" size={14} />
                    {discussion.amens} Amens
                  </button>
                  <button className="text-xs font-bold text-slate-400">Reply</button>
                </div>
              </div>
            ))}
          </div>

          <button className="inline-flex items-center gap-3 px-10 py-5 rounded-full bg-primary text-background-dark font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-primary/20">
            <Icon name="forum" />
            Enter Community Space
          </button>
        </div>
      </section>

    </PublicLayout>
  );
};

export default SeriesPanel;

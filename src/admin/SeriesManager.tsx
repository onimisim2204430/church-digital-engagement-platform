/**
 * Series Manager
 * Lists all series from the real API with create / edit / delete actions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import seriesService, { Series } from '../services/series.service';

import Icon from '../components/common/Icon';
// Dynamically fetch and sum views for a series
const SeriesViewsCell: React.FC<{ seriesId: string }> = ({ seriesId }) => {
  const [views, setViews] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    seriesService.getSeriesPosts(seriesId)
      .then(posts => {
        if (mounted) setViews(posts.reduce((sum, p) => sum + (p.views_count || 0), 0));
      })
      .catch(() => { if (mounted) setViews(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [seriesId]);
  if (loading) return <span className="inline-flex items-center gap-1 text-slate-300"><Icon name="progress_activity" className=" text-xs animate-spin" />...</span>;
  return <span>{(views || 0).toLocaleString()} views</span>;
};

const SeriesManager: React.FC = () => {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await seriesService.getAllSeries();
      setSeries(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load series');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);



  const handleCreateNew = () => {
    navigate('/admin/series/new');
  };

  const filtered = series.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const visibilityBadge = (v: string) => {
    if (v === 'PUBLIC')
      return (
        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
          Public
        </span>
      );
    if (v === 'MEMBERS_ONLY')
      return (
        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
          Members Only
        </span>
      );
    return (
      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
        Hidden
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Series Management
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {loading ? 'Loading...' : `${series.length} series total`}
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="bg-primary hover:opacity-90 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2"
          >
            <Icon name="add" size={14} />
            New Series
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b border-slate-100 px-8 py-3 flex-shrink-0">
        <div className="max-w-6xl mx-auto">
          <div className="relative w-80">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <Icon name="search" size={18} />
            </span>
            <input
              type="text"
              placeholder="Search series by title..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-white"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
        <div className="max-w-6xl mx-auto">

          {/* Loading skeleton */}
          {loading && (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-slate-200 h-[72px] animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
              <Icon name="error_outline" size={36} className=" text-red-400" />
              <p className="mt-3 text-red-700 font-semibold">{error}</p>
              <button onClick={fetchSeries} className="mt-4 text-sm text-primary underline">
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Icon name="account_tree" size={32} className=" text-slate-400" />
              </div>
              <p className="text-slate-600 font-semibold text-lg">
                {searchTerm ? 'No series match your search' : 'No series yet'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleCreateNew}
                  className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold"
                >
                  Create your first series
                </button>
              )}
            </div>
          )}

          {/* Series list */}
          {!loading && !error && filtered.length > 0 && (
            <div className="flex flex-col gap-3">
              {filtered.map(s => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/admin/series/${s.id}`)}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
                >
                  {/* Cover thumbnail */}
                  <div className="h-14 w-14 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                    {s.cover_image ? (
                      <img src={s.cover_image} alt={s.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Icon name="account_tree" size={24} className=" text-slate-300" />
                      </div>
                    )}
                  </div>

                  {/* Series info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 truncate">{s.title}</h3>
                      {s.is_featured && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200">
                          Featured
                        </span>
                      )}
                      {visibilityBadge(s.visibility)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>{s.published_post_count} / {s.post_count} posts published</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <SeriesViewsCell seriesId={s.id} />
                      {s.author_name && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="flex items-center gap-1">
                            <Icon name="person" size={12} />
                            {s.author_name}
                          </span>
                        </>
                      )}
                      {s.date_range?.start && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span>
                            {new Date(s.date_range.start).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Icon name="chevron_right" size={18} className=" text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SeriesManager;
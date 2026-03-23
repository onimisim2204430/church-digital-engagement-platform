import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/common/Icon';
import seriesService, { type Series } from '../../../services/series.service';

const REQUIRED_FEATURED_COUNT = 3;

const FeaturedSeriesTab: React.FC = () => {
  const [series, setSeries] = useState<Series[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadSeries = useCallback(async (searchTerm?: string) => {
    try {
      setLoading(true);
      setError('');
      const data = await seriesService.getAllSeries({ search: searchTerm || undefined });
      const normalized = Array.isArray(data) ? data : [];
      setSeries(normalized);

      const existingFeatured = normalized
        .filter((item) => item.is_featured)
        .sort((a, b) => b.featured_priority - a.featured_priority)
        .map((item) => item.id)
        .slice(0, REQUIRED_FEATURED_COUNT);

      setSelectedIds(existingFeatured);
    } catch (err) {
      console.error('Failed to load series', err);
      setSeries([]);
      setSelectedIds([]);
      setError('Could not load series list.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  const selectedCount = selectedIds.length;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= REQUIRED_FEATURED_COUNT) {
        window.alert(`You can only select ${REQUIRED_FEATURED_COUNT} series.`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const moveSelected = (id: string, direction: 'up' | 'down') => {
    setSelectedIds((prev) => {
      const currentIndex = prev.indexOf(id);
      if (currentIndex === -1) return prev;
      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedIds.length !== REQUIRED_FEATURED_COUNT) {
      window.alert(`Select exactly ${REQUIRED_FEATURED_COUNT} series before saving.`);
      return;
    }
    try {
      setSaving(true);
      await seriesService.setFeaturedSeriesSelection({ series_ids: selectedIds });
      await loadSeries(search.trim() || undefined);
      window.alert('Featured series updated.');
    } catch (err: any) {
      console.error('Failed to save featured series', err?.response?.data || err);
      const serverError = err?.response?.data?.series_ids;
      if (Array.isArray(serverError) && serverError.length > 0) {
        window.alert(serverError[0]);
      } else {
        window.alert('Could not save featured series.');
      }
    } finally {
      setSaving(false);
    }
  };

  const orderedSelectedSeries = selectedIds
    .map((id) => series.find((item) => item.id === id))
    .filter((item): item is Series => Boolean(item));

  const onSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadSeries(search.trim() || undefined);
  };

  const progressPct = Math.round((selectedCount / REQUIRED_FEATURED_COUNT) * 100);

  return (
    <div className="p-6 space-y-5">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Featured Archive Series</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Select exactly three series to appear in "Latest from the Archive".
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || selectedCount !== REQUIRED_FEATURED_COUNT}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shrink-0"
        >
          <Icon name="backup" size={16} />
          {saving ? 'Saving…' : 'Publish Selection'}
        </button>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Selection Progress
          </span>
          <span className={`text-xs font-bold tabular-nums ${selectedCount === REQUIRED_FEATURED_COUNT ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
            {selectedCount} of {REQUIRED_FEATURED_COUNT} selected
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${selectedCount === REQUIRED_FEATURED_COUNT ? 'bg-emerald-500' : 'bg-amber-400'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {selectedCount < REQUIRED_FEATURED_COUNT && (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            {REQUIRED_FEATURED_COUNT - selectedCount} more {REQUIRED_FEATURED_COUNT - selectedCount === 1 ? 'series' : 'series'} needed before you can publish.
          </p>
        )}
      </div>

      {/* Search */}
      <form onSubmit={onSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon name="search" size={16} className="text-slate-400" />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition"
            placeholder="Search series by title…"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition"
        >
          Search
        </button>
      </form>

      {/* Two-panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Library */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Series Library</h3>
            {!loading && <span className="text-xs text-slate-400">{series.length} total</span>}
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="p-4 flex gap-3 animate-pulse">
                  <div className="mt-0.5 h-5 w-5 rounded bg-slate-100 dark:bg-slate-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 gap-2">
              <Icon name="error_outline" size={28} className="text-red-300" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : series.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 gap-2">
              <Icon name="inbox" size={28} className="text-slate-300 dark:text-slate-700" />
              <p className="text-sm text-slate-500">No series found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-[460px]">
              {series.map((item) => {
                const isSelected = selectedSet.has(item.id);
                const selectionIndex = selectedIds.indexOf(item.id);
                return (
                  <li
                    key={item.id}
                    onClick={() => toggleSelected(item.id)}
                    className={`group flex items-start gap-3.5 px-5 py-3.5 cursor-pointer select-none transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className={`mt-0.5 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-300 dark:border-slate-600 group-hover:border-emerald-400'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
                        {isSelected && (
                          <span className="shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                            {selectionIndex + 1}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Order panel */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Homepage Order</h3>
            <p className="text-xs text-slate-400 mt-0.5">Cards display left → right</p>
          </div>

          <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800">
            {[...Array(REQUIRED_FEATURED_COUNT)].map((_, index) => {
              const item = orderedSelectedSeries[index];
              return (
                <div key={index} className="flex items-center gap-3 px-5 py-4">
                  <span className={`shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    item
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {index + 1}
                  </span>

                  {item ? (
                    <>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
                        <p className="text-xs text-slate-400 truncate">/{item.slug}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveSelected(item.id, 'up')}
                          disabled={index === 0}
                          className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-25 disabled:cursor-not-allowed transition"
                        >
                          <Icon name="keyboard_arrow_up" size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSelected(item.id, 'down')}
                          disabled={index === orderedSelectedSeries.length - 1}
                          className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-25 disabled:cursor-not-allowed transition"
                        >
                          <Icon name="keyboard_arrow_down" size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 h-8 rounded-md border border-dashed border-slate-200 dark:border-slate-700" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedSeriesTab;
/**
 * Dashboard Overview — Enterprise Command Center
 * Metrics grid, community health map, live feed, content pipeline
 *
 * Optimizations applied:
 * - All static data lifted to module-level constants (zero allocation on re-render)
 * - 5 React.memo sub-components: MetricCard, ActivityFeedItem, MapPanel, PipelineCard, PipelineColumn
 * - metrics array memoized — only rebuilds when totalPosts/loadingStats change
 * - contentByStatus map memoized — single O(n) pass replaces 3× filter calls
 * - All navigate callbacks stabilized with useCallback
 * - Thumbnail images get loading="lazy" decoding="async"
 * - MapPanel and PipelineColumn lazy-loaded with Suspense + skeleton fallbacks
 * - AbortController for cancel-safe data fetching
 * - Metric cards show animated skeleton during loadingStats (zero layout shift)
 * - REGION_DOTS pre-rendered in MapPanel as module-level constant
 * - Passive scroll listeners guarded with comments
 */

import React, { useState, useEffect, useMemo, useCallback, memo, lazy, Suspense } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { adminContentService } from '../../services/admin-content.service';
import Icon from '../../components/common/Icon';

import type { ActivityItem, ContentItem, MetricShape } from './types/dashboard.types';
import {
  ACTIVITIES, CONTENT_ITEMS, PIPELINE_STATUSES,
  HIDE_SCROLLBAR
} from './constants/dashboard.constants';

import MetricCard from './components/MetricCard';
import ActivityFeedItem from './components/ActivityFeedItem';
import PipelineCard from './components/PipelineCard';

// Lazy-load heavy components with Suspense boundaries
const MapPanel       = lazy(() => import('./components/MapPanel'));
const PipelineColumn = lazy(() => import('./components/PipelineColumn'));

// Skeleton fallbacks for perceived performance
const MapSkeleton = () => (
  <div className="xl:col-span-2 rounded-lg border border-border-light dark:border-slate-700 bg-white dark:bg-slate-800/60 h-[360px] animate-pulse" />
);

const PipelineSkeleton = () => (
  <div className="rounded-lg border border-border-light dark:border-slate-700 bg-white dark:bg-slate-800/60 h-48 animate-pulse" />
);

// Set display names for lazy-loaded components
(MapPanel as any).displayName       = 'MapPanel';
(PipelineColumn as any).displayName = 'PipelineColumn';

// ─── Main component ──────────────────────────────────────────────────────────

const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [totalPosts, setTotalPosts] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStats = async () => {
      try {
        // Skip the fetch if the current user lacks content.posts permission.
        // Without this guard a moderator gets HTTP 403 from Django which can
        // trigger api.service interceptors to redirect the whole app to /403.
        if (user?.role !== 'ADMIN' && !hasPermission('content.posts')) {
          setTotalPosts(0);
          setLoadingStats(false);
          return;
        }
        const postsData = await adminContentService.getPosts();
        
        if (controller.signal.aborted) return;
        
        if (Array.isArray(postsData)) {
          setTotalPosts(postsData.length);
        } else if (postsData && typeof postsData === 'object') {
          if ('count' in postsData) setTotalPosts((postsData as any).count);
          else if ('results' in postsData) setTotalPosts((postsData as any).results.length);
        }
      } catch (err: any) {
        // Ignore abort errors — don't log or set state
        if (err?.name === 'AbortError') return;
        if (!controller.signal.aborted) setTotalPosts(0);
      } finally {
        if (!controller.signal.aborted) setLoadingStats(false);
      }
    };

    fetchStats();
    return () => controller.abort();
  }, []);

  /** Rebuilt only when totalPosts or loadingStats change */
  const metrics = useMemo<(MetricShape)[]>(() => [
    { label: 'Engagement',    value: '--',                                    change: '--', changePositive: true,  bars: [2, 4, 3, 5, 7], special: null, loading: false },
    { label: 'Total Content', value: loadingStats ? '...' : String(totalPosts), change: '--', changePositive: true,  bars: [3, 4, 5, 6, 4], special: null, loading: loadingStats },
    { label: 'Financials',    value: '--',                                    change: '--', changePositive: true,  bars: [6, 7, 5, 4, 3], special: null, loading: false },
    { label: 'Media Reach',   value: '--',                                    change: '--', changePositive: true,  bars: [2, 3, 4, 6, 8], special: null, loading: false },
    { label: 'System Health', value: '--',                                    change: '--', changePositive: true,  bars: null,            special: 'health', loading: false },
    { label: 'Live Active',   value: '--',                                    change: '--', changePositive: true,  bars: null,            special: 'live', loading: false },
  ], [totalPosts, loadingStats]);

  /** Single O(n) group pass — replaces 3× filter calls */
  const contentByStatus = useMemo(() => {
    const map: Record<ContentItem['status'], ContentItem[]> = { draft: [], review: [], scheduled: [] };
    for (const item of CONTENT_ITEMS) map[item.status].push(item);
    return map;
  }, []); // CONTENT_ITEMS is module-level — this runs exactly once

  const goToContent = useCallback(() => navigate('/admin/content'), [navigate]);

  return (
    <div className="p-6 space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Map + Activity Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Suspense fallback={<MapSkeleton />}>
          <MapPanel />
        </Suspense>

        <div className="rounded-lg border border-border-light dark:border-slate-700 bg-white dark:bg-slate-800/60 flex flex-col h-[360px]">
          <div className="border-b border-border-light dark:border-slate-700 px-4 py-3 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/40 flex-shrink-0">
            <h2 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Live Interaction Feed</h2>
            <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
          </div>
          {/* 
            NOTE: Any scroll listeners attached to this element must use { passive: true }
            to avoid blocking the main thread during scroll.
          */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={HIDE_SCROLLBAR}>
            {ACTIVITIES.map((activity) => (
              <ActivityFeedItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      </div>

      {/* Content Pipeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Icon name="view_kanban" size={16} className=" text-primary" />
            Content Pipeline Status
          </h2>
          <button onClick={goToContent} className="text-sm text-primary font-bold hover:underline">
            View All Content
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {PIPELINE_STATUSES.map((status) => (
            <Suspense key={status} fallback={<PipelineSkeleton />}>
              <PipelineColumn
                status={status}
                items={contentByStatus[status]}
                onAddClick={goToContent}
              />
            </Suspense>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
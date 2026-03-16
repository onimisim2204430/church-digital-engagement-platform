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
import apiService from '../../services/api.service';
import Icon from '../../components/common/Icon';
import { HeroSectionModal } from '../components/HeroSectionModal';
import { heroSectionService } from '../services/heroSectionService';

import type { ActivityItem, ContentItem, MetricShape } from './types/dashboard.types';
import {
  ACTIVITIES, CONTENT_ITEMS, PIPELINE_STATUSES,
  HIDE_SCROLLBAR
} from './constants/dashboard.constants';

import MetricCard from './components/MetricCard';
import ActivityFeedItem from './components/ActivityFeedItem';
import PipelineCard from './components/PipelineCard';
import NotificationsPanel from './components/NotificationsPanel';

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
  const [financialBalance, setFinancialBalance] = useState<string>('--');
  const [financialBalanceRaw, setFinancialBalanceRaw] = useState<string>('');
  const [mediaReachVisits, setMediaReachVisits] = useState<string>('--');
  const [loadingFinancial, setLoadingFinancial] = useState(false);
  const [loadingMediaReach, setLoadingMediaReach] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [heroSectionModalOpen, setHeroSectionModalOpen] = useState(false);
  const [savingHeroSection, setSavingHeroSection] = useState(false);
  const [currentHeroSection, setCurrentHeroSection] = useState<any>(null);

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

  // Format balance with shorthand notation (M for millions, K for thousands) - NO ROUNDING
  const formatBalanceShorthand = (ngn: number): string => {
    if (ngn >= 1_000_000) {
      const millions = ngn / 1_000_000;
      const truncated = Math.floor(millions * 100) / 100;
      return truncated + 'M';
    } else if (ngn >= 1_000) {
      const thousands = ngn / 1_000;
      const truncated = Math.floor(thousands * 100) / 100;
      return truncated + 'K';
    } else {
      return ngn.toFixed(0);
    }
  };

  // Fetch financial balance from Paystack
  useEffect(() => {
    const controller = new AbortController();

    const fetchFinancialBalance = async () => {
      try {
        setLoadingFinancial(true);
        const response = await apiService.get('/payments/admin/paystack-balance/');
        if (controller.signal.aborted) return;
        
        // Balance is in kobo, convert to NGN
        const balanceInKobo = response?.balance ?? 0;
        const balanceInNGN = balanceInKobo / 100;
        const fullBalance = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'NGN',
          minimumFractionDigits: 0,
        }).format(balanceInNGN);
        const shortBalance = formatBalanceShorthand(balanceInNGN);
        setFinancialBalanceRaw(fullBalance);
        setFinancialBalance(shortBalance);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Failed to fetch balance:', err);
          setFinancialBalance('--');
          setFinancialBalanceRaw('--');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingFinancial(false);
      }
    };

    fetchFinancialBalance();
    return () => controller.abort();
  }, []);

  // Fetch media reach visits (total unique visitors)
  useEffect(() => {
    const controller = new AbortController();

    const fetchMediaReachVisits = async () => {
      try {
        setLoadingMediaReach(true);
        const response = await apiService.get('/analytics/dashboard/visitor-count/');
        if (controller.signal.aborted) return;
        
        const visitCount = response?.total_visits ?? response?.count ?? 0;
        setMediaReachVisits(String(visitCount));
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Failed to fetch visitor count:', err);
          setMediaReachVisits('--');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingMediaReach(false);
      }
    };

    fetchMediaReachVisits();
    return () => controller.abort();
  }, []);

  // Fetch the current active hero section so the edit modal is pre-populated
  const fetchHeroSection = useCallback(async () => {
    try {
      const sections = await heroSectionService.getAll();
      if (Array.isArray(sections) && sections.length > 0) {
        setCurrentHeroSection(sections[0]);
      }
    } catch (error) {
      // Non-critical – admin can still create a new hero section
      console.warn('Could not load existing hero section:', error);
    }
  }, []);

  useEffect(() => {
    fetchHeroSection();
  }, [fetchHeroSection]);

  /** Rebuilt only when totalPosts, loadingStats, financialBalance, or mediaReachVisits change */
  const metrics = useMemo<(MetricShape)[]>(() => [
    { label: 'Engagement',    value: '--',                                      change: '--', changePositive: true,  bars: [2, 4, 3, 5, 7], special: null, loading: false },
    { label: 'Total Content', value: loadingStats ? '...' : String(totalPosts),  change: '--', changePositive: true,  bars: [3, 4, 5, 6, 4], special: null, loading: loadingStats },
    { label: 'Financials',    value: showBalance ? financialBalance : '••••••',change: '--', changePositive: true,  bars: [6, 7, 5, 4, 3], special: null, loading: loadingFinancial, isHidden: !showBalance, onToggleVisibility: () => setShowBalance(!showBalance), fullValue: financialBalanceRaw },
    { label: 'Media Reach',   value: mediaReachVisits,                          change: '--', changePositive: true,  bars: [2, 3, 4, 6, 8], special: null, loading: loadingMediaReach },
    { label: 'System Health', value: '--',                                      change: '--', changePositive: true,  bars: null,            special: 'health', loading: false },
    { label: 'Live Active',   value: '--',                                      change: '--', changePositive: true,  bars: null,            special: 'live', loading: false },
  ], [totalPosts, loadingStats, financialBalance, financialBalanceRaw, loadingFinancial, mediaReachVisits, loadingMediaReach, showBalance]);

  /** Single O(n) group pass — replaces 3× filter calls */
  const contentByStatus = useMemo(() => {
    const map: Record<ContentItem['status'], ContentItem[]> = { draft: [], review: [], scheduled: [] };
    for (const item of CONTENT_ITEMS) map[item.status].push(item);
    return map;
  }, []); // CONTENT_ITEMS is module-level — this runs exactly once

  const goToContent = useCallback(() => navigate('/admin/content'), [navigate]);

  const handleSaveHeroSection = useCallback(async (data: any) => {
    try {
      setSavingHeroSection(true);
      if (data.id) {
        await heroSectionService.update(data.id, data);
      } else {
        await heroSectionService.create(data);
      }
      // Reload the hero section so the modal stays in sync on next open
      await fetchHeroSection();
    } catch (error) {
      console.error('Error saving hero section:', error);
      throw error;
    } finally {
      setSavingHeroSection(false);
    }
  }, [fetchHeroSection]);

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
          <NotificationsPanel />
        </div>
      </div>

      {/* Featured Content Management */}
      <div className="rounded-lg border border-border-light dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="image" size={20} className="text-primary" />
            <div>
              <h3 className="font-semibold text-sm text-text-main">Homepage Hero Section</h3>
              <p className="text-xs text-text-muted">Featured sermon or announcement</p>
            </div>
          </div>
          <button
            onClick={() => setHeroSectionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors text-sm font-semibold"
          >
            <Icon name="edit" size={16} />
            Edit Hero Section
          </button>
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

      {/* Hero Section Modal */}
      <HeroSectionModal
        isOpen={heroSectionModalOpen}
        onClose={() => setHeroSectionModalOpen(false)}
        onSave={handleSaveHeroSection}
        initialData={currentHeroSection}
        isLoading={savingHeroSection}
      />
    </div>
  );
};

export default DashboardOverview;
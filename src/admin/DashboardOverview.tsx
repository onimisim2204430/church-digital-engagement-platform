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
 * - mapView toggle now isolated inside MapPanel — zero external state changes
 */

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminContentService } from '../services/admin-content.service';

import Icon from '../components/common/Icon';
// ─── Types ──────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: number;
  user: string;
  action: string;
  location: string;
  time: string;
  icon: string;
}

interface ContentItem {
  id: number;
  title: string;
  status: 'draft' | 'review' | 'scheduled';
  type: string;
  thumbnail?: string;
  authors?: number;
  scheduledDate?: string;
  scheduledTime?: string;
}

interface MetricShape {
  label: string;
  value: string;
  change: string;
  changePositive: boolean;
  bars: number[] | null;
  special: string | null;
}

// ─── Module-level constants (never re-created) ───────────────────────────────

const ACTIVITIES: ActivityItem[] = [
  { id: 1, user: 'Sarah M.',  action: 'shared a prayer request',       location: 'Houston, TX', time: '2 mins ago',  icon: 'person' },
  { id: 2, user: 'David L.',  action: 'joined "Young Adults" group',   location: 'London, UK',  time: '5 mins ago',  icon: 'group_add' },
  { id: 3, user: 'Maria G.',  action: 'started a devotion',            location: 'Madrid, ES',  time: '8 mins ago',  icon: 'menu_book' },
  { id: 4, user: 'James K.',  action: 'submitted a prayer request',    location: 'Nairobi, KE', time: '12 mins ago', icon: 'volunteer_activism' },
];

const CONTENT_ITEMS: ContentItem[] = [
  { id: 1, title: 'Sermon Series: Faith in Action',     status: 'draft',     type: 'Podcasting',     authors: 2,
    thumbnail: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400&q=80' },
  { id: 2, title: 'Sunday Service: Awakening Pt. 4',    status: 'review',    type: 'Needs Approval', authors: 1,
    thumbnail: 'https://images.unsplash.com/photo-1438232992991-995b671e5f2d?w=400&q=80' },
  { id: 3, title: 'Newsletter: Monthly Vision Update',  status: 'scheduled', type: 'Auto-post',
    scheduledDate: 'Oct 12', scheduledTime: '09:00 AM' },
];

const REGIONS = [
  { region: 'North America', value: '2.4M', color: 'bg-primary' },
  { region: 'Europe',        value: '890K', color: 'bg-emerald-500' },
  { region: 'Africa',        value: '1.1M', color: 'bg-amber-500' },
  { region: 'Asia Pacific',  value: '640K', color: 'bg-violet-500' },
  { region: 'Latin America', value: '420K', color: 'bg-rose-400' },
  { region: 'Middle East',   value: '180K', color: 'bg-cyan-500' },
] as const;

const PIPELINE_STATUSES = ['draft', 'review', 'scheduled'] as const;

const STATUS_LABELS: Record<ContentItem['status'], string> = {
  draft:     'Draft (3)',
  review:    'Review (1)',
  scheduled: 'Scheduled (4)',
};

const STATUS_LABEL_COLORS: Record<ContentItem['status'], string> = {
  draft:     'text-slate-soft',
  review:    'text-amber-600',
  scheduled: 'text-emerald-600',
};

const STATUS_ICONS: Record<ContentItem['status'], string | null> = {
  draft:     null,
  review:    'priority_high',
  scheduled: 'event_available',
};

const STATUS_ICON_COLORS: Record<ContentItem['status'], string> = {
  draft:     '',
  review:    'text-amber-500',
  scheduled: 'text-emerald-500',
};

const STATUS_STYLES: Record<ContentItem['status'], { border: string; bg: string; badge: string }> = {
  draft:     { border: 'border-border-light hover:border-primary/40', bg: 'bg-white',        badge: 'bg-slate-100 text-slate-soft' },
  review:    { border: 'border-amber-100 hover:border-amber-300',      bg: 'bg-amber-50/30',  badge: 'bg-amber-100 text-amber-700 border border-amber-200' },
  scheduled: { border: 'border-border-light',                           bg: 'bg-white',        badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
};

const HIDE_SCROLLBAR: React.CSSProperties = { scrollbarWidth: 'none' };

// ─── Sub-components (all memo-wrapped) ───────────────────────────────────────

const MetricCard = memo(({ label, value, change, changePositive, bars, special }: MetricShape) => (
  <div className="min-w-0 rounded-lg border border-border-light bg-gradient-to-b from-white to-blue-50/30 p-3 transition-all hover:border-primary/30">
    <div className="flex justify-between items-start mb-1.5 gap-1">
      <span className="text-[11px] font-bold text-slate-soft uppercase tracking-tight leading-tight truncate min-w-0">{label}</span>
      <span className={`text-[11px] font-bold flex-shrink-0 ${changePositive ? 'text-emerald-600' : 'text-rose-500'}`}>{change}</span>
    </div>
    <div className="text-lg font-bold text-slate-deep truncate">{value}</div>
    {bars ? (
      <div className="mt-2 h-7 w-full bg-primary/5 rounded flex items-end px-1 gap-0.5">
        {bars.map((h, bi) => (
          <div
            key={bi}
            className={`flex-1 rounded-t-sm ${bi === bars.length - 1 ? 'bg-primary' : 'bg-primary/30'}`}
            style={{ height: `${(h / 8) * 100}%` }}
          />
        ))}
      </div>
    ) : special === 'health' ? (
      <div className="mt-2 h-7 w-full bg-slate-100 rounded flex items-center justify-center">
        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Operational</span>
      </div>
    ) : (
      <div className="mt-3 flex gap-1 items-center">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
        <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden min-w-0">
          <div className="w-[60%] h-full bg-emerald-400 rounded-full" />
        </div>
      </div>
    )}
  </div>
));
MetricCard.displayName = 'MetricCard';

const ActivityFeedItem = memo(({ activity }: { activity: ActivityItem }) => (
  <div className="flex gap-3 items-start min-w-0">
    <div className="size-8 rounded-full bg-slate-100 border border-border-light flex-shrink-0 flex items-center justify-center text-slate-soft">
      <Icon name={activity.icon} size={14} />
    </div>
    <div className="border-b border-slate-50 pb-2 min-w-0 flex-1">
      <p className="text-sm text-slate-deep overflow-hidden">
        <span className="font-bold">{activity.user}</span> {activity.action}
      </p>
      <p className="text-xs text-slate-soft mt-0.5 truncate">{activity.time} · {activity.location}</p>
    </div>
  </div>
));
ActivityFeedItem.displayName = 'ActivityFeedItem';

/** MapPanel owns its own mapView toggle state — changes here never propagate up */
const MapPanel = memo(() => {
  const [mapView, setMapView] = useState<'regional' | 'global'>('global');
  return (
    <div className="xl:col-span-2 rounded-lg border border-border-light bg-white overflow-hidden flex flex-col h-[360px]">
      <div className="border-b border-border-light px-4 py-3 flex justify-between items-center bg-slate-50/30 flex-shrink-0">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-deep">Community Health Map</h2>
        <div className="flex gap-2">
          {(['regional', 'global'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setMapView(v)}
              className={`rounded-md border px-3 py-1 text-xs font-bold uppercase transition-colors ${
                mapView === v ? 'bg-primary text-white border-primary' : 'bg-white text-slate-soft border-border-light hover:border-primary'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-sky-50/30 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <span className="text-primary" style={{ fontSize: '300px' }}>public</span>
        </div>
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-4 p-6 pointer-events-none">
          {REGIONS.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`size-2 rounded-full ${r.color} flex-shrink-0`} />
              <div>
                <p className="text-xs font-bold text-slate-deep leading-none">{r.region}</p>
                <p className="text-xs text-primary font-bold">{r.value}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute top-4 left-4">
          <div className="bg-white/90 backdrop-blur border border-border-light p-3 rounded-lg shadow-sm">
            <p className="text-xs text-slate-soft uppercase font-bold mb-1">High Activity Region</p>
            <p className="text-sm font-bold text-slate-deep">North America</p>
            <p className="text-sm text-primary font-bold">2.4M Interactions</p>
          </div>
        </div>
      </div>
    </div>
  );
});
MapPanel.displayName = 'MapPanel';

const PipelineCard = memo(({ item }: { item: ContentItem }) => {
  const s = STATUS_STYLES[item.status];
  return (
    <div className={`rounded-lg border ${s.border} ${s.bg} p-3 space-y-2 shadow-sm cursor-pointer group transition-colors`}>
      {item.thumbnail && (
        <div className="h-20 rounded bg-slate-100 overflow-hidden">
          <img
            alt="Thumbnail"
            className="w-full h-full object-cover"
            src={item.thumbnail}
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-deep leading-tight group-hover:text-primary">{item.title}</h3>
      <div className="flex items-center justify-between">
        {item.authors ? (
          <div className="flex -space-x-2">
            {Array.from({ length: Math.min(item.authors, 2) }).map((_, i) => (
              <div key={i} className="size-5 rounded-full bg-slate-200 border-2 border-white" />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-soft">{item.scheduledDate}, {item.scheduledTime}</p>
        )}
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{item.type}</span>
      </div>
    </div>
  );
});
PipelineCard.displayName = 'PipelineCard';

interface PipelineColumnProps {
  status: ContentItem['status'];
  items: ContentItem[];
  onAddClick: () => void;
}

const PipelineColumn = memo(({ status, items, onAddClick }: PipelineColumnProps) => {
  const icon = STATUS_ICONS[status];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border-light pb-2">
        <span className={`text-xs font-bold uppercase ${STATUS_LABEL_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
        {icon ? (
          <span className={`material-symbols-outlined text-sm ${STATUS_ICON_COLORS[status]}`}>{icon}</span>
        ) : (
          <button onClick={onAddClick} className="text-sm text-slate-soft hover:text-primary">add</button>
        )}
      </div>
      {items.map((item) => <PipelineCard key={item.id} item={item} />)}
    </div>
  );
});
PipelineColumn.displayName = 'PipelineColumn';

// ─── Main component ──────────────────────────────────────────────────────────

const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const [totalPosts, setTotalPosts] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const postsData = await adminContentService.getPosts();
        if (cancelled) return;
        if (Array.isArray(postsData)) {
          setTotalPosts(postsData.length);
        } else if (postsData && typeof postsData === 'object') {
          if ('count' in postsData) setTotalPosts((postsData as any).count);
          else if ('results' in postsData) setTotalPosts((postsData as any).results.length);
        }
      } catch {
        if (!cancelled) setTotalPosts(0);
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    };
    fetchStats();
    return () => { cancelled = true; };
  }, []);

  /** Rebuilt only when totalPosts or loadingStats change */
  const metrics = useMemo<MetricShape[]>(() => [
    { label: 'Engagement',    value: '--',                                    change: '--', changePositive: true,  bars: [2, 4, 3, 5, 7], special: null },
    { label: 'Total Content', value: loadingStats ? '...' : String(totalPosts), change: '--', changePositive: true,  bars: [3, 4, 5, 6, 4], special: null },
    { label: 'Financials',    value: '--',                                    change: '--', changePositive: true,  bars: [6, 7, 5, 4, 3], special: null },
    { label: 'Media Reach',   value: '--',                                    change: '--', changePositive: true,  bars: [2, 3, 4, 6, 8], special: null },
    { label: 'System Health', value: '--',                                    change: '--', changePositive: true,  bars: null,            special: 'health' },
    { label: 'Live Active',   value: '--',                                    change: '--', changePositive: true,  bars: null,            special: 'live' },
  ], [totalPosts, loadingStats]);

  /** Single O(n) group pass — replaces 3× filter calls produced on every render */
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
        <MapPanel />

        <div className="rounded-lg border border-border-light bg-white flex flex-col h-[360px]">
          <div className="border-b border-border-light px-4 py-3 flex justify-between items-center bg-slate-50/30 flex-shrink-0">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-deep">Live Interaction Feed</h2>
            <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
          </div>
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
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-deep flex items-center gap-2">
            <Icon name="view_kanban" size={16} className=" text-primary" />
            Content Pipeline Status
          </h2>
          <button onClick={goToContent} className="text-sm text-primary font-bold hover:underline">
            View All Content
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {PIPELINE_STATUSES.map((status) => (
            <PipelineColumn
              key={status}
              status={status}
              items={contentByStatus[status]}
              onAddClick={goToContent}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;

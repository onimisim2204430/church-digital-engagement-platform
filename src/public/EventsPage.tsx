import React, { memo, useCallback, useMemo, useState } from 'react';
import { PublicLayout } from './layouts';
import Icon from '../components/common/Icon';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Event {
  id: number;
  date: string;
  day: string;
  name: string;
  description: string;
  location: string;
  capacity: number;
  total: number;
  status: 'open' | 'approaching' | 'full' | 'recurring';
  type: 'Workshops' | 'Services' | 'All Events';
  recurring?: boolean;
}

// ─── Module-level constants (never recreated on re-render) ────────────────────

const FILTERS = ['All Events', 'Workshops', 'Services'] as const;

const EVENTS: Event[] = [
  {
    id: 1,
    date: 'Oct 24',
    day: 'Thursday',
    name: 'Community Dinner',
    description: 'Monthly gathering for new members and families.',
    location: 'Main Hall',
    capacity: 45,
    total: 100,
    status: 'open',
    type: 'All Events',
  },
  {
    id: 2,
    date: 'Nov 02',
    day: 'Saturday',
    name: 'Fall Retreat',
    description: 'Weekend getaway focusing on spiritual renewal.',
    location: 'Cabins',
    capacity: 92,
    total: 100,
    status: 'approaching',
    type: 'Workshops',
  },
  {
    id: 3,
    date: 'Nov 15',
    day: 'Friday',
    name: 'Leadership Workshop',
    description: 'Advanced training for small group leaders.',
    location: 'Room 3B',
    capacity: 20,
    total: 20,
    status: 'full',
    type: 'Workshops',
  },
  {
    id: 4,
    date: 'Dec 24',
    day: 'Tuesday',
    name: 'Christmas Service',
    description: 'Annual candlelight service and carols.',
    location: 'Sanctuary',
    capacity: 12,
    total: 800,
    status: 'open',
    type: 'Services',
  },
  {
    id: 5,
    date: 'Weekly',
    day: 'Wednesdays',
    name: 'Morning Prayer',
    description: 'Open prayer session for the community.',
    location: 'Chapel',
    capacity: 0,
    total: 0,
    status: 'recurring',
    type: 'All Events',
    recurring: true,
  },
];

const PAGES = [1, 2, 3] as const;

// ─── Pure helpers (no closure over component state) ───────────────────────────

const getCapacityPercentage = (capacity: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((capacity / total) * 100);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ActionButton = memo<{ status: Event['status'] }>(({ status }) => {
  switch (status) {
    case 'open':
      return (
        <button className="w-full md:w-auto px-4 py-2 border border-border-subtle text-primary font-bold text-sm rounded hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
          Register
          <Icon name="arrow_forward" size={16} />
        </button>
      );
    case 'approaching':
      return (
        <button className="w-full md:w-auto px-4 py-2 bg-surface border border-accent-warning text-yellow-700 font-bold text-sm rounded hover:bg-accent-warning hover:text-white transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
          Register
          <Icon name="bolt" size={16} />
        </button>
      );
    case 'full':
      return (
        <button className="w-full md:w-auto px-4 py-2 border border-border-subtle text-text-muted font-bold text-sm rounded hover:border-text-muted hover:text-text-main transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
          <Icon name="hourglass_empty" size={16} />
          Waitlist
        </button>
      );
    case 'recurring':
      return (
        <button className="w-full md:w-auto px-4 py-2 border border-border-subtle text-text-main font-bold text-sm rounded hover:bg-text-main hover:text-white hover:border-text-main transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
          Details
          <Icon name="info" size={16} />
        </button>
      );
    default:
      return null;
  }
});

const EventRow = memo<{ event: Event }>(({ event }) => {
  const capacityPct = useMemo(
    () => getCapacityPercentage(event.capacity, event.total),
    [event.capacity, event.total],
  );

  return (
    <div
      className={`group relative transition-colors duration-200 ${
        event.status === 'approaching'
          ? 'bg-accent-warning/5 hover:bg-accent-warning/10'
          : 'hover:bg-background-light/50'
      }`}
    >
      {event.status === 'approaching' && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent-warning"></div>
      )}

      <div className="md:grid md:grid-cols-12 md:gap-4 p-6 md:px-6 md:py-5 items-center">
        {/* Date */}
        <div className="col-span-2 flex md:block items-center justify-between mb-4 md:mb-0">
          <div className="flex flex-col">
            <span className="font-display font-bold text-text-main text-base leading-none">{event.date}</span>
            <span className="font-mono text-xs text-text-muted mt-1">{event.day}</span>
          </div>
          {/* Mobile Status */}
          <div className="md:hidden">
            {event.status === 'approaching' ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-accent-warning/10 border border-accent-warning/20 text-xs font-bold text-yellow-700">
                <Icon name="warning" size={12} className="inline" /> Low
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded bg-background-light border border-border-subtle text-xs font-medium text-text-muted">
                {event.status === 'open' && 'Open'}
                {event.status === 'full' && 'Full'}
                {event.status === 'recurring' && 'Recurring'}
              </span>
            )}
          </div>
        </div>

        {/* Event Name */}
        <div className="col-span-4 mb-3 md:mb-0">
          <div className="flex items-center gap-2">
            <h3
              className={`font-display font-bold text-sm text-text-main ${
                event.status !== 'full'
                  ? 'group-hover:text-primary transition-colors cursor-pointer'
                  : 'cursor-pointer'
              }`}
            >
              {event.name}
            </h3>
            {event.status === 'approaching' && (
              <span className="hidden md:inline-flex size-2 bg-accent-warning rounded-full" title="Filling Fast"></span>
            )}
            {event.recurring && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-background-light border border-border-subtle text-xs font-mono uppercase tracking-wide text-text-muted">
                Recurring
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted mt-0.5 line-clamp-1">{event.description}</p>
        </div>

        {/* Location */}
        <div className="col-span-2 flex items-center gap-2 mb-3 md:mb-0 text-sm font-medium text-text-muted">
          <Icon name="location_on" size={16} className="md:hidden" />
          {event.location}
        </div>

        {/* Capacity */}
        <div className="col-span-2 mb-4 md:mb-0">
          <div className="flex items-center justify-between md:justify-start gap-3 mb-1.5">
            <span className="text-xs font-mono font-medium text-text-muted md:hidden">Availability</span>
            {event.status === 'recurring' ? (
              <span className="text-xs font-mono font-bold text-text-main">Open</span>
            ) : (
              <span className="text-xs font-mono font-bold text-text-main">
                {event.capacity}
                <span className="text-text-muted font-normal">/{event.total}</span>
              </span>
            )}
          </div>
          <div className="h-1.5 w-full bg-border-subtle rounded-full overflow-hidden">
            {event.status === 'recurring' ? (
              <div className="h-full bg-border-subtle rounded-full w-full opacity-50"></div>
            ) : (
              <div
                className={`h-full rounded-full ${
                  event.status === 'approaching'
                    ? 'bg-accent-warning'
                    : event.status === 'full'
                    ? 'bg-text-muted'
                    : 'bg-text-main'
                }`}
                style={{ width: `${capacityPct}%` }}
              ></div>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="col-span-2 flex justify-end">
          <ActionButton status={event.status} />
        </div>
      </div>
    </div>
  );
});

interface MetricCardProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  subValue?: string;
  trend?: string;
}

const MetricCard = memo<MetricCardProps>(({ icon, iconBg, iconColor, label, value, subValue, trend }) => (
  <div className="bg-surface p-5 rounded border border-border-subtle shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-1.5 ${iconBg} rounded ${iconColor}`}>
        <Icon name={icon} size={20} />
      </div>
      <span className="font-mono text-xs font-bold uppercase text-text-muted">{label}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <span className="font-display text-2xl font-bold text-text-main">{value}</span>
      {trend && (
        <span className="text-xs text-accent-success font-medium flex items-center">
          <Icon name="trending_up" size={14} className="mr-1" /> {trend}
        </span>
      )}
      {subValue && <span className="text-xs text-text-muted font-medium">{subValue}</span>}
    </div>
  </div>
));

// ─── Page Component ───────────────────────────────────────────────────────────

const EventsPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('All Events');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredEvents = useMemo(
    () => (activeFilter === 'All Events' ? EVENTS : EVENTS.filter((e) => e.type === activeFilter)),
    [activeFilter],
  );

  const handleFilterChange = useCallback((filter: string) => setActiveFilter(filter), []);
  const handleViewCalendar = useCallback(() => setViewMode('calendar'), []);
  const handleViewTable = useCallback(() => setViewMode('table'), []);
  const handlePagePrev = useCallback(() => setCurrentPage((p) => Math.max(1, p - 1)), []);
  const handlePageNext = useCallback(() => setCurrentPage((p) => Math.min(3, p + 1)), []);
  const handlePageSet = useCallback((page: number) => setCurrentPage(page), []);

  return (
    <PublicLayout currentPage="events">
      <div className="w-full max-w-[1200px] mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2 py-1 bg-surface border border-border-subtle rounded-sm mb-2">
                <span className="size-2 rounded-full bg-accent-success animate-pulse"></span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted font-bold">System Live</span>
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-extrabold text-text-main tracking-tight leading-[1.1]">
                Events Ledger
              </h2>
              <p className="text-text-muted text-base max-w-2xl leading-relaxed">
                A high-density view of upcoming community gatherings and logistical data. Select an event to view detailed requirements.
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2 bg-surface p-1 rounded-md border border-border-subtle shadow-sm">
              {FILTERS.map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleFilterChange(filter)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeFilter === filter
                      ? 'text-text-main bg-background-light rounded border border-border-subtle shadow-sm'
                      : 'text-text-muted hover:bg-background-light rounded'
                  }`}
                >
                  {filter}
                </button>
              ))}
              <div className="w-px h-4 bg-border-subtle mx-1"></div>
              <button
                onClick={handleViewCalendar}
                className={`size-7 flex items-center justify-center rounded transition-colors ${
                  viewMode === 'calendar'
                    ? 'text-primary bg-primary/10'
                    : 'text-text-muted hover:text-primary hover:bg-background-light'
                }`}
              >
                <Icon name="calendar_month" size={18} />
              </button>
              <button
                onClick={handleViewTable}
                className={`size-7 flex items-center justify-center rounded transition-colors ${
                  viewMode === 'table'
                    ? 'text-primary bg-primary/10'
                    : 'text-text-muted hover:text-primary hover:bg-background-light'
                }`}
              >
                <Icon name="table_rows" size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Data Table Container */}
        <div className="bg-surface rounded-lg border border-border-subtle shadow-card overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-background-light border-b border-border-subtle items-center">
            <div className="col-span-2 font-mono text-xs font-bold text-text-muted uppercase tracking-wider">Date</div>
            <div className="col-span-4 font-mono text-xs font-bold text-text-muted uppercase tracking-wider">Event Name</div>
            <div className="col-span-2 font-mono text-xs font-bold text-text-muted uppercase tracking-wider">Location</div>
            <div className="col-span-2 font-mono text-xs font-bold text-text-muted uppercase tracking-wider">Capacity</div>
            <div className="col-span-2 font-mono text-xs font-bold text-text-muted uppercase tracking-wider text-right">Action</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-border-subtle">
            {filteredEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>

          {/* Table Footer / Pagination */}
          <div className="px-6 py-4 bg-background-light border-t border-border-subtle flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="font-mono text-xs text-text-muted">Showing {filteredEvents.length} of 12 upcoming events</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePagePrev}
                disabled={currentPage === 1}
                className="p-2 rounded hover:bg-surface border border-transparent hover:border-border-subtle transition-all disabled:opacity-50 text-text-muted"
              >
                <Icon name="chevron_left" size={20} />
              </button>
              <div className="flex gap-1">
                {PAGES.map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageSet(page)}
                    className={`size-8 flex items-center justify-center rounded text-sm font-mono font-bold transition-all ${
                      currentPage === page
                        ? 'bg-surface border border-border-subtle text-primary shadow-sm'
                        : 'font-medium text-text-muted hover:bg-surface hover:border hover:border-border-subtle'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={handlePageNext}
                disabled={currentPage === 3}
                className="p-2 rounded hover:bg-surface border border-transparent hover:border-border-subtle transition-all text-text-muted"
              >
                <Icon name="chevron_right" size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            icon="group"
            iconBg="bg-primary/10"
            iconColor="text-primary"
            label="Total Registered"
            value="1,248"
            trend="+12%"
          />
          <MetricCard
            icon="event_busy"
            iconBg="bg-accent-warning/10"
            iconColor="text-yellow-700"
            label="At Capacity"
            value="3"
            subValue="Events"
          />
          <MetricCard
            icon="update"
            iconBg="bg-text-main/5"
            iconColor="text-text-main"
            label="Next Update"
            value="In 14 hrs"
            subValue="Auto-sync"
          />
        </div>
      </div>
    </PublicLayout>
  );
};

export default EventsPage;

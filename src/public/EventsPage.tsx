import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PublicLayout } from './layouts';
import Icon from '../components/common/Icon';
import eventService, { EventTimeFilter, SpecialEvent } from '../services/event.service';

const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<EventTimeFilter>('upcoming');
  const [selectedEvent, setSelectedEvent] = useState<SpecialEvent | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await eventService.getPublicEvents({ time: timeFilter });
      setEvents(response.results || []);
    } catch {
      setError('Unable to load events right now. Please try again shortly.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const nextEvent = useMemo(() => {
    if (events.length === 0) {
      return null;
    }
    return events[0];
  }, [events]);

  const formatStart = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      day: date.toLocaleDateString(undefined, { weekday: 'long' }),
      time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const selectedEventSchedule = useMemo(() => {
    if (!selectedEvent) {
      return null;
    }
    return formatStart(selectedEvent.start_datetime);
  }, [selectedEvent]);

  return (
    <PublicLayout currentPage="events">
      <div className="w-full max-w-[1200px] mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2 py-1 bg-surface border border-border-subtle rounded-sm mb-2">
                <span className="size-2 rounded-full bg-accent-success"></span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted font-bold">Live Data</span>
              </div>
              <h2 className="font-display text-4xl md:text-5xl font-extrabold text-text-main tracking-tight leading-[1.1]">
                Special Programs
              </h2>
              <p className="text-text-muted text-base max-w-2xl leading-relaxed">
                Discover upcoming ceremonies, outreach programs, and major gatherings. Weekly recurring flow is managed separately.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-surface p-1 rounded-md border border-border-subtle shadow-sm">
              {[
                { key: 'upcoming', label: 'Upcoming' },
                { key: 'past', label: 'Past' },
                { key: 'all', label: 'All' },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setTimeFilter(filter.key as EventTimeFilter)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    timeFilter === filter.key
                      ? 'text-text-main bg-background-light rounded border border-border-subtle shadow-sm'
                      : 'text-text-muted hover:bg-background-light rounded'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              <button
                onClick={loadEvents}
                className="size-7 flex items-center justify-center rounded transition-colors text-text-muted hover:text-primary hover:bg-background-light"
                title="Refresh"
              >
                <Icon name="refresh" size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg border border-border-subtle shadow-card overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-background-light border-b border-border-subtle items-center">
            <div className="col-span-2 font-mono text-xs font-bold text-text-muted uppercase tracking-wider">Date</div>
            <div className="col-span-4 font-mono text-xs font-bold text-text-muted uppercase tracking-wider">Event Name</div>
            <div className="col-span-2 font-mono text-xs font-bold text-text-muted uppercase tracking-wider">Location</div>
            <div className="col-span-2 font-mono text-xs font-bold text-text-muted uppercase tracking-wider">Time</div>
            <div className="col-span-2 font-mono text-xs font-bold text-text-muted uppercase tracking-wider text-right">Details</div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-text-muted">Loading events...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">{error}</div>
          ) : events.length === 0 ? (
            <div className="p-6 text-sm text-text-muted">No events found for this filter.</div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {events.map((event) => {
                const schedule = formatStart(event.start_datetime);
                return (
                  <div key={event.id} className="md:grid md:grid-cols-12 md:gap-4 p-6 md:px-6 md:py-5 items-center hover:bg-background-light/50 transition-colors duration-200">
                    <div className="col-span-2 mb-3 md:mb-0">
                      <div className="font-display font-bold text-text-main text-base leading-none">{schedule.date}</div>
                      <div className="font-mono text-xs text-text-muted mt-1">{schedule.day}</div>
                    </div>
                    <div className="col-span-4 mb-3 md:mb-0">
                      <div className="flex items-start gap-3">
                        <div className="size-11 rounded border border-border-subtle overflow-hidden bg-background-light shrink-0">
                          {event.banner_image ? (
                            <img
                              src={event.banner_image}
                              alt={`${event.title} banner`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-muted">
                              <Icon name="image" size={16} />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-sm text-text-main">{event.title}</h3>
                          <p className="text-sm text-text-muted mt-0.5 line-clamp-2">{event.description || 'No description provided yet.'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 mb-3 md:mb-0 text-sm font-medium text-text-muted">
                      {event.location}
                    </div>
                    <div className="col-span-2 mb-3 md:mb-0 text-sm text-text-main">
                      {schedule.time}
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="w-full md:w-auto px-4 py-2 border border-border-subtle text-text-main font-bold text-sm rounded hover:bg-text-main hover:text-white hover:border-text-main transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                      >
                        View Details
                        <Icon name="open_in_new" size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface p-5 rounded border border-border-subtle shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-primary/10 rounded text-primary">
                <Icon name="event" size={20} />
              </div>
              <span className="font-mono text-xs font-bold uppercase text-text-muted">Visible Events</span>
            </div>
            <div className="font-display text-2xl font-bold text-text-main">{events.length}</div>
          </div>
          <div className="bg-surface p-5 rounded border border-border-subtle shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-text-main/5 rounded text-text-main">
                <Icon name="schedule" size={20} />
              </div>
              <span className="font-mono text-xs font-bold uppercase text-text-muted">Current Filter</span>
            </div>
            <div className="font-display text-2xl font-bold text-text-main capitalize">{timeFilter}</div>
          </div>
          <div className="bg-surface p-5 rounded border border-border-subtle shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-accent-success/10 rounded text-accent-success">
                <Icon name="flag" size={20} />
              </div>
              <span className="font-mono text-xs font-bold uppercase text-text-muted">Next Event</span>
            </div>
            <div className="font-display text-lg font-bold text-text-main line-clamp-2">
              {nextEvent ? nextEvent.title : 'No upcoming event'}
            </div>
          </div>
        </div>
      </div>

      {selectedEvent && selectedEventSchedule && (
        <div className="fixed inset-0 z-50 bg-black/55 p-4 md:p-8 overflow-y-auto" onClick={() => setSelectedEvent(null)}>
          <div
            className="max-w-3xl mx-auto bg-surface rounded-xl border border-border-subtle shadow-card overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative h-52 md:h-72 bg-background-light">
              {selectedEvent.banner_image ? (
                <img
                  src={selectedEvent.banner_image}
                  alt={`${selectedEvent.title} banner`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted">
                  <div className="flex items-center gap-2">
                    <Icon name="image" size={20} />
                    <span className="text-sm">No event banner uploaded</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-3 right-3 inline-flex items-center justify-center size-9 rounded-full bg-black/55 text-white hover:bg-black/70"
                aria-label="Close details"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <h3 className="font-display text-2xl font-bold text-text-main">{selectedEvent.title}</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded border border-border-subtle bg-background-light p-3">
                  <div className="font-mono text-xs uppercase text-text-muted">Date</div>
                  <div className="font-semibold text-text-main mt-1">{selectedEventSchedule.date}</div>
                  <div className="text-text-muted">{selectedEventSchedule.day}</div>
                </div>
                <div className="rounded border border-border-subtle bg-background-light p-3">
                  <div className="font-mono text-xs uppercase text-text-muted">Time</div>
                  <div className="font-semibold text-text-main mt-1">{selectedEventSchedule.time}</div>
                </div>
                <div className="rounded border border-border-subtle bg-background-light p-3">
                  <div className="font-mono text-xs uppercase text-text-muted">Location</div>
                  <div className="font-semibold text-text-main mt-1">{selectedEvent.location}</div>
                </div>
              </div>

              <div>
                <div className="font-mono text-xs uppercase text-text-muted mb-1">Description</div>
                <p className="text-text-main leading-relaxed">
                  {selectedEvent.description || 'No description provided yet.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
};

export default EventsPage;

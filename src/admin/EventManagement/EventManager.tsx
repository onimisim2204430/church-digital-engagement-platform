import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Icon from '../../components/common/Icon';
import { useToast } from '../../contexts/ToastContext';
import eventService, { EventStatus, SpecialEvent } from '../../services/event.service';

type StatusFilter = 'ALL' | EventStatus;

interface EventFormState {
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  status: EventStatus;
  banner_file: File | null;
}

const initialForm: EventFormState = {
  title: '',
  description: '',
  start_datetime: '',
  end_datetime: '',
  location: '',
  status: 'DRAFT',
  banner_file: null,
};

const toLocalDateTime = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString();
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string' && data.trim()) {
      return data;
    }
    if (data && typeof data === 'object') {
      const firstEntry = Object.entries(data as Record<string, unknown>)[0];
      if (!firstEntry) return fallback;
      const [field, message] = firstEntry;
      if (Array.isArray(message) && message.length > 0) {
        return `${field}: ${String(message[0])}`;
      }
      if (typeof message === 'string') {
        return `${field}: ${message}`;
      }
    }
  }
  return fallback;
};

const EventManager: React.FC = () => {
  const { success: showSuccess, error: showError } = useToast();
  const [events, setEvents] = useState<SpecialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(initialForm);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await eventService.getAdminEvents({ status: statusFilter });
      setEvents(response.results || []);
    } catch (error) {
      showError(getErrorMessage(error, 'Failed to load events'));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [showError, statusFilter]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingEventId(null);
  };

  const updateField = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const eventStats = useMemo(() => {
    const published = events.filter((item) => item.status === 'PUBLISHED').length;
    const draft = events.filter((item) => item.status === 'DRAFT').length;
    return { published, draft, total: events.length };
  }, [events]);

  const startEdit = (event: SpecialEvent) => {
    setEditingEventId(event.id);
    setForm({
      title: event.title,
      description: event.description,
      start_datetime: toLocalDateTime(event.start_datetime),
      end_datetime: toLocalDateTime(event.end_datetime),
      location: event.location,
      status: event.status,
      banner_file: null,
    });
  };

  const createPayload = (): FormData => {
    const payload = new FormData();
    payload.append('title', form.title.trim());
    payload.append('description', form.description.trim());
    payload.append('start_datetime', form.start_datetime);
    payload.append('location', form.location.trim());
    payload.append('status', form.status);
    if (form.end_datetime) {
      payload.append('end_datetime', form.end_datetime);
    }
    if (form.banner_file) {
      payload.append('banner_image', form.banner_file);
    }
    return payload;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.start_datetime || !form.location.trim()) {
      showError('Title, start date/time, and location are required.');
      return;
    }

    try {
      setSaving(true);
      const payload = createPayload();

      if (editingEventId) {
        await eventService.updateAdminEvent(editingEventId, payload);
        showSuccess('Event updated successfully');
      } else {
        await eventService.createAdminEvent(payload);
        showSuccess('Event created successfully');
      }

      resetForm();
      await loadEvents();
    } catch (error) {
      showError(getErrorMessage(error, 'Could not save event'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    const confirmed = window.confirm('Delete this event? It will be removed from active lists.');
    if (!confirmed) return;

    try {
      await eventService.deleteAdminEvent(eventId);
      showSuccess('Event deleted');
      if (editingEventId === eventId) {
        resetForm();
      }
      await loadEvents();
    } catch (error) {
      showError(getErrorMessage(error, 'Could not delete event'));
    }
  };

  const toggleStatus = async (item: SpecialEvent) => {
    try {
      const payload = new FormData();
      payload.append('status', item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED');
      await eventService.updateAdminEvent(item.id, payload);
      showSuccess(item.status === 'PUBLISHED' ? 'Event moved to draft' : 'Event published');
      await loadEvents();
    } catch (error) {
      showError(getErrorMessage(error, 'Could not update event status'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Special Events</h1>
          <p className="text-sm text-slate-600 mt-1">Manage one-time programs, ceremonies, and special gatherings.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
          <div className="rounded border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500 uppercase">Total</p>
            <p className="text-xl font-semibold text-slate-900">{eventStats.total}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500 uppercase">Published</p>
            <p className="text-xl font-semibold text-emerald-700">{eventStats.published}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500 uppercase">Draft</p>
            <p className="text-xl font-semibold text-amber-700">{eventStats.draft}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <form onSubmit={handleSubmit} className="xl:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{editingEventId ? 'Edit Event' : 'Create Event'}</h2>
            {editingEventId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Cancel edit
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm min-h-24"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Start</label>
              <input
                type="datetime-local"
                value={form.start_datetime}
                onChange={(e) => updateField('start_datetime', e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">End</label>
              <input
                type="datetime-local"
                value={form.end_datetime}
                onChange={(e) => updateField('end_datetime', e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-700 mb-1">Location</label>
            <input
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value as EventStatus)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-700 mb-1">Banner Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => updateField('banner_file', e.target.files?.[0] || null)}
                className="w-full text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Icon name={saving ? 'hourglass_top' : 'save'} size={18} />
            {saving ? 'Saving...' : editingEventId ? 'Update Event' : 'Create Event'}
          </button>
        </form>

        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Events List</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-600">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">No events found for this filter.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {events.map((item) => (
                <div key={item.id} className="p-5 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <p className="text-sm text-slate-600">{item.location}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="text-sm text-slate-600">
                    <p>Starts: {formatDateTime(item.start_datetime)}</p>
                    {item.end_datetime && <p>Ends: {formatDateTime(item.end_datetime)}</p>}
                  </div>

                  {item.description && <p className="text-sm text-slate-700">{item.description}</p>}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                    >
                      <Icon name="edit" size={16} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStatus(item)}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
                    >
                      <Icon name="sync" size={16} />
                      {item.status === 'PUBLISHED' ? 'Move to Draft' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex items-center gap-1 rounded border border-rose-300 text-rose-700 px-3 py-1.5 text-sm hover:bg-rose-50"
                    >
                      <Icon name="delete" size={16} /> Delete
                    </button>
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

export default EventManager;

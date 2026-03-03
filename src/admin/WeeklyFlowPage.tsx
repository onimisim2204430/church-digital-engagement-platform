/**
 * WeeklyFlowPage - Admin interface for managing weekly events
 * Simple CRUD for recurring weekly gathering schedule
 */
import React, { useEffect, useState, useCallback } from 'react';
import { weeklyFlowService, type WeeklyEvent } from '../services/weeklyFlow.service';
import Icon from '../components/common/Icon';
import './WeeklyFlowPage.css';

const WeeklyFlowPage: React.FC = () => {
  const [events, setEvents] = useState<WeeklyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<WeeklyEvent>>({});

  // Load events on mount
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await weeklyFlowService.getAll();
      // Sort by day of week
      data.sort((a: WeeklyEvent, b: WeeklyEvent) => a.day_of_week - b.day_of_week);
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
      console.error('Load events error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleEdit = (event: WeeklyEvent) => {
    setEditingId(event.id);
    setFormData({ ...event });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({});
  };

  const handleChange = (field: keyof WeeklyEvent, value: string | number) => {
    setFormData((prev: Partial<WeeklyEvent>) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setError(null);
      if (!editingId) return;

      await weeklyFlowService.update(editingId, formData);
      
      // Update local state
      setEvents(prev =>
        prev.map(e => e.id === editingId ? { ...e, ...formData } : e)
      );
      
      setEditingId(null);
      setFormData({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
      console.error('Save error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this event?')) return;

    try {
      setError(null);
      await weeklyFlowService.delete(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      weeklyFlowService.clearCache();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
      console.error('Delete error:', err);
    }
  };

  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (loading) {
    return (
      <div className="weekly-flow-page">
        <div className="loading-skeleton">
          <div className="skeleton-header" />
          {[...Array(7)].map((_, i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="weekly-flow-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Weekly Flow Events</h1>
          <p className="page-description">
            Manage the recurring weekly gatherings and events displayed on the public homepage.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-alert">
          <Icon name="error" size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="close-btn">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <div className="events-grid">
        {events.map((event) => (
          <div key={event.id} className="event-card">
            {editingId === event.id ? (
              // Edit mode
              <div className="event-edit-form">
                <div className="form-group">
                  <label>Day of Week</label>
                  <select
                    value={formData.day_of_week || event.day_of_week}
                    onChange={(e) =>
                      handleChange('day_of_week', parseInt(e.target.value))
                    }
                    disabled
                    className="form-input"
                  >
                    {dayLabels.map((label, idx) => (
                      <option key={idx} value={idx}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Event Title</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="e.g., Morning Prayer"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="text"
                    value={formData.time || ''}
                    onChange={(e) => handleChange('time', e.target.value)}
                    placeholder="e.g., 8:00 AM"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Optional description"
                    className="form-input form-textarea"
                    rows={3}
                  />
                </div>

                <div className="form-actions">
                  <button onClick={handleSave} className="btn btn-primary">
                    <Icon name="save" size={14} /> Save
                  </button>
                  <button onClick={handleCancel} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <div className="event-view">
                <div className="event-header">
                  <div className="event-day-badge">{dayLabels[event.day_of_week]}</div>
                  <div className="event-actions">
                    <button
                      onClick={() => handleEdit(event)}
                      className="icon-btn edit-btn"
                      title="Edit"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="icon-btn delete-btn"
                      title="Delete"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </div>

                <h3 className="event-title">{event.title}</h3>
                <p className="event-time">
                  <Icon name="schedule" size={14} /> {event.time}
                </p>

                {event.description && (
                  <p className="event-description">{event.description}</p>
                )}

                {event.linked_post_title && (
                  <div className="linked-post">
                    <Icon name="link" size={12} />
                    <span>Linked to: {event.linked_post_title}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyFlowPage;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../../../components/common/Icon';
import seriesService, {
  type CurrentSeriesSpotlightUpdateData,
  type Series,
} from '../../../services/series.service';

const defaultFormState: CurrentSeriesSpotlightUpdateData = {
  series_id: null,
  section_label: 'Current Series',
  latest_part_number: 4,
  latest_part_status: 'AVAILABLE',
  description_override: '',
  cta_label: 'View Series Collection',
  is_active: true,
};

const FieldLabel: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <div className="mb-1.5">
    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{children}</span>
    {hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}
  </div>
);

const inputClass =
  'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition disabled:opacity-50';

const CurrentSpotlightTab: React.FC = () => {
  const [series, setSeries] = useState<Series[]>([]);
  const [formData, setFormData] = useState<CurrentSeriesSpotlightUpdateData>(defaultFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedSeries = useMemo(
    () => series.find((item) => item.id === formData.series_id) || null,
    [series, formData.series_id],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [seriesData, spotlight] = await Promise.all([
        seriesService.getAllSeries(),
        seriesService.getCurrentSeriesSpotlightAdmin(),
      ]);
      setSeries(Array.isArray(seriesData) ? seriesData : []);
      setFormData({
        series_id: spotlight?.series?.id || null,
        section_label: spotlight?.section_label || defaultFormState.section_label,
        latest_part_number: spotlight?.latest_part_number || defaultFormState.latest_part_number,
        latest_part_status: spotlight?.latest_part_status || defaultFormState.latest_part_status,
        description_override: spotlight?.description_override || '',
        cta_label: spotlight?.cta_label || defaultFormState.cta_label,
        is_active: spotlight?.is_active ?? true,
      });
    } catch (err) {
      console.error('Failed to load current spotlight data', err);
      setError('Could not load current spotlight settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setField = <K extends keyof CurrentSeriesSpotlightUpdateData>(
    field: K,
    value: CurrentSeriesSpotlightUpdateData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveSettings = async () => {
    if (!formData.series_id) {
      window.alert('Select one series to spotlight.');
      return;
    }
    if (!formData.latest_part_number || formData.latest_part_number < 1) {
      window.alert('Part number must be 1 or greater.');
      return;
    }
    try {
      setSaving(true);
      await seriesService.saveCurrentSeriesSpotlight(formData);
      window.alert('Current Series spotlight updated.');
      await loadData();
    } catch (err: any) {
      console.error('Failed to save current spotlight', err?.response?.data || err);
      const detail = err?.response?.data?.detail;
      window.alert(typeof detail === 'string' && detail.length > 0 ? detail : 'Could not save spotlight settings.');
    } finally {
      setSaving(false);
    }
  };

  const statusLabel =
    formData.latest_part_status === 'COMING_SOON' ? 'Coming Soon' : 'Available';

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Current Series Spotlight</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure the series and episode shown prominently on the public homepage.
          </p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shrink-0"
        >
          <Icon name="backup" size={16} />
          {saving ? 'Saving…' : 'Save Spotlight'}
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 flex items-center justify-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-sm text-slate-500">Loading settings…</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-6 flex items-center gap-3">
          <Icon name="error_outline" size={20} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Form panel */}
          <div className="xl:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Spotlight Configuration</h3>
            </div>
            <div className="p-6 space-y-5">

              {/* Series selector */}
              <div>
                <FieldLabel>Series to Spotlight</FieldLabel>
                <select
                  value={formData.series_id || ''}
                  onChange={(e) => setField('series_id', e.target.value || null)}
                  className={inputClass}
                  disabled={saving}
                >
                  <option value="">— Select a series —</option>
                  {series.map((item) => (
                    <option key={item.id} value={item.id}>{item.title}</option>
                  ))}
                </select>
              </div>

              {/* Row: label + part + status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel>Section Label</FieldLabel>
                  <input
                    type="text"
                    value={formData.section_label || ''}
                    onChange={(e) => setField('section_label', e.target.value)}
                    className={inputClass}
                    disabled={saving}
                  />
                </div>
                <div>
                  <FieldLabel>Part Number</FieldLabel>
                  <input
                    type="number"
                    min={1}
                    value={formData.latest_part_number ?? 1}
                    onChange={(e) => setField('latest_part_number', Number(e.target.value) || 1)}
                    className={inputClass}
                    disabled={saving}
                  />
                </div>
                <div>
                  <FieldLabel>Availability</FieldLabel>
                  <select
                    value={formData.latest_part_status || 'AVAILABLE'}
                    onChange={(e) => setField('latest_part_status', e.target.value as 'AVAILABLE' | 'COMING_SOON')}
                    className={inputClass}
                    disabled={saving}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="COMING_SOON">Coming Soon</option>
                  </select>
                </div>
              </div>

              {/* CTA label */}
              <div>
                <FieldLabel>Button Label</FieldLabel>
                <input
                  type="text"
                  value={formData.cta_label || ''}
                  onChange={(e) => setField('cta_label', e.target.value)}
                  className={inputClass}
                  disabled={saving}
                />
              </div>

              {/* Description override */}
              <div>
                <FieldLabel hint="optional">Description Override</FieldLabel>
                <textarea
                  value={formData.description_override || ''}
                  onChange={(e) => setField('description_override', e.target.value)}
                  rows={4}
                  className={inputClass}
                  placeholder="Leave blank to use the series' own description"
                  disabled={saving}
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(formData.is_active)}
                  onClick={() => setField('is_active', !formData.is_active)}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    formData.is_active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${
                      formData.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  {formData.is_active ? 'Active — visible on public homepage' : 'Inactive — hidden from homepage'}
                </span>
              </div>
            </div>
          </div>

          {/* Preview panel */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Live Preview</h3>
              </div>
              <div className="p-5 space-y-4">
                {/* Simulated homepage card */}
                <div className="rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">
                    {formData.section_label || 'Current Series'}
                  </p>
                  <p className="font-bold text-base leading-snug mb-1">
                    {selectedSeries?.title || <span className="text-slate-500 font-normal italic">No series selected</span>}
                  </p>
                  {(formData.description_override || selectedSeries?.description) && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                      {formData.description_override || selectedSeries?.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      formData.latest_part_status === 'COMING_SOON'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${formData.latest_part_status === 'COMING_SOON' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      Part {formData.latest_part_number} · {statusLabel}
                    </span>
                  </div>
                  <button className="mt-3 w-full rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white text-center">
                    {formData.cta_label || 'View Series'}
                  </button>
                </div>

                {/* Status row */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Visibility</span>
                    <span className={`font-semibold ${formData.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {formData.is_active ? 'Public' : 'Hidden'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Series</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-right truncate max-w-[160px]">
                      {selectedSeries?.title || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrentSpotlightTab;
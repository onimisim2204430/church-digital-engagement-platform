/**
 * DetailsTab — Main form for creating/editing giving items
 * Memoized and lazy-loaded
 * NOTE: This component is INTENTIONALLY large (~400 lines) because it's the primary
 * edit interface. Breaking it further would create unnecessary prop drilling.
 */

import React, { memo } from 'react';
import Icon from '../../../components/common/Icon';
import SuggestedAmountsEditor from '../components/SuggestedAmountsEditor';
import { CATEGORY_OPTIONS, VISIBILITY_OPTIONS, STATUS_OPTIONS } from '../constants/giving.constants';
import {normalizeIconName } from '../helpers/giving.helpers';
import type { GivingItem, CreateGivingItemRequest } from '../types/giving.types';

type GivingFormData = CreateGivingItemRequest;

interface DetailsTabProps {
  form: GivingFormData;
  isCreateMode: boolean;
  currentItem: GivingItem | null;
  saving: boolean;
  categoryHasGoal: boolean;
  supportedIcons: string[];
  readOnly?: boolean;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onFormUpdate: (updates: Partial<GivingFormData>) => void;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

const DetailsTab = memo<DetailsTabProps>(({
  form,
  isCreateMode,
  currentItem,
  saving,
  categoryHasGoal,
  supportedIcons,
  readOnly = false,
  onFormChange,
  onFormUpdate,
  onSave,
  onDiscard,
  onCancel,
}) => (
  <div className="flex flex-col lg:flex-row gap-5 items-start">
    {/* Left: Main form */}
    <div className="flex-1 min-w-0 flex flex-col gap-5">
      {/* Core details card */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
          <Icon name="info" size={18} className="text-primary/70" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Core Details</h3>
        </div>
        <div className="px-6 py-6 space-y-6">
          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Category <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CATEGORY_OPTIONS.map(cat => {
                const isActive = form.category === cat.value;
                return (
                  <label key={cat.value} className={`flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-all ${isActive ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                    <input type="radio" name="category" value={cat.value} checked={isActive} onChange={onFormChange} disabled={readOnly} className="sr-only" />
                    <div className="flex items-center gap-2">
                      <Icon name={normalizeIconName(supportedIcons, cat.icon)} size={16} className={isActive ? 'text-primary' : 'text-slate-400'} />
                      <span className={`text-xs font-bold ${isActive ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{cat.label}</span>
                      {isActive && <Icon name="check_circle" size={14} className="text-primary ml-auto" />}
                    </div>
                    <span className="text-[10px] text-slate-400">{cat.desc}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={onFormChange}
              disabled={readOnly}
              placeholder="e.g., Weekly Tithe, New Sanctuary Build..."
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg text-base font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-slate-900 transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
              autoFocus={isCreateMode}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={onFormChange}
              disabled={readOnly}
              placeholder="Explain what this giving item supports and why it matters..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-slate-900 resize-none transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">Shown as the card description on the public Giving page</p>
          </div>

          {/* Scripture verse */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Scripture Verse <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              name="verse"
              value={form.verse}
              onChange={onFormChange}
              disabled={readOnly}
              placeholder={`"Bring the full tithe into the storehouse." — Malachi 3:10`}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 italic focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-slate-900 transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">Displayed below the description as an italic pullquote — for Tithe/Offerings only</p>
          </div>
        </div>
      </div>

      {/* Financial settings card */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
          <Icon name="payments" size={18} className="text-primary/70" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Financial Settings</h3>
        </div>
        <div className="px-6 py-6 space-y-6">
          {/* Suggested amounts */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Suggested Amounts</label>
            <SuggestedAmountsEditor
              amounts={form.suggested_amounts || []}
              onChange={amounts => !readOnly && onFormUpdate({ suggested_amounts: amounts })}
              disabled={readOnly}
            />
            <p className="text-xs text-slate-400 mt-2">Quick-select buttons shown in the giving modal</p>
          </div>

          {/* Goal + deadline — only for Projects / Fundraising */}
          {categoryHasGoal && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100 dark:border-slate-700">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Fundraising Goal (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    name="goal_amount"
                    value={form.goal_amount ?? ''}
                    onChange={onFormChange}
                    disabled={readOnly}
                    placeholder="e.g., 250000"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-slate-900 transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Leave empty for open-ended items</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Deadline</label>
                <input
                  type="date"
                  name="deadline"
                  value={form.deadline || ''}
                  onChange={onFormChange}
                  disabled={readOnly}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-slate-900 transition-colors disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-slate-400 mt-1">Shown as "Goal: [date]" on the card</p>
              </div>
            </div>
          )}

          {/* Recurring toggle */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Enable Recurring Giving</p>
              <p className="text-xs text-slate-400 mt-0.5">Shows a "Set Up Recurring" button on this item's giving modal</p>
            </div>
            <label className="relative flex-shrink-0 cursor-pointer">
              <input
                type="checkbox"
                name="is_recurring_enabled"
                checked={form.is_recurring_enabled}
                onChange={onFormChange}
                disabled={readOnly}
                className="sr-only peer disabled:cursor-not-allowed"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer-checked:bg-primary transition-colors" />
              <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </label>
          </div>
        </div>
      </div>
    </div>

    {/* Right: Settings sidebar */}
    <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
      {/* Status */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
          <Icon name="circle" size={18} className="text-primary/70" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Status</h3>
            <p className="text-xs text-slate-400">Controls card visibility &amp; state</p>
          </div>
        </div>
        <div className="px-5 py-4 flex flex-col gap-2">
          {STATUS_OPTIONS.map(s => {
            const isActive = form.status === s.value;
            return (
              <label key={s.value} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${isActive ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                <input type="radio" name="status" value={s.value} checked={isActive} onChange={onFormChange} disabled={readOnly} className="sr-only" />
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span className={`text-sm font-semibold flex-1 ${isActive ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{s.label}</span>
                {isActive && <Icon name="check" size={14} className="text-primary" />}
              </label>
            );
          })}
        </div>
      </div>

      {/* Visibility */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
          <Icon name="lock_open" size={18} className="text-primary/70" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Visibility</h3>
            <p className="text-xs text-slate-400">Who can see this item</p>
          </div>
        </div>
        <div className="px-5 py-4 flex flex-col gap-2">
          {VISIBILITY_OPTIONS.map(v => {
            const isActive = form.visibility === v.value;
            return (
              <label key={v.value} className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${readOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${isActive ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                <input type="radio" name="visibility" value={v.value} checked={isActive} onChange={onFormChange} disabled={readOnly} className="sr-only" />
                <Icon name={normalizeIconName(supportedIcons, v.icon)} size={16} className={`mt-0.5 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${isActive ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{v.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{v.desc}</p>
                </div>
                {isActive && <Icon name="check_circle" size={14} className="text-primary flex-shrink-0" />}
              </label>
            );
          })}
        </div>
      </div>

      {/* Featured + Display Order */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
          <Icon name="star" size={18} className="text-amber-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Featured &amp; Order</h3>
          </div>
        </div>
        <div className="px-5 py-4 flex flex-col gap-4">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Feature this item</p>
              <p className="text-xs text-slate-400 mt-0.5">Spans 2 columns with larger layout</p>
            </div>
            <label className="relative flex-shrink-0 cursor-pointer">
              <input type="checkbox" name="is_featured" checked={form.is_featured} onChange={onFormChange} disabled={readOnly} className="sr-only peer disabled:cursor-not-allowed" />
              <div className={`w-11 h-6 rounded-full transition-colors ${readOnly ? 'bg-slate-200 dark:bg-slate-600 cursor-not-allowed' : 'bg-slate-200 dark:bg-slate-600 peer-checked:bg-primary'}`} />
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${readOnly ? '' : 'peer-checked:translate-x-5'}`} />
            </label>
          </label>
          <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Display Order</label>
            <input
              type="number"
              name="display_order"
              value={form.display_order}
              onChange={onFormChange}
              disabled={readOnly}
              min={1}
              max={999}
              className="w-20 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-center font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50 dark:bg-slate-900 transition-colors disabled:bg-slate-100 dark:disabled:bg-slate-900/50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">Lower = appears earlier on the page</p>
          </div>
        </div>
      </div>

      {/* Save / Discard */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col gap-3">
        {!readOnly ? (
          <>
            <button
              onClick={onSave}
              disabled={saving || !form.title.trim()}
              className="w-full px-5 py-3 rounded-lg bg-primary text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition-all"
            >
              <Icon name={saving ? 'hourglass_empty' : isCreateMode ? 'add' : 'check'} size={16} />
              {saving ? 'Saving...' : isCreateMode ? 'Create Item' : 'Save Changes'}
            </button>
            {!isCreateMode ? (
              <button
                onClick={onDiscard}
                disabled={saving}
                className="w-full px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50"
              >
                Discard Changes
              </button>
            ) : (
              <button
                onClick={onCancel}
                disabled={saving}
                className="w-full px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Cancel
              </button>
            )}
          </>
        ) : (
          <button
            onClick={onCancel}
            className="w-full px-5 py-3 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    </div>
  </div>
));

DetailsTab.displayName = 'DetailsTab';

export default DetailsTab;

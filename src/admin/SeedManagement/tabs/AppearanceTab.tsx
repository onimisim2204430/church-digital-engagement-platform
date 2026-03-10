/**
 * AppearanceTab — Icon picker and cover image uploader
 * Memoized and lazy-loaded
 */

import React, { memo } from 'react';
import Icon from '../../../components/common/Icon';
import { AVAILABLE_ICONS } from '../constants/giving.constants';
import { normalizeIconName } from '../helpers/giving.helpers';
import type { CreateGivingItemRequest } from '../types/giving.types';

type GivingFormData = CreateGivingItemRequest;

interface AppearanceTabProps {
  form: GivingFormData;
  supportedIcons: string[];
  onFormUpdate: (updates: Partial<GivingFormData>) => void;
}

const AppearanceTab = memo<AppearanceTabProps>(({ form, supportedIcons, onFormUpdate }) => (
  <div className="flex flex-col lg:flex-row gap-5 items-start">
    <div className="flex-1 flex flex-col gap-5">
      {/* Icon picker */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
          <Icon name="palette" size={18} className="text-primary/70" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Card Icon</h3>
        </div>
        <div className="px-6 py-6">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Select the icon displayed on the giving card. This uses Material Symbols icons.</p>
          <div className="grid grid-cols-8 md:grid-cols-12 gap-2">
            {AVAILABLE_ICONS.map(iconName => (
              <button
                key={iconName}
                onClick={() => onFormUpdate({ icon: iconName })}
                title={iconName}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${form.icon === iconName ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-primary/10 hover:text-primary'}`}
              >
                <Icon name={normalizeIconName(supportedIcons, iconName)} size={20} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cover image */}
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
          <Icon name="image" size={18} className="text-primary/70" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Cover Image</h3>
        </div>
        <div className="px-6 py-6">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Used on featured cards or when a background image is needed. Recommended: 1280×720px.</p>
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 text-center hover:border-primary/30 transition-colors">
            {form.cover_image ? (
              <div className="space-y-3">
                <img src={form.cover_image} alt="Cover" className="w-full max-h-40 object-cover rounded-lg mx-auto" />
                <button
                  onClick={() => onFormUpdate({ cover_image: '' })}
                  className="text-xs text-red-500 font-semibold hover:underline"
                >
                  Remove image
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
                <Icon name="upload" size={36} />
                <p className="text-sm font-medium">Drop an image or paste a URL</p>
                <input
                  type="text"
                  placeholder="https://..."
                  value={form.cover_image}
                  onChange={e => onFormUpdate({ cover_image: e.target.value })}
                  className="mt-2 w-full max-w-md px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-xs text-slate-700 dark:text-slate-200 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary bg-white text-center"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Right: Live preview */}
    <div className="w-full lg:w-72 flex-shrink-0">
      <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden sticky top-0 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <Icon name="visibility" size={16} className="text-primary" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Card Preview</h3>
        </div>
        <div className="p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <Icon name={normalizeIconName(supportedIcons, form.icon)} size={22} className="text-primary" />
              </div>
              <span className="px-2 py-0.5 rounded-full bg-background-light border border-slate-200 text-slate-soft text-[9px] font-bold uppercase tracking-wider">
                {form.category}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-deep mb-1">{form.title || 'Item Title'}</p>
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{form.description || 'Item description will appear here...'}</p>
            {(form.suggested_amounts?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {(form.suggested_amounts || []).slice(0, 3).map((a: number) => (
                  <span key={a} className="text-[9px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">${a}</span>
                ))}
              </div>
            )}
            {form.goal_amount && (
              <div className="mt-3">
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full w-[65%]" />
                </div>
                <p className="text-[10px] text-primary font-bold mt-1">65% funded</p>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-soft uppercase tracking-wider">Give</span>
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <Icon name="arrow_forward" size={14} className="text-white" />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-soft dark:text-slate-400 text-center mt-3">Approximate preview — final appearance may vary</p>
        </div>
      </div>
    </div>
  </div>
));

AppearanceTab.displayName = 'AppearanceTab';

export default AppearanceTab;

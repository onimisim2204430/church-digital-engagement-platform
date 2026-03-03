/**
 * Admin Right Sidebar — Pastoral Priorities, Daily Word, Network Performance
 */

import React, { useState } from 'react';
import Icon from '../../components/common/Icon';

const AdminRightSidebar: React.FC = () => {
  const [dailyWord, setDailyWord] = useState('');

  return (
    <aside
      className="w-80 border-l border-border-light bg-white flex flex-col overflow-y-auto flex-shrink-0"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Pastoral Priorities */}
      <div className="p-4 space-y-4 border-b border-border-light">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Pastoral Priorities</h2>
        <div className="space-y-3">
          {/* Critical Flag */}
          <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Icon name="emergency" size={14} className=" text-rose-500" />
              <span className="text-xs font-bold text-rose-600 uppercase">Critical Flag</span>
            </div>
            <p className="text-xs font-bold text-slate-deep leading-snug">
              Urgent prayer request regarding hospital visit (John Thompson)
            </p>
            <button className="w-full rounded bg-rose-500 py-1.5 text-xs font-bold text-white uppercase hover:bg-rose-600 transition-colors">
              Notify Care Team
            </button>
          </div>

          {/* Community Question */}
          <div className="rounded-lg border border-border-light bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-soft uppercase">Community Question</span>
              <span className="text-xs text-slate-400 font-medium">4h ago</span>
            </div>
            <p className="text-xs font-medium text-slate-deep leading-relaxed">
              "How can I register my family for the Winter Retreat? The link seems broken."
            </p>
            <button className="text-xs font-bold text-primary uppercase hover:underline">
              Respond Now
            </button>
          </div>
        </div>
      </div>

      {/* Daily Word Editor */}
      <div className="p-4 space-y-4 border-b border-border-light">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-deep">App: Daily Word</h2>
          <span className="text-xs font-bold text-emerald-600 uppercase">Live Editor</span>
        </div>
        <div className="rounded-lg border border-border-light bg-slate-50 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="calendar_today" size={18} className=" text-slate-soft" />
            <span className="text-sm font-bold text-slate-deep">
              Today,{' '}
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <textarea
            className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 focus:outline-none placeholder:text-slate-400 text-slate-deep resize-none h-24 font-medium"
            placeholder="Enter today's encouragement..."
            value={dailyWord}
            onChange={(e) => setDailyWord(e.target.value)}
          />
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <div className="flex gap-2">
              <button className="text-slate-soft hover:text-primary transition-colors">
                <Icon name="image" size={14} />
              </button>
              <button className="text-slate-soft hover:text-primary transition-colors">
                <Icon name="link" size={14} />
              </button>
            </div>
            <button className="rounded-md bg-primary px-4 py-1.5 text-xs font-bold text-white uppercase hover:bg-primary/90 shadow-sm transition-colors">
              Publish
            </button>
          </div>
        </div>
      </div>

      {/* Network Performance */}
      <div className="mt-auto p-4 bg-slate-50/50 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-soft uppercase tracking-wide">Network Performance</p>
          <p className="text-xs font-mono text-emerald-600 font-bold">12ms Ping</p>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className="w-[24%] h-full bg-primary rounded-full"></div>
        </div>
        <div className="flex justify-between">
          <div className="text-center flex-1">
            <p className="text-xs font-bold text-slate-deep">8.2k</p>
            <p className="text-xs text-slate-soft uppercase font-semibold">Requests/m</p>
          </div>
          <div className="w-px bg-border-light"></div>
          <div className="text-center flex-1">
            <p className="text-xs font-bold text-slate-deep">0.02%</p>
            <p className="text-xs text-slate-soft uppercase font-semibold">Error Rate</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AdminRightSidebar;

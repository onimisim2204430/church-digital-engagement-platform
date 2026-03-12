/**
 * MapPanel — Community health regional distribution map
 * Memoized to prevent re-renders
 * REGION_DOTS extracted to module-level constant for zero-alloc renders
 */

import React, { memo, useState } from 'react';
import { REGIONS } from '../constants/dashboard.constants';

/**
 * Pre-rendered region dots — static constant, zero allocation on every render
 * NOTE: Any scroll listeners attached to this element must use { passive: true }
 * to avoid blocking the main thread during scroll.
 */
const REGION_DOTS = REGIONS.map((r, i) => (
  <div key={i} className="flex items-center gap-2">
    <div className={`size-2 rounded-full ${r.color} flex-shrink-0`} />
    <div>
      <p className="text-xs font-bold text-slate-deep dark:text-slate-100 leading-none">{r.region}</p>
      <p className="text-xs text-primary font-bold">{r.value}</p>
    </div>
  </div>
));

const MapPanel = memo(() => {
  const [mapView, setMapView] = useState<'regional' | 'global'>('global');
  return (
    <div className="xl:col-span-2 rounded-lg border border-border-light dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden flex flex-col h-[360px]">
      <div className="border-b border-border-light dark:border-slate-700 px-4 py-3 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/40 flex-shrink-0">
        <h2 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Community Health Map</h2>
        <div className="flex gap-2">
          {(['regional', 'global'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setMapView(v)}
              className={`rounded-md border px-3 py-1 text-xs font-bold uppercase transition-colors ${
                mapView === v ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-700 text-slate-soft dark:text-slate-400 border-border-light dark:border-slate-600 hover:border-primary'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 bg-sky-50/30 dark:bg-slate-900/50 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <span className="text-primary" style={{ fontSize: '300px' }}>public</span>
        </div>
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-4 p-6 pointer-events-none">
          {REGION_DOTS}
        </div>
        <div className="absolute top-4 left-4">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-border-light dark:border-slate-600 p-3 rounded-lg shadow-sm">
            <p className="text-xs text-slate-soft dark:text-slate-400 uppercase font-bold mb-1">High Activity Region</p>
            <p className="text-sm font-bold text-slate-deep dark:text-slate-200">North America</p>
            <p className="text-sm text-primary font-bold">2.4M Interactions</p>
          </div>
        </div>
      </div>
    </div>
  );
});

MapPanel.displayName = 'MapPanel';

export default MapPanel;

import React, { useMemo } from 'react';
import { groupFeaturesByCategory } from '../helpers/admin-settings.helpers';
import { FeatureToggle } from '../types/admin-settings.types';
import Toggle from '../components/Toggle';

interface FeaturesTabProps {
  features: FeatureToggle[];
  onToggleFeature: (key: string) => void;
}

const FeaturesTab: React.FC<FeaturesTabProps> = ({ features, onToggleFeature }) => {
  const groupedFeatures = useMemo(() => groupFeaturesByCategory(features), [features]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Feature Toggles</h2>
        <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/20">Save Changes</button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {Object.entries(groupedFeatures).map(([category, toggles]) => (
          <div key={category} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">{category}</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {toggles.map((feature) => (
                <div key={feature.key} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex-1 max-w-2xl">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-slate-900 dark:text-white">{feature.name}</p>
                      {feature.hasConfig && <button className="text-xs font-medium text-primary hover:underline">Configure</button>}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{feature.description}</p>
                  </div>
                  <Toggle enabled={feature.enabled} onChange={() => onToggleFeature(feature.key)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(FeaturesTab);

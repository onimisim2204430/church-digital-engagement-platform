import React from 'react';
import Toggle from '../components/Toggle';

const ModerationTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Moderation</h2>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="space-y-6">
          {[
            { label: 'Enable Moderation Queue', desc: 'Review content before publishing', enabled: true },
            { label: 'Auto-Approve Members', desc: "Members' content auto-approved", enabled: false },
            { label: 'Flag Threshold', desc: 'Flags before auto-hiding', input: true, value: 5 },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{item.label}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              {item.input ? (
                <input type="number" defaultValue={item.value} className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-center" />
              ) : (
                <Toggle enabled={item.enabled ?? false} onChange={() => {}} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ModerationTab);

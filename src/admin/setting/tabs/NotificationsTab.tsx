import React from 'react';
import Toggle from '../components/Toggle';

const NotificationsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Notifications</h2>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="space-y-4">
          {[
            { label: 'New User Registration', enabled: true },
            { label: 'Content Published', enabled: true },
            { label: 'New Comment', enabled: false },
            { label: 'Flagged Content', enabled: true },
            { label: 'Weekly Summary', enabled: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
              <Toggle enabled={item.enabled} onChange={() => {}} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(NotificationsTab);

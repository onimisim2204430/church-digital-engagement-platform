import React from 'react';
import { EMAIL_FIELDS } from '../constants/admin-settings.constants';

const EmailTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Email Configuration</h2>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="space-y-6">
          {EMAIL_FIELDS.map((field) => (
            <div key={field.label} className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 w-32">{field.label}</label>
              <input
                type={field.type}
                defaultValue={field.value}
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Test</button>
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(EmailTab);

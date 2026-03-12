import React from 'react';
import Icon from '../../../components/common/Icon';
import Toggle from '../components/Toggle';

const ApiTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">API & Keys</h2>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">REST API Enabled</p>
              <p className="text-xs text-slate-500">Enable API access for integrations</p>
            </div>
            <Toggle enabled={true} onChange={() => {}} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Rate Limiting</p>
              <p className="text-xs text-slate-500">Requests per minute</p>
            </div>
            <input type="number" defaultValue="60" className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-center" />
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4">API Keys</h4>
            <div className="space-y-3">
              {['Production Key', 'Development Key'].map((key) => (
                <div key={key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{key}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">••••••••••••••••</span>
                    <button className="text-primary">
                      <Icon name="visibility" size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ApiTab);

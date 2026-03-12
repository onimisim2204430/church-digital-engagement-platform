import React from 'react';
import Icon from '../../../components/common/Icon';
import { INTEGRATIONS } from '../constants/admin-settings.constants';

const IntegrationsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Service Integrations</h2>
        <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20">
          <Icon name="add" size={18} />
          Add Integration
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INTEGRATIONS.map((integration) => (
          <div
            key={integration.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 ${integration.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon name={integration.icon} size={24} className={integration.iconColor} />
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  integration.status === 'connected'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                    integration.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                ></span>
                {integration.status === 'connected' ? 'Connected' : 'Not Active'}
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{integration.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{integration.description}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              {integration.status === 'connected' ? (
                <>
                  <button className="text-xs font-semibold text-primary hover:underline">Configure</button>
                  <button className="text-xs font-semibold text-red-400 hover:text-red-500">Disconnect</button>
                </>
              ) : (
                <button className="text-xs font-semibold text-primary hover:underline">Connect Now</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(IntegrationsTab);

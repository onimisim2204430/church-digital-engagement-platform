import React from 'react';
import Icon from '../../../components/common/Icon';
import { AUDIT_LOGS, QUICK_ACTIONS } from '../constants/admin-settings.constants';
import { getActionColor, getActionIcon } from '../helpers/admin-settings.helpers';
import { SettingsTab } from '../types/admin-settings.types';
import StatCard from '../components/StatCard';

interface OverviewTabProps {
  onNavigateTab: (tab: SettingsTab) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ onNavigateTab }) => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon="people" label="Total Users" value="1,284" change="+12%" color="bg-blue-500" />
        <StatCard icon="description" label="Content Items" value="3,842" change="+8%" color="bg-emerald-500" />
        <StatCard icon="toggle_on" label="Active Features" value="14" change="+2" color="bg-purple-500" />
        <StatCard icon="security" label="Security Score" value="96%" color="bg-amber-500" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => onNavigateTab(action.tab)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Icon name={action.icon} size={24} className="text-primary" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity</h3>
          <button onClick={() => onNavigateTab('audit')} className="text-sm text-primary hover:underline">
            View All
          </button>
        </div>
        <div className="space-y-4">
          {AUDIT_LOGS.slice(0, 3).map((log) => (
            <div key={log.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className={`w-10 h-10 rounded-full ${getActionColor(log.action)} flex items-center justify-center`}>
                <Icon name={getActionIcon(log.action)} size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{log.description}</p>
                <p className="text-xs text-slate-500 mt-1">{log.user} • {new Date(log.timestamp).toLocaleString()}</p>
              </div>
              <span className="text-xs text-slate-400">{log.ip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(OverviewTab);

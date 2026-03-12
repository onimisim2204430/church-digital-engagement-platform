import React from 'react';
import Icon from '../../../components/common/Icon';
import ActionBadge from '../components/ActionBadge';
import { AUDIT_LOGS } from '../constants/admin-settings.constants';
import { getActionColor, getActionIcon } from '../helpers/admin-settings.helpers';

interface AuditTabProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
}

const AuditTab: React.FC<AuditTabProps> = ({ searchQuery, onSearchQueryChange }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Audit Logs</h2>
        <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/20">
          <Icon name="download" size={18} className="mr-1" />
          Export Logs
        </button>
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon name="search" size={20} />
        </span>
        <input
          type="text"
          placeholder="Search logs, users, or actions..."
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="space-y-8">
        {['Today', 'Yesterday'].map((day, index) => (
          <div key={day} className="relative">
            <div className="sticky top-0 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-lg mb-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{day}</h4>
            </div>
            <div className="space-y-3">
              {AUDIT_LOGS.slice(index * 2, index * 2 + 2).map((log) => (
                <div key={log.id} className="relative flex gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                  <div className={`w-10 h-10 rounded-full ${getActionColor(log.action)} flex items-center justify-center flex-shrink-0`}>
                    <Icon name={getActionIcon(log.action)} size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{log.description}</p>
                      <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ActionBadge action={log.action} />
                      <span className="text-xs text-slate-400">{log.user}</span>
                      <span className="text-xs text-slate-400">IP: {log.ip}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(AuditTab);

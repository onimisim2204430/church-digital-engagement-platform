import React from 'react';
import Icon from '../../../components/common/Icon';
import { BACKUP_EXPORT_OPTIONS } from '../constants/admin-settings.constants';
import Toggle from '../components/Toggle';

interface BackupTabProps {
  autoBackup: boolean;
  backupFrequency: string;
  retentionDays: number;
  onToggleAutoBackup: () => void;
  onChangeBackupFrequency: (value: string) => void;
  onChangeRetentionDays: (value: number) => void;
}

const BackupTab: React.FC<BackupTabProps> = ({
  autoBackup,
  backupFrequency,
  retentionDays,
  onToggleAutoBackup,
  onChangeBackupFrequency,
  onChangeRetentionDays,
}) => {
  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Backup & Export</h2>

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-primary">
            <Icon name="check_circle" size={24} />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Last backup completed successfully</p>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">100%</span>
            </div>
            <div className="w-full bg-blue-100 dark:bg-blue-900/30 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-full"></div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Today at 04:00 AM</p>
            <p className="text-[10px] text-blue-400">245.8 MB</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {BACKUP_EXPORT_OPTIONS.map((option) => (
          <div key={option.title} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group">
            <div className={`w-12 h-12 ${option.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <Icon name={option.icon} size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{option.title}</h3>
            <p className="text-sm text-slate-500 mb-6">{option.desc}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-400">{option.format}</span>
              <button className="text-sm font-semibold text-primary hover:text-blue-700 flex items-center gap-1">
                Start
                <Icon name="arrow_forward" size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">Scheduled Backups</h3>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Auto Backup</p>
                  <p className="text-xs text-slate-500">Enable daily automated snapshots</p>
                </div>
                <Toggle enabled={autoBackup} onChange={onToggleAutoBackup} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Backup Frequency</label>
                <select
                  value={backupFrequency}
                  onChange={(event) => onChangeBackupFrequency(event.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="daily">Daily at 04:00 AM</option>
                  <option value="weekly">Weekly on Sundays</option>
                  <option value="hourly">Every 12 Hours</option>
                </select>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Retention Period (Days)</label>
                <input
                  type="number"
                  value={retentionDays}
                  onChange={(event) => onChangeRetentionDays(parseInt(event.target.value || '0', 10))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-xs text-slate-400">Older backups will be deleted</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Storage Destination</label>
                <div className="flex gap-3">
                  <button className="flex-1 border-2 border-primary bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <Icon name="cloud" size={20} className="text-primary mx-auto mb-1 block" />
                    <span className="text-[10px] font-bold text-primary block">Cloud</span>
                  </button>
                  <button className="flex-1 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center">
                    <Icon name="storage" size={20} className="text-slate-400 mx-auto mb-1 block" />
                    <span className="text-[10px] font-bold text-slate-400 block">Local</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500">Operation</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500">Date & Time</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">Automatic Backup</td>
                <td className="px-6 py-4 text-sm text-slate-500">Oct 24 · 04:00 AM</td>
                <td className="px-6 py-4"><span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Success</span></td>
                <td className="px-6 py-4 text-right"><button className="text-primary hover:text-blue-700 text-sm font-semibold">Download</button></td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">Users Export</td>
                <td className="px-6 py-4 text-sm text-slate-500">Oct 23 · 02:15 PM</td>
                <td className="px-6 py-4"><span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Success</span></td>
                <td className="px-6 py-4 text-right"><button className="text-primary hover:text-blue-700 text-sm font-semibold">Download</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default React.memo(BackupTab);

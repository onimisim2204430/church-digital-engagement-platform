import React from 'react';
import Icon from '../../../components/common/Icon';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  change?: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, change, color }) => (
  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 ${color} bg-opacity-10 rounded-xl flex items-center justify-center`}>
        <Icon name={icon} size={24} className={color.replace('bg-', 'text-')} />
      </div>
      {change && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{change}</span>}
    </div>
    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{label}</p>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
  </div>
);

export default React.memo(StatCard);

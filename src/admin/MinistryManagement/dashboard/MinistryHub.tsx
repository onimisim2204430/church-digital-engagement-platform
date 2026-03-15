import React, { useState } from 'react';
import Icon from '../../../components/common/Icon';

interface KPICard {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  trend?: string;
}

interface MinistryItem {
  id: string;
  name: string;
  type: 'event' | 'volunteer' | 'campaign' | 'schedule';
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  date: string;
  participants: number;
  progress?: number;
}

const MinistryHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'volunteers' | 'campaigns'>('all');

  const kpis: KPICard[] = [
    { label: 'Upcoming Events', value: 12, subtitle: 'This month', icon: 'event', color: '#6366f1', trend: '+3' },
    { label: 'Active Volunteers', value: 42, subtitle: 'Registered', icon: 'group', color: '#ec4899', trend: '+8' },
    { label: 'Seed Campaigns', value: 5, subtitle: 'In progress', icon: 'favorite', color: '#f59e0b', trend: '+2' },
    { label: 'Weekly Schedules', value: 8, subtitle: 'Assigned', icon: 'calendar_today', color: '#10b981', trend: '+1' },
  ];

  const ministryItems: MinistryItem[] = [
    { id: '1', name: 'Easter Service Preparation', type: 'event', status: 'active', date: 'Mar 30, 2026', participants: 45, progress: 65 },
    { id: '2', name: 'Youth Volunteer Drive', type: 'volunteer', status: 'active', date: 'Mar 20, 2026', participants: 28, progress: 85 },
    { id: '3', name: 'Building Fund Campaign', type: 'campaign', status: 'active', date: 'Mar 14 - Apr 14', participants: 156, progress: 42 },
    { id: '4', name: 'Sunday Worship Schedule', type: 'schedule', status: 'completed', date: 'Mar 14, 2026', participants: 8, progress: 100 },
    { id: '5', name: 'Community Outreach Day', type: 'event', status: 'pending', date: 'Mar 28, 2026', participants: 15, progress: 30 },
    { id: '6', name: 'Prayer Warriors Initiative', type: 'campaign', status: 'active', date: 'Mar 1 - Dec 31', participants: 89, progress: 55 },
  ];

  const filteredItems = activeTab === 'all'
    ? ministryItems
    : ministryItems.filter(item => {
        if (activeTab === 'events') return item.type === 'event';
        if (activeTab === 'volunteers') return item.type === 'volunteer';
        if (activeTab === 'campaigns') return item.type === 'campaign';
        return false;
      });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'completed': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      case 'cancelled': return 'bg-slate-500/10 text-slate-600 border-slate-500/30';
      default: return 'bg-slate-500/10 text-slate-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'event': return 'event';
      case 'volunteer': return 'groups';
      case 'campaign': return 'campaign';
      case 'schedule': return 'schedule';
      default: return 'info';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'event': return 'text-indigo-600';
      case 'volunteer': return 'text-pink-600';
      case 'campaign': return 'text-amber-600';
      case 'schedule': return 'text-emerald-600';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{kpi.value}</p>
                {kpi.subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{kpi.subtitle}</p>
                )}
              </div>
              <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${kpi.color}15` }}>
                <Icon name={kpi.icon} size={22} style={{ color: kpi.color } as any} />
              </div>
            </div>
            {kpi.trend && (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{kpi.trend} this week</p>
            )}
          </div>
        ))}
      </div>

      {/* Main Management Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-6">
          {(['all', 'events', 'volunteers', 'campaigns'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'text-indigo-600 dark:text-indigo-400 border-indigo-500'
                  : 'text-slate-700 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              {tab === 'all' ? 'All Activities' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Management Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">Participants</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-2 text-sm font-medium ${getTypeColor(item.type)}`}>
                      <Icon name={getTypeIcon(item.type)} size={16} />
                      {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.participants}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden max-w-xs">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-8">{item.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">{item.date}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-medium">
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
            <Icon name="info" size={48} style={{ opacity: 0.3 } as any} />
            <p className="mt-2 text-sm">No activities found</p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">89%</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Volunteer Engagement</p>
            </div>
            <div className="p-3 rounded-lg bg-pink-500/10">
              <Icon name="trending_up" size={24} style={{ color: '#ec4899' } as any} />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">₦2.1M</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Seed Campaigns Raised</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10">
              <Icon name="attach_money" size={24} style={{ color: '#f59e0b' } as any} />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">24</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Events This Quarter</p>
            </div>
            <div className="p-3 rounded-lg bg-indigo-500/10">
              <Icon name="event_note" size={24} style={{ color: '#6366f1' } as any} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinistryHub;

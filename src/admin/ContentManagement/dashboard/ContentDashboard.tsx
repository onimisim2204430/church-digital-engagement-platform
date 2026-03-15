import React, { useState } from 'react';
import Icon from '../../../components/common/Icon';

interface KPICard {
  label: string;
  value: string | number;
  trend?: string;
  icon: string;
  color: string;
}

interface ContentItem {
  id: string;
  title: string;
  type: 'sermon' | 'article' | 'devotional' | 'announcement';
  status: 'draft' | 'scheduled' | 'published' | 'review';
  date: string;
  author: string;
}

const ContentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'drafts' | 'scheduled' | 'published'>('all');

  const kpis: KPICard[] = [
    { label: 'Total Posts', value: 148, icon: 'article', color: '#10b981', trend: '+12' },
    { label: 'Active Series', value: 8, icon: 'collections', color: '#3b82f6', trend: '+2' },
    { label: 'Pending Drafts', value: 23, icon: 'draft', color: '#f59e0b', trend: '+5' },
    { label: 'Scheduled Posts', value: 12, icon: 'schedule', color: '#8b5cf6', trend: '+3' },
  ];

  const contentItems: ContentItem[] = [
    { id: '1', title: 'Sunday Sermon - Week 11', type: 'sermon', status: 'published', date: 'Mar 14, 2026', author: 'Pastor John' },
    { id: '2', title: 'Weekly Devotional Reading', type: 'devotional', status: 'scheduled', date: 'Mar 15, 2026', author: 'Sarah M.' },
    { id: '3', title: 'Church Announcement', type: 'announcement', status: 'review', date: 'Mar 16, 2026', author: 'Admin' },
    { id: '4', title: 'Biblical Commentary Series', type: 'article', status: 'draft', date: 'Mar 17, 2026', author: 'James L.' },
    { id: '5', title: 'Easter Preparation Guide', type: 'article', status: 'published', date: 'Mar 13, 2026', author: 'Emma T.' },
    { id: '6', title: 'Prayer Request Portal Update', type: 'announcement', status: 'scheduled', date: 'Mar 15, 2026', author: 'Admin' },
  ];

  const filteredContent = activeTab === 'all' 
    ? contentItems 
    : contentItems.filter(item => item.status === activeTab);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'published': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      case 'scheduled': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'draft': return 'bg-slate-500/10 text-slate-600 border-slate-500/30';
      case 'review': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      default: return 'bg-slate-500/10 text-slate-600';
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'sermon': return 'text-purple-500';
      case 'article': return 'text-blue-500';
      case 'devotional': return 'text-pink-500';
      case 'announcement': return 'text-orange-500';
      default: return 'text-slate-500';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{kpi.value}</p>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${kpi.color}15` }}>
                <Icon name={kpi.icon} size={20} style={{ color: kpi.color } as any} />
              </div>
            </div>
            {kpi.trend && (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{kpi.trend} this week</p>
            )}
          </div>
        ))}
      </div>

      {/* Content List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-6">
          {(['all', 'drafts', 'scheduled', 'published'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500'
                  : 'text-slate-700 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Title</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Author</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Date</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredContent.map((item) => (
                <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${getTypeColor(item.type)}`}>
                      {getTypeLabel(item.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">{item.author}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400">{item.date}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredContent.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
            <Icon name="article" size={48} style={{ opacity: 0.3 } as any} />
            <p className="mt-2 text-sm">No content found</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">35</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Published this month</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">2.4K</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Total engagement</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 text-center">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">18.5%</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Growth rate</p>
        </div>
      </div>
    </div>
  );
};

export default ContentDashboard;

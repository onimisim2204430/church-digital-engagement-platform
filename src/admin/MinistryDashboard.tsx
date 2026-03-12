import React from 'react';

const stats = [
  { label: 'Upcoming Events',  value: '—' },
  { label: 'Volunteers',       value: '—' },
  { label: 'Seed Campaigns',   value: '—' },
  { label: 'Weekly Flow Items',value: '—' },
];

const MinistryDashboard: React.FC = () => (
  <div className="p-6 space-y-6">
    <div>
      <h1 className="text-xl font-bold text-slate-100">Ministry Dashboard</h1>
      <p className="text-sm text-slate-400 mt-1">Overview of events, volunteers, seed campaigns and weekly flow.</p>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(s => (
        <div key={s.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-500">{s.label}</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{s.value}</p>
        </div>
      ))}
    </div>
  </div>
);

export default MinistryDashboard;

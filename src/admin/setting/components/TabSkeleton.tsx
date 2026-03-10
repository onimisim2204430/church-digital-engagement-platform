import React from 'react';

const TabSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
    </div>
  );
};

export default React.memo(TabSkeleton);

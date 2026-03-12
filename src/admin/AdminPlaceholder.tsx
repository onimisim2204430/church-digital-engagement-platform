/**
 * AdminPlaceholder — temporary "Coming Soon" view for new admin sections
 */

import React from 'react';
import Icon from '../components/common/Icon';

interface AdminPlaceholderProps {
  title: string;
  icon: string;
  description?: string;
}

const AdminPlaceholder: React.FC<AdminPlaceholderProps> = ({
  title,
  icon,
  description = 'This section is under development and will be available soon.',
}) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-6">
    <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center">
      <Icon name={icon} size={48} className=" text-primary" />
    </div>
    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-slate-deep">{title}</h1>
      <p className="text-sm text-slate-soft max-w-sm">{description}</p>
    </div>
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
      <Icon name="construction" size={14} />
      Coming Soon
    </span>
  </div>
);

export default AdminPlaceholder;

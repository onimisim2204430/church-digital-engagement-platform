import React from 'react';
import { AuditLog } from '../types/admin-settings.types';

interface ActionBadgeProps {
  action: AuditLog['action'];
}

const ACTION_BADGE_COLORS: Record<AuditLog['action'], string> = {
  CREATE: 'bg-green-100 text-green-700 border-green-200',
  UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
  PUBLISH: 'bg-purple-100 text-purple-700 border-purple-200',
  SUSPEND: 'bg-orange-100 text-orange-700 border-orange-200',
  LOGIN: 'bg-slate-100 text-slate-700 border-slate-200',
};

const ActionBadge: React.FC<ActionBadgeProps> = ({ action }) => {
  return <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${ACTION_BADGE_COLORS[action]}`}>{action}</span>;
};

export default React.memo(ActionBadge);

import { AuditLog, FeatureToggle } from '../types/admin-settings.types';

export const getActionIcon = (action: AuditLog['action']) => {
  switch (action) {
    case 'CREATE':
      return 'add_circle';
    case 'UPDATE':
      return 'edit';
    case 'DELETE':
      return 'delete';
    case 'PUBLISH':
      return 'publish';
    case 'SUSPEND':
      return 'block';
    case 'LOGIN':
      return 'login';
    default:
      return 'circle';
  }
};

export const getActionColor = (action: AuditLog['action']) => {
  switch (action) {
    case 'CREATE':
      return 'bg-green-100 text-green-600';
    case 'UPDATE':
      return 'bg-blue-100 text-blue-600';
    case 'DELETE':
      return 'bg-red-100 text-red-600';
    case 'PUBLISH':
      return 'bg-purple-100 text-purple-600';
    case 'SUSPEND':
      return 'bg-orange-100 text-orange-600';
    case 'LOGIN':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

export const groupFeaturesByCategory = (features: FeatureToggle[]) =>
  features.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, FeatureToggle[]>);

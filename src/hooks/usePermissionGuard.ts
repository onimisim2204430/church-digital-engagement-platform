/**
 * usePermissionGuard.ts
 * 
 * Hook that validates a required permission and auto-redirects if revoked.
 * Used on protected routes to ensure user still has access.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface UsePermissionGuardOptions {
  /** Permission code to validate (e.g., "content.posts") */
  code: string;
  /** Path to redirect to if permission is denied (default: "/admin") */
  redirectTo?: string;
  /** Show toast notification on redirect (default: true) */
  showNotification?: boolean;
}

/**
 * Validates user has required permission and auto-redirects if revoked.
 * Call this at the top of any protected route component.
 * 
 * @example
 * const MyProtectedPage = () => {
 *   usePermissionGuard({ code: 'content.posts' });
 *   return <div>Page content...</div>;
 * };
 */
export const usePermissionGuard = (options: UsePermissionGuardOptions) => {
  const { code, redirectTo = '/admin', showNotification = true } = options;
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Helper: Check permission (supports wildcard patterns like 'fin.*')
  const checkPermission = (permCode: string): boolean => {
    if (permCode.endsWith('.*')) {
      // Wildcard pattern - check if user has ANY permission in that category
      const categoryMap: Record<string, string[]> = {
        'fin.*': ['fin.payments', 'fin.reports', 'fin.seed'],
        'content.*': ['content.posts', 'content.series', 'content.drafts', 'content.daily_word'],
        'schedule.*': ['schedule.weekly_flow', 'schedule.events', 'schedule.podcasting'],
        'community.*': ['community.moderation', 'community.groups', 'community.prayer', 'community.volunteers'],
        'outreach.*': ['outreach.email', 'analytics.reports'],
      };
      return categoryMap[permCode]?.some(p => hasPermission(p)) ?? false;
    }
    // Exact permission match
    return hasPermission(permCode);
  };

  useEffect(() => {
    // ADMIN always has access
    if (user?.role === 'ADMIN') {
      return;
    }

    // MODERATOR: check if permission exists
    if (user?.role === 'MODERATOR') {
      if (!checkPermission(code)) {
        console.warn(`[usePermissionGuard] Permission "${code}" revoked. Redirecting to ${redirectTo}`);
        if (showNotification) {
          // You can enhance this with a toast library later
          const msg = `Your access to this module has been revoked by an administrator.`;
          console.log(`[usePermissionGuard] ${msg}`);
        }
        navigate(redirectTo, { replace: true });
      }
    }
  }, [code, user?.role, hasPermission, navigate, redirectTo, showNotification]);
};

export default usePermissionGuard;

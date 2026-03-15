/**
 * PermissionGatedRoute
 *
 * Wraps an admin route so it is only accessible when the current user
 * holds a specific module permission code.
 *
 * Rules:
 * - ADMIN  → always allowed (bypasses all code checks)
 * - MODERATOR with the required code → allowed
 * - MODERATOR without the code → auto-redirects to dashboard
 * - Any other role → auto-redirects to dashboard
 *
 * Also includes real-time permission validation:
 * - When permissions are revoked, automatically reloads page
 * - Prevents users from working on pages they no longer have access to
 * - Triggers immediate permission sync on route entry (no wait)
 *
 * Usage:
 *   <PermissionGatedRoute code="content.posts">
 *     <ContentManager />
 *   </PermissionGatedRoute>
 */

import React, { useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '../../types/auth.types';
import { usePermissionGuard } from '../../hooks/usePermissionGuard';
import { syncPermissionsNow } from '../../services/permissionSyncService';
import { Card } from '../components/Card';

interface PermissionGatedRouteProps {
  /** 
   * The module permission code(s) required to access this route.
   * Can be a single code (e.g., 'content.posts') or wildcard pattern (e.g., 'fin.*' for any Finance permission)
   */
  code: string;
  children: React.ReactNode;
}

const PermissionGatedRoute: React.FC<PermissionGatedRouteProps> = ({ code, children }) => {
  const { user, hasPermission } = useAuth();

  // Helper: Check if user has permission (supports wildcards like 'fin.*' for any Finance permission)
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

  // Trigger immediate permission sync when user navigates to this page
  // Don't wait for next 5-second interval - check now
  useEffect(() => {
    if (user?.role === UserRole.MODERATOR) {
      syncPermissionsNow().catch(err =>
        console.error('[PermissionGatedRoute] Failed to sync permissions:', err)
      );
    }
  }, [code, user?.role]);

  // Validate permission on mount and auto-redirect if revoked
  usePermissionGuard({
    code,
    redirectTo: '/admin',
    showNotification: true,
  });

  // ADMIN bypasses all module-level checks
  if (user?.role === UserRole.ADMIN) {
    return <>{children}</>;
  }

  // MODERATOR must hold the specific permission (or any permission in the category for wildcards)
  if (user?.role === UserRole.MODERATOR && checkPermission(code)) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card>
        <div className="flex flex-col items-center gap-4 py-6 px-8 text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-red-500"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Access Restricted
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              You have not been assigned access to this module. Contact an administrator
              to request the required permissions.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PermissionGatedRoute;

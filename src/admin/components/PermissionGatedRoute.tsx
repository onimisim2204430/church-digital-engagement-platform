/**
 * PermissionGatedRoute
 *
 * Wraps an admin route so it is only accessible when the current user
 * holds a specific module permission code.
 *
 * Rules:
 * - ADMIN  → always allowed (bypasses all code checks)
 * - MODERATOR with the required code → allowed
 * - MODERATOR without the code → shows "Access Denied" card
 * - Any other role → shows "Access Denied" card
 *
 * Usage:
 *   <PermissionGatedRoute code="content.posts">
 *     <ContentManager />
 *   </PermissionGatedRoute>
 */

import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { UserRole } from '../../types/auth.types';
import { Card } from '../components/Card';

interface PermissionGatedRouteProps {
  /** The module permission code required to access this route. */
  code: string;
  children: React.ReactNode;
}

const PermissionGatedRoute: React.FC<PermissionGatedRouteProps> = ({ code, children }) => {
  const { user, hasPermission } = useAuth();

  // ADMIN bypasses all module-level checks
  if (user?.role === UserRole.ADMIN) {
    return <>{children}</>;
  }

  // MODERATOR must hold the specific permission
  if (user?.role === UserRole.MODERATOR && hasPermission(code)) {
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

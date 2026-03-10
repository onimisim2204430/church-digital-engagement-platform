/**
 * PermissionGate — declarative permission wrapper.
 *
 * Renders `children` only when the current user satisfies the permission
 * check.  Renders `fallback` (default: nothing) otherwise.
 *
 * Props:
 * - `code`      — single module permission code (e.g. `"fin.hub"`)
 * - `codes`     — require ALL of the listed codes (AND logic)
 * - `anyCodes`  — require AT LEAST ONE of the listed codes (OR logic)
 * - `role`      — require a specific role (e.g. `"ADMIN"`)
 * - `fallback`  — rendered when the check fails (default: `null`)
 *
 * Only ONE of `code`, `codes`, `anyCodes`, or `role` should be provided.
 *
 * Usage:
 * ```tsx
 * <PermissionGate code="fin.hub">
 *   <FinancialHub />
 * </PermissionGate>
 *
 * <PermissionGate code="fin.hub" fallback={<AccessDenied />}>
 *   <FinancialHub />
 * </PermissionGate>
 *
 * <PermissionGate role="ADMIN">
 *   <AdminOnlyContent />
 * </PermissionGate>
 * ```
 */

import React, { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usePermission, useAllPermissions, useAnyPermission } from '../hooks/usePermission';

interface PermissionGateProps {
  /** Single permission code — require this code. */
  code?: string;
  /** Require ALL of these codes (AND). */
  codes?: string[];
  /** Require ANY of these codes (OR). */
  anyCodes?: string[];
  /** Require exact role match (e.g. "ADMIN"). */
  role?: string;
  /** Rendered when the check fails. Default: null. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Inner component so hooks can be called conditionally based on which
 * prop variant is used.
 */
const PermissionGateInner: React.FC<PermissionGateProps> = ({
  code,
  codes,
  anyCodes,
  role,
  fallback = null,
  children,
}) => {
  const { user } = useAuth();
  const singlePermission = usePermission(code ?? '');
  const allPermissions = useAllPermissions(codes ?? []);
  const anyPermissions = useAnyPermission(anyCodes ?? []);

  let allowed = false;

  if (role) {
    allowed = user?.role === role;
  } else if (code) {
    allowed = singlePermission;
  } else if (codes && codes.length > 0) {
    allowed = allPermissions;
  } else if (anyCodes && anyCodes.length > 0) {
    allowed = anyPermissions;
  }

  return <>{allowed ? children : fallback}</>;
};

export const PermissionGate = PermissionGateInner;
export default PermissionGate;

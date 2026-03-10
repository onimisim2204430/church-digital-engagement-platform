/**
 * usePermission — granular module permission hook.
 *
 * Returns `true` when the current user is allowed to access the given
 * permission code.  Permission resolution rules:
 *
 * - ADMIN → always `true` (bypass all module checks)
 * - MODERATOR → `true` only if the code is in the JWT `permissions` claim
 * - All other roles → always `false`
 *
 * Usage:
 * ```tsx
 * const canViewFinance = usePermission('fin.hub');
 * if (!canViewFinance) return <AccessDenied />;
 * ```
 */

import { useAuth } from '../auth/AuthContext';

/**
 * Returns `true` if the current user holds *code* as a module permission.
 *
 * Aliased `hasPermission` is also available directly via `useAuth()` for
 * components that already consume the auth context.
 */
export function usePermission(code: string): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(code);
}

/**
 * Returns `true` if the current user holds ALL of the given codes.
 */
export function useAllPermissions(codes: string[]): boolean {
  const { hasPermission } = useAuth();
  return codes.every((c) => hasPermission(c));
}

/**
 * Returns `true` if the current user holds AT LEAST ONE of the given codes.
 */
export function useAnyPermission(codes: string[]): boolean {
  const { hasPermission } = useAuth();
  return codes.some((c) => hasPermission(c));
}

/**
 * permissionSyncService.ts
 *
 * Service that periodically syncs user permissions from the backend.
 * When permissions change (revocation detected), instantly reloads the page.
 *
 * This handles the case where an ADMIN revokes permissions while the
 * MODERATOR is actively viewing a protected page:
 * 1. Detects permission revocation
 * 2. Immediately reloads to /admin (user gets fresh permissions)
 */

import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

interface PermissionSyncState {
  isRunning: boolean;
  lastPermissions: Set<string>;
  intervalId: NodeJS.Timeout | null;
  syncCallback: ((permissions: string[]) => void) | null;
}

const state: PermissionSyncState = {
  isRunning: false,
  lastPermissions: new Set(),
  intervalId: null,
  syncCallback: null,
};

/**
 * Fetch latest permissions from server for MODERATORs.
 * ADMINs have all permissions, so no sync needed.
 */
async function fetchLatestPermissions(): Promise<string[]> {
  try {
    const accessToken =
      (() => {
        try {
          const raw = localStorage.getItem('auth_tokens');
          return raw ? JSON.parse(raw).access : null;
        } catch {
          return localStorage.getItem('access_token');
        }
      })() || '';

    if (!accessToken) return [];

    const response = await axios.get(`${API_BASE_URL}/auth/my-permissions/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 5000,
    });

    return response.data.permissions ?? [];
  } catch (err) {
    console.error('[PermissionSync] Failed to fetch permissions:', err);
    return [];
  }
}

/**
 * Detect if permissions have changed by comparing sets.
 */
function detectPermissionChange(
  oldPerms: Set<string>,
  newPerms: string[]
): boolean {
  const newSet = new Set(newPerms);

  // Check if any permissions were removed
  for (const perm of oldPerms) {
    if (!newSet.has(perm)) {
      console.warn(`[PermissionSync] Permission revoked: "${perm}"`);
      return true;
    }
  }

  // Check if new permissions were added
  if (newPerms.length > oldPerms.size) {
    console.log('[PermissionSync] New permissions detected');
    return true;
  }

  return false;
}

/**
 * Get the permission code from current page pathname.
 * Returns null if not a protected page.
 */
function getRequiredPermissionForPage(pathname: string): string | null {
  // Map of routes to their required permission codes
  // Dashboard routes use wildcard patterns (fin.*, content.*, etc.)
  const permissionMap: Record<string, string> = {
    'content-dashboard': 'content.*',
    'community-dashboard': 'community.*',
    'ministry-dashboard': 'schedule.*',
    'financial-dashboard': 'fin.*',
    'growth-dashboard': 'outreach.*',
    'content': 'content.posts',
    'series': 'content.series',
    'drafts': 'content.drafts',
    'weekly-flow': 'schedule.weekly_flow',
    'seed': 'fin.seed',
    'moderation': 'community.moderation',
    'small-groups': 'community.groups',
    'prayer-wall': 'community.prayer',
    'email': 'outreach.email',
    'reports': 'analytics.reports',
    'payments': 'fin.payments',
    'financial-reports': 'fin.reports',
    'financial-hub': 'fin.*',
  };

  // Extract route segment from pathname
  const match = pathname.match(/^\/admin\/([^/]+)/);
  const segment = match?.[1];

  return segment ? permissionMap[segment] || null : null;
}

/**
 * Register a callback to be notified of permission changes.
 */
export function onPermissionChange(
  callback: (permissions: string[]) => void
): () => void {
  state.syncCallback = callback;
  // Return unsubscribe function
  return () => {
    state.syncCallback = null;
  };
}

/**
 * Start periodic permission sync (typically every 30 seconds).
 *
 * @param intervalMs - Sync interval in milliseconds (default: 30000 = 30 seconds)
 */
export function startPermissionSync(intervalMs: number = 30000): void {
  if (state.isRunning) {
    console.warn('[PermissionSync] Already running, skipping start');
    return;
  }

  console.log(
    `[PermissionSync] Starting periodic sync every ${intervalMs}ms`
  );
  state.isRunning = true;

  // Perform initial sync
  performSync();

  // Set up interval for periodic syncs
  state.intervalId = setInterval(() => {
    performSync();
  }, intervalMs);
}

/**
 * Stop periodic permission sync.
 */
export function stopPermissionSync(): void {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.isRunning = false;
  console.log('[PermissionSync] Stopped');
}

/**
 * Perform a single permission sync and handle changes.
 */
async function performSync(): Promise<void> {
  const newPermissions = await fetchLatestPermissions();

  // Notify callback of new permissions
  if (state.syncCallback) {
    state.syncCallback(newPermissions);
  }

  // Check if permissions changed
  const hasChanged = detectPermissionChange(state.lastPermissions, newPermissions);

  if (hasChanged) {
    console.warn('[PermissionSync] Permissions have changed...');

    // Check if any permissions were revoked (removed)
    const currentPermSet = new Set(newPermissions);
    const revokedPerms = Array.from(state.lastPermissions).filter(
      p => !currentPermSet.has(p)
    );

    // If permissions were revoked, reload immediately
    if (revokedPerms.length > 0) {
      console.error(
        `[PermissionSync] Permissions revoked: "${revokedPerms.join(', ')}". Reloading page...`
      );

      // Instant reload to /admin - user gets fresh permissions
      // Works regardless of current page, so it detects revocations even from /admin
      window.location.href = '/admin';
      return; // Exit early, don't update lastPermissions (page is reloading)
    }
  }

  // Update stored permissions
  state.lastPermissions = new Set(newPermissions);
}

/**
 * Manually trigger a permission sync now.
 * Useful for immediate checks after critical actions.
 * Also checks for revocations and reloads if permissions were revoked.
 */
export async function syncPermissionsNow(): Promise<string[]> {
  const newPermissions = await fetchLatestPermissions();

  // Check if permissions changed (including revocations)
  const hasChanged = detectPermissionChange(state.lastPermissions, newPermissions);

  if (hasChanged) {
    console.warn('[PermissionSync] Permissions have changed during immediate sync...');

    // Check if any permissions were revoked (removed)
    const currentPermSet = new Set(newPermissions);
    const revokedPerms = Array.from(state.lastPermissions).filter(
      p => !currentPermSet.has(p)
    );

    // If permissions were revoked, reload immediately
    if (revokedPerms.length > 0) {
      console.error(
        `[PermissionSync] Permissions revoked: "${revokedPerms.join(', ')}". Reloading page...`
      );

      // Instant reload to /admin - user gets fresh permissions
      window.location.href = '/admin';
      return newPermissions; // Return before state update (page is reloading)
    }
  }

  // Update stored permissions
  state.lastPermissions = new Set(newPermissions);
  return newPermissions;
}

/**
 * Get currently cached permissions locally (no network call).
 */
export function getCachedPermissions(): string[] {
  return Array.from(state.lastPermissions);
}

export default {
  startPermissionSync,
  stopPermissionSync,
  syncPermissionsNow,
  getCachedPermissions,
  onPermissionChange,
};

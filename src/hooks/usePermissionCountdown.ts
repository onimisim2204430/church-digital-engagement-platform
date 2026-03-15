/**
 * usePermissionCountdown.ts
 *
 * Hook that listens for pending permission revocations and shows countdown
 * warning before page reload, giving user time to save work.
 *
 * How it works:
 * 1. When admin revokes permission, service detects it
 * 2. Hook receives event with countdown seconds (default: 20)
 * 3. Shows warning toast with live countdown timer
 * 4. User can save work during countdown
 * 5. After countdown expires, page auto-reloads
 */

import { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';

interface PermissionRevokedEvent {
  revokedPermissions: string[];
  secondsUntilReload: number;
}

let revokedCallbacks: ((event: PermissionRevokedEvent) => void)[] = [];

/**
 * Global event system for permission revocations
 * (since permissionSyncService can't easily import toast context)
 */
export const permissionRevokedEmitter = {
  on: (callback: (event: PermissionRevokedEvent) => void) => {
    revokedCallbacks.push(callback);
    return () => {
      revokedCallbacks = revokedCallbacks.filter(cb => cb !== callback);
    };
  },
  emit: (event: PermissionRevokedEvent) => {
    revokedCallbacks.forEach(cb => cb(event));
  },
};

/**
 * Hook: Show countdown warning when permission is about to be revoked
 *
 * Usage in any component:
 * usePermissionCountdown();
 */
export const usePermissionCountdown = () => {
  const { warning } = useToast();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);

  // Set up listener for revocation events
  useEffect(() => {
    const unsubscribe = permissionRevokedEmitter.on((event) => {
      console.log(
        `[usePermissionCountdown] Permission revoked. Reloading in ${event.secondsUntilReload} seconds...`
      );

      // Show initial warning with countdown
      const revokedList = event.revokedPermissions.join(', ');
      warning(
        `⚠️ Your access to "${revokedList}" has been revoked. Page will reload in ${event.secondsUntilReload} seconds. Save your work now!`,
        0 // Don't auto-dismiss
      );

      setCountdown(event.secondsUntilReload);
      setIsCountingDown(true);

      // Start countdown
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            setIsCountingDown(false);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    });

    return unsubscribe;
  }, [warning]);

  return {
    isCountingDown,
    secondsRemaining: countdown,
  };
};

export default usePermissionCountdown;

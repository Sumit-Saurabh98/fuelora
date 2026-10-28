import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getContainer } from '@/container';
import type { PermissionState } from '@/notifications/notification-gateway';

/** Notification permission, re-read when the user comes back from the system settings. */
export function useNotificationPermission(): PermissionState | null {
  const [state, setState] = useState<PermissionState | null>(null);
  useEffect(() => {
    const read = () => {
      getContainer()
        .reminderNotifications.permission()
        .then(setState)
        .catch(() => setState(null));
    };
    read();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') read();
    });
    return () => sub.remove();
  }, []);
  return state;
}

import { getContainer } from '@/container';
import type { PermissionState } from '@/notifications/notification-gateway';
import type { RestoreCandidate } from '@/services/backup.service';

import { hydrateOnboarding } from '../../onboarding/onboarding.store';
import { requestNotificationSync } from '../../reminders/notification-sync-requests';
import { hydratePreferences, preferenceWritesSettled } from '../../settings/preferences.store';

export type RestoreResult = { safetyFile: string; notifications: PermissionState | null };

export function useRestore() {
  const c = () => getContainer();
  return {
    pick: () => c().backupService.pickBackup(),
    read: (uri: string) => c().backupService.readBackup(uri),
    /**
     * Replace everything, then make the app match the restored data: preferences, onboarding
     * state, and notifications (FR-24: ask when the backup has reminders, then reschedule).
     */
    restore: async (candidate: RestoreCandidate): Promise<RestoreResult> => {
      // A queued preference write must not land after the restore and undo it.
      await preferenceWritesSettled();
      const safetyFile = await c().backupService.restore(candidate);
      await hydratePreferences(c().settingsService);
      await hydrateOnboarding(c().onboardingService);
      let notifications: PermissionState | null = null;
      if (candidate.summary.reminders > 0) {
        notifications = await c()
          .reminderNotifications.ensurePermission()
          .catch(() => null);
      }
      requestNotificationSync();
      return { safetyFile, notifications };
    },
  };
}

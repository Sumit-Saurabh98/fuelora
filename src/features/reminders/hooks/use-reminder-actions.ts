import { getContainer } from '@/container';
import type { NewReminderInput, Reminder } from '@/domain/reminder';

import { requestNotificationSync } from '../notification-sync-requests';

export function useReminderActions() {
  const service = () => getContainer().reminderService;
  return {
    /** Creates it, then asks for notification permission if never asked (AGENTS.md rule 13). */
    create: async (input: NewReminderInput): Promise<Reminder> => {
      const reminder = await service().create(input);
      const state = await getContainer()
        .reminderNotifications.ensurePermission()
        .catch(() => null);
      if (state === 'granted') requestNotificationSync();
      return reminder;
    },
    update: (id: string, input: NewReminderInput): Promise<Reminder> => service().update(id, input),
    remove: (id: string): Promise<void> => service().delete(id),
    /** Done today at the current odometer (FR-14). */
    markDone: (id: string): Promise<Reminder> => service().markDone(id),
  };
}

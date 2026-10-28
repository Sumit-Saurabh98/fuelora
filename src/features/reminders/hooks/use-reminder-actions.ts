import { getContainer } from '@/container';
import type { NewReminderInput, Reminder } from '@/domain/reminder';

export function useReminderActions() {
  const service = () => getContainer().reminderService;
  return {
    create: (input: NewReminderInput): Promise<Reminder> => service().create(input),
    update: (id: string, input: NewReminderInput): Promise<Reminder> => service().update(id, input),
    remove: (id: string): Promise<void> => service().delete(id),
    /** Done today at the current odometer (FR-14). */
    markDone: (id: string): Promise<Reminder> => service().markDone(id),
  };
}

import type { Reminder } from '@/domain/reminder';

// Reminders aggregate (LLD §2 `reminders`). Person-level reminders have no vehicle.
export interface ReminderRepository {
  insert(reminder: Reminder): Promise<void>;
  getById(id: string): Promise<Reminder | null>;
  /** Every active reminder, person-level ones included (for planning notifications). */
  listActive(): Promise<Reminder[]>;
  /** A vehicle's active reminders. */
  listActiveForVehicle(vehicleId: string): Promise<Reminder[]>;
  update(reminder: Reminder): Promise<void>;
  delete(id: string): Promise<void>;
}

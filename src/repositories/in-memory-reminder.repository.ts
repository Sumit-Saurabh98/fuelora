import type { Reminder } from '@/domain/reminder';

import type { ReminderRepository } from './reminder.repository';

export class InMemoryReminderRepository implements ReminderRepository {
  readonly rows = new Map<string, Reminder>();

  async insert(reminder: Reminder): Promise<void> {
    if (this.rows.has(reminder.id)) throw new Error(`Duplicate reminder id ${reminder.id}`);
    this.rows.set(reminder.id, { ...reminder });
  }

  async getById(id: string): Promise<Reminder | null> {
    const row = this.rows.get(id);
    return row ? { ...row } : null;
  }

  async listActive(): Promise<Reminder[]> {
    return this.sorted((r) => r.status === 'active');
  }

  async listActiveForVehicle(vehicleId: string): Promise<Reminder[]> {
    return this.sorted((r) => r.status === 'active' && r.vehicleId === vehicleId);
  }

  async update(reminder: Reminder): Promise<void> {
    if (this.rows.has(reminder.id)) this.rows.set(reminder.id, { ...reminder });
  }

  async delete(id: string): Promise<void> {
    this.rows.delete(id);
  }

  private sorted(keep: (r: Reminder) => boolean): Reminder[] {
    return [...this.rows.values()]
      .filter(keep)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((r) => ({ ...r }));
  }
}

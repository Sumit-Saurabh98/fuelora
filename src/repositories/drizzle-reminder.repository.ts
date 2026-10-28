import { and, asc, eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import { reminders } from '@/db/schema';
import type { Reminder } from '@/domain/reminder';

import type { ReminderRepository } from './reminder.repository';

// Accepts any Drizzle SQLite driver: expo-sqlite in the app, a Node-backed proxy in tests.
type SqliteDb = BaseSQLiteDatabase<'sync' | 'async', unknown>;

export class DrizzleReminderRepository implements ReminderRepository {
  constructor(private readonly db: SqliteDb) {}

  async insert(reminder: Reminder): Promise<void> {
    await this.db.insert(reminders).values(reminder);
  }

  async getById(id: string): Promise<Reminder | null> {
    const [row] = await this.db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
    return row ?? null;
  }

  async listActive(): Promise<Reminder[]> {
    return this.db
      .select()
      .from(reminders)
      .where(eq(reminders.status, 'active'))
      .orderBy(asc(reminders.createdAt));
  }

  async listActiveForVehicle(vehicleId: string): Promise<Reminder[]> {
    // Served by the (vehicle_id, status) index.
    return this.db
      .select()
      .from(reminders)
      .where(and(eq(reminders.vehicleId, vehicleId), eq(reminders.status, 'active')))
      .orderBy(asc(reminders.createdAt));
  }

  async update(reminder: Reminder): Promise<void> {
    const { id, ...fields } = reminder;
    await this.db.update(reminders).set(fields).where(eq(reminders.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(reminders).where(eq(reminders.id, id));
  }
}

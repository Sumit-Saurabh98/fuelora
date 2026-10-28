import { asc, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import { fillUps, reminders, services, settings, vehicles } from '@/db/schema';
import type { BackupData } from '@/domain/backup';

import type { BackupRepository } from './backup.repository';

// Accepts any Drizzle SQLite driver: expo-sqlite in the app, a Node-backed proxy in tests.
type SqliteDb = BaseSQLiteDatabase<'sync' | 'async', unknown>;

// SQLite caps bound parameters per statement; 15 columns × 50 rows stays well under it.
const CHUNK = 50;

export class DrizzleBackupRepository implements BackupRepository {
  constructor(private readonly db: SqliteDb) {}

  async readAll(): Promise<BackupData> {
    const [v, f, s, r, st] = await Promise.all([
      this.db.select().from(vehicles).orderBy(asc(vehicles.sortOrder), asc(vehicles.createdAt)),
      this.db.select().from(fillUps).orderBy(asc(fillUps.vehicleId), asc(fillUps.odometerM)),
      this.db.select().from(services).orderBy(asc(services.vehicleId), asc(services.servicedDate)),
      this.db.select().from(reminders).orderBy(asc(reminders.createdAt)),
      this.db.select().from(settings).orderBy(asc(settings.key)),
    ]);
    return { vehicles: v, fillUps: f, services: s, reminders: r, settings: st };
  }

  async replaceAll(data: BackupData): Promise<void> {
    // Plain BEGIN / COMMIT works the same on both drivers; any failure rolls everything back.
    await this.db.run(sql`BEGIN IMMEDIATE`);
    try {
      // Children before parents (cascade would do it, but explicit is clearer).
      for (const table of [reminders, services, fillUps, vehicles, settings]) {
        await this.db.delete(table);
      }
      await this.insertAll(vehicles, data.vehicles);
      await this.insertAll(fillUps, data.fillUps);
      await this.insertAll(services, data.services);
      await this.insertAll(reminders, data.reminders);
      await this.insertAll(settings, data.settings);
      await this.db.run(sql`COMMIT`);
    } catch (error) {
      await this.db.run(sql`ROLLBACK`);
      throw error;
    }
  }

  private async insertAll<
    T extends
      typeof vehicles | typeof fillUps | typeof services | typeof reminders | typeof settings,
  >(table: T, rows: readonly T['$inferInsert'][]): Promise<void> {
    for (let i = 0; i < rows.length; i += CHUNK) {
      await this.db.insert(table).values(rows.slice(i, i + CHUNK) as T['$inferInsert'][]);
    }
  }
}

import { inArray } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import { settings } from '@/db/schema';

import type { SettingsRepository } from './settings.repository';

// Accepts any Drizzle SQLite driver: expo-sqlite in the app, a Node-backed proxy in tests.
type SqliteDb = BaseSQLiteDatabase<'sync' | 'async', unknown>;

export class DrizzleSettingsRepository implements SettingsRepository {
  constructor(private readonly db: SqliteDb) {}

  async getAll(): Promise<Map<string, string>> {
    const rows = await this.db.select().from(settings);
    return new Map(rows.map((r) => [r.key, r.value]));
  }

  async set(key: string, value: string, updatedAt: string): Promise<void> {
    await this.db
      .insert(settings)
      .values({ key, value, updatedAt })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt } });
  }

  async remove(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.db.delete(settings).where(inArray(settings.key, [...keys]));
  }
}

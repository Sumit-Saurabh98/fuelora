import { desc, eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import { services } from '@/db/schema';
import type { ServiceEntry } from '@/domain/service-entry';

import type { ServiceLogRepository } from './service-log.repository';

// Accepts any Drizzle SQLite driver: expo-sqlite in the app, a Node-backed proxy in tests.
type SqliteDb = BaseSQLiteDatabase<'sync' | 'async', unknown>;

export class DrizzleServiceLogRepository implements ServiceLogRepository {
  constructor(private readonly db: SqliteDb) {}

  async insert(entry: ServiceEntry): Promise<void> {
    await this.db.insert(services).values(entry);
  }

  async getById(id: string): Promise<ServiceEntry | null> {
    const [row] = await this.db.select().from(services).where(eq(services.id, id)).limit(1);
    return row ?? null;
  }

  async listByVehicle(vehicleId: string): Promise<ServiceEntry[]> {
    // Served by the (vehicle_id, serviced_date) index.
    return this.db
      .select()
      .from(services)
      .where(eq(services.vehicleId, vehicleId))
      .orderBy(desc(services.servicedDate), desc(services.createdAt));
  }

  async update(entry: ServiceEntry): Promise<void> {
    const { id, ...fields } = entry;
    await this.db.update(services).set(fields).where(eq(services.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(services).where(eq(services.id, id));
  }
}

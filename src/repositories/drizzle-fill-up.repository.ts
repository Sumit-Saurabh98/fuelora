import { asc, eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import { fillUps } from '@/db/schema';
import type { FillUp } from '@/domain/fill-up';

import type { FillUpRepository } from './fill-up.repository';

// Accepts any Drizzle SQLite driver: expo-sqlite in the app, a Node-backed proxy in tests.
type SqliteDb = BaseSQLiteDatabase<'sync' | 'async', unknown>;

export class DrizzleFillUpRepository implements FillUpRepository {
  constructor(private readonly db: SqliteDb) {}

  async insert(fillUp: FillUp): Promise<void> {
    await this.db.insert(fillUps).values(fillUp);
  }

  async getById(id: string): Promise<FillUp | null> {
    const [row] = await this.db.select().from(fillUps).where(eq(fillUps.id, id)).limit(1);
    return row ?? null;
  }

  async listByVehicle(vehicleId: string): Promise<FillUp[]> {
    // Served by the (vehicle_id, odometer_m) unique index.
    return this.db
      .select()
      .from(fillUps)
      .where(eq(fillUps.vehicleId, vehicleId))
      .orderBy(asc(fillUps.odometerM));
  }

  async update(fillUp: FillUp): Promise<void> {
    const { id, ...fields } = fillUp;
    await this.db.update(fillUps).set(fields).where(eq(fillUps.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(fillUps).where(eq(fillUps.id, id));
  }
}

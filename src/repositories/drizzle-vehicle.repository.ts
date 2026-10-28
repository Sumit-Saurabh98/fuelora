import { asc, count, eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import { vehicles } from '@/db/schema';
import type { Vehicle } from '@/domain/vehicle';

import type { VehicleRepository } from './vehicle.repository';

// Accepts any Drizzle SQLite driver: expo-sqlite in the app, a Node-backed proxy in tests.
type SqliteDb = BaseSQLiteDatabase<'sync' | 'async', unknown>;

export class DrizzleVehicleRepository implements VehicleRepository {
  constructor(private readonly db: SqliteDb) {}

  async insert(vehicle: Vehicle): Promise<void> {
    await this.db.insert(vehicles).values(vehicle);
  }

  async getById(id: string): Promise<Vehicle | null> {
    const [row] = await this.db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
    return row ?? null;
  }

  async list(options: { includeArchived?: boolean } = {}): Promise<Vehicle[]> {
    const query = this.db.select().from(vehicles);
    const filtered = options.includeArchived ? query : query.where(eq(vehicles.isArchived, false));
    return filtered.orderBy(asc(vehicles.sortOrder), asc(vehicles.createdAt));
  }

  async count(): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(vehicles);
    return row?.n ?? 0;
  }

  async update(vehicle: Vehicle): Promise<void> {
    const { id, ...fields } = vehicle;
    await this.db.update(vehicles).set(fields).where(eq(vehicles.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(vehicles).where(eq(vehicles.id, id));
  }
}

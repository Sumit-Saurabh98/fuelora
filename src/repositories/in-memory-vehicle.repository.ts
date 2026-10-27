import type { Vehicle } from '@/domain/vehicle';

import type { VehicleRepository } from './vehicle.repository';

export class InMemoryVehicleRepository implements VehicleRepository {
  readonly rows = new Map<string, Vehicle>();

  async insert(vehicle: Vehicle): Promise<void> {
    if (this.rows.has(vehicle.id)) throw new Error(`Duplicate vehicle id ${vehicle.id}`);
    this.rows.set(vehicle.id, { ...vehicle });
  }

  async getById(id: string): Promise<Vehicle | null> {
    const row = this.rows.get(id);
    return row ? { ...row } : null;
  }

  async list(options: { includeArchived?: boolean } = {}): Promise<Vehicle[]> {
    return [...this.rows.values()]
      .filter((v) => options.includeArchived || !v.isArchived)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt))
      .map((v) => ({ ...v }));
  }

  async count(): Promise<number> {
    return this.rows.size;
  }
}

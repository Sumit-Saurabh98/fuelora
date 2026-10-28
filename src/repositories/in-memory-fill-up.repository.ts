import type { FillUp } from '@/domain/fill-up';

import type { FillUpRepository } from './fill-up.repository';

export class InMemoryFillUpRepository implements FillUpRepository {
  readonly rows = new Map<string, FillUp>();

  async insert(fillUp: FillUp): Promise<void> {
    if (this.rows.has(fillUp.id)) throw new Error(`Duplicate fill-up id ${fillUp.id}`);
    // Mirrors the unique (vehicle_id, odometer_m) index.
    for (const row of this.rows.values()) {
      if (row.vehicleId === fillUp.vehicleId && row.odometerM === fillUp.odometerM) {
        throw new Error('Duplicate odometer for vehicle');
      }
    }
    this.rows.set(fillUp.id, { ...fillUp });
  }

  async getById(id: string): Promise<FillUp | null> {
    const row = this.rows.get(id);
    return row ? { ...row } : null;
  }

  async listByVehicle(vehicleId: string): Promise<FillUp[]> {
    return [...this.rows.values()]
      .filter((f) => f.vehicleId === vehicleId)
      .sort((a, b) => a.odometerM - b.odometerM)
      .map((f) => ({ ...f }));
  }

  async update(fillUp: FillUp): Promise<void> {
    if (this.rows.has(fillUp.id)) this.rows.set(fillUp.id, { ...fillUp });
  }

  async delete(id: string): Promise<void> {
    this.rows.delete(id);
  }
}

import type { ServiceEntry } from '@/domain/service-entry';

import type { ServiceLogRepository } from './service-log.repository';

export class InMemoryServiceLogRepository implements ServiceLogRepository {
  readonly rows = new Map<string, ServiceEntry>();

  async insert(entry: ServiceEntry): Promise<void> {
    if (this.rows.has(entry.id)) throw new Error(`Duplicate service id ${entry.id}`);
    this.rows.set(entry.id, { ...entry });
  }

  async getById(id: string): Promise<ServiceEntry | null> {
    const row = this.rows.get(id);
    return row ? { ...row } : null;
  }

  async listByVehicle(vehicleId: string): Promise<ServiceEntry[]> {
    return [...this.rows.values()]
      .filter((s) => s.vehicleId === vehicleId)
      .sort(
        (a, b) =>
          b.servicedDate.localeCompare(a.servicedDate) || b.createdAt.localeCompare(a.createdAt),
      )
      .map((s) => ({ ...s }));
  }

  async update(entry: ServiceEntry): Promise<void> {
    if (this.rows.has(entry.id)) this.rows.set(entry.id, { ...entry });
  }

  async delete(id: string): Promise<void> {
    this.rows.delete(id);
  }
}

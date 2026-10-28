import type { ServiceEntry } from '@/domain/service-entry';

// Services aggregate (LLD §2 `services`). Always scoped to one vehicle.
export interface ServiceLogRepository {
  insert(entry: ServiceEntry): Promise<void>;
  getById(id: string): Promise<ServiceEntry | null>;
  /** A vehicle's services, newest date first. */
  listByVehicle(vehicleId: string): Promise<ServiceEntry[]>;
  update(entry: ServiceEntry): Promise<void>;
  delete(id: string): Promise<void>;
}

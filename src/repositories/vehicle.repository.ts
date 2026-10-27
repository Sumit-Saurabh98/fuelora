import type { Vehicle } from '@/domain/vehicle';

// Vehicles aggregate (LLD §2 `vehicles`). Lists are ordered for the vehicle switcher.
export interface VehicleRepository {
  insert(vehicle: Vehicle): Promise<void>;
  getById(id: string): Promise<Vehicle | null>;
  /** Ordered by sortOrder, then creation time. Archived vehicles only when asked for. */
  list(options?: { includeArchived?: boolean }): Promise<Vehicle[]>;
  count(): Promise<number>;
}

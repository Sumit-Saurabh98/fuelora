import type { FillUp } from '@/domain/fill-up';

// Fill-ups aggregate (LLD §2 `fill_ups`, §8). Always scoped to one vehicle.
export interface FillUpRepository {
  insert(fillUp: FillUp): Promise<void>;
  getById(id: string): Promise<FillUp | null>;
  /** A vehicle's fill-ups ordered by odometer (the order the efficiency engine uses). */
  listByVehicle(vehicleId: string): Promise<FillUp[]>;
  /** Replaces the stored row with the same id. */
  update(fillUp: FillUp): Promise<void>;
  delete(id: string): Promise<void>;
}

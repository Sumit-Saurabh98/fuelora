import type { Clock } from '@/domain/clock';
import { AppError } from '@/domain/errors';
import type { IdGenerator } from '@/domain/id-generator';
import {
  pickCurrentVehicle,
  validateNewVehicle,
  type NewVehicleInput,
  type Vehicle,
} from '@/domain/vehicle';
import type { VehicleRepository } from '@/repositories/vehicle.repository';

import type { SettingsService } from './settings.service';

export class VehicleService {
  constructor(
    private readonly vehicles: VehicleRepository,
    // The current vehicle is a setting; go through its service, not its repository (rule 11).
    private readonly settings: SettingsService,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  /** Validates, stores and returns a new vehicle; the first one becomes current (FR-4). */
  async create(input: NewVehicleInput): Promise<Vehicle> {
    const now = this.clock.now();
    const result = validateNewVehicle(input, now.getUTCFullYear());
    if (!result.ok) {
      // Field names and rule codes only; never the user's text (AGENTS.md rule 2).
      throw new AppError('INVALID_VEHICLE', 'Vehicle input is invalid', { issues: result.issues });
    }
    const timestamp = now.toISOString();
    const vehicle: Vehicle = {
      id: this.ids.next(),
      ...result.value,
      isArchived: false,
      // New vehicles go to the end of the switcher.
      sortOrder: await this.vehicles.count(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.vehicles.insert(vehicle);
    // Becomes current unless a valid current vehicle is already saved.
    const savedId = await this.settings.getCurrentVehicleId();
    const saved = savedId ? await this.vehicles.getById(savedId) : null;
    if (!saved || saved.isArchived) await this.settings.setCurrentVehicleId(vehicle.id);
    return vehicle;
  }

  /** Active (not archived) vehicles in switcher order. */
  list(): Promise<Vehicle[]> {
    return this.vehicles.list();
  }

  count(): Promise<number> {
    return this.vehicles.count();
  }

  /**
   * The current vehicle, or the first active one if the saved choice was deleted or archived;
   * null when there are no active vehicles.
   */
  async getCurrent(): Promise<Vehicle | null> {
    const id = await this.settings.getCurrentVehicleId();
    return pickCurrentVehicle(await this.vehicles.list(), id);
  }

  async setCurrent(id: string): Promise<void> {
    const vehicle = await this.vehicles.getById(id);
    if (!vehicle || vehicle.isArchived) {
      throw new AppError('VEHICLE_NOT_FOUND', 'No active vehicle with this id');
    }
    await this.settings.setCurrentVehicleId(id);
  }
}

import type { Clock } from '@/domain/clock';
import { AppError } from '@/domain/errors';
import type { IdGenerator } from '@/domain/id-generator';
import {
  checkEditAgainstFillUps,
  pickCurrentVehicle,
  validateNewVehicle,
  type NewVehicleInput,
  type Vehicle,
} from '@/domain/vehicle';
import type { VehicleRepository } from '@/repositories/vehicle.repository';

import type { SettingsService } from './settings.service';

/**
 * What vehicle edits need to know about logged fill-ups (KB #24). Implemented by FillUpService;
 * a narrow port so the two services don't construct each other.
 */
export interface VehicleFillUpHistory {
  /** Lowest odometer among the vehicle's fill-ups; null when it has none. */
  firstOdometerM(vehicleId: string): Promise<number | null>;
}

const NO_HISTORY: VehicleFillUpHistory = { firstOdometerM: async () => null };

export class VehicleService {
  constructor(
    private readonly vehicles: VehicleRepository,
    // The current vehicle is a setting; go through its service, not its repository (rule 11).
    private readonly settings: SettingsService,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly history: VehicleFillUpHistory = NO_HISTORY,
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

  /** Any vehicle, archived or not; null when it doesn't exist. */
  get(id: string): Promise<Vehicle | null> {
    return this.vehicles.getById(id);
  }

  /** Active and archived vehicles, for the vehicles screen. */
  listAll(): Promise<Vehicle[]> {
    return this.vehicles.list({ includeArchived: true });
  }

  /**
   * Same rules as create, plus KB #24 once fill-ups exist; id, order, archive state and creation
   * time are kept.
   */
  async update(id: string, input: NewVehicleInput): Promise<Vehicle> {
    const existing = await this.require(id);
    const now = this.clock.now();
    const result = validateNewVehicle(input, now.getUTCFullYear());
    if (!result.ok) {
      throw new AppError('INVALID_VEHICLE', 'Vehicle input is invalid', { issues: result.issues });
    }
    const issues = checkEditAgainstFillUps(
      existing,
      result.value,
      await this.history.firstOdometerM(id),
    );
    if (Object.keys(issues).length > 0) {
      throw new AppError('INVALID_VEHICLE', 'Edit conflicts with logged fill-ups', { issues });
    }
    const vehicle: Vehicle = { ...existing, ...result.value, updatedAt: now.toISOString() };
    await this.vehicles.update(vehicle);
    return vehicle;
  }

  /** Hides the vehicle from the switcher but keeps all its data (FR-5). */
  async archive(id: string): Promise<void> {
    await this.setArchived(await this.require(id), true);
    await this.moveCurrentOffIfNeeded(id);
  }

  async unarchive(id: string): Promise<void> {
    await this.setArchived(await this.require(id), false);
    // Becomes current only when no other active vehicle is.
    const current = await this.getCurrent();
    if (!current || current.id === id) await this.settings.setCurrentVehicleId(id);
  }

  /**
   * Removes the vehicle and everything recorded for it (cascade). The screen asks for a typed
   * confirmation first (FR-5, AGENTS.md rule 12).
   */
  async delete(id: string): Promise<void> {
    await this.require(id);
    await this.vehicles.delete(id);
    await this.moveCurrentOffIfNeeded(id);
  }

  private async require(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicles.getById(id);
    if (!vehicle) throw new AppError('VEHICLE_NOT_FOUND', 'No vehicle with this id');
    return vehicle;
  }

  private async setArchived(vehicle: Vehicle, isArchived: boolean): Promise<void> {
    if (vehicle.isArchived === isArchived) return;
    await this.vehicles.update({
      ...vehicle,
      isArchived,
      updatedAt: this.clock.now().toISOString(),
    });
  }

  // Save the fallback explicitly, so unarchiving the old vehicle later doesn't silently switch.
  private async moveCurrentOffIfNeeded(removedId: string): Promise<void> {
    if ((await this.settings.getCurrentVehicleId()) !== removedId) return;
    const [next] = await this.vehicles.list();
    if (next) await this.settings.setCurrentVehicleId(next.id);
  }
}

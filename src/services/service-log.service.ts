import type { Clock } from '@/domain/clock';
import { AppError } from '@/domain/errors';
import { localDateOf } from '@/domain/fill-up';
import type { IdGenerator } from '@/domain/id-generator';
import { isCurrencyCode } from '@/domain/money';
import {
  validateService,
  type NewServiceInput,
  type ServiceEntry,
  type ValidServiceInput,
} from '@/domain/service-entry';
import type { ServiceLogRepository } from '@/repositories/service-log.repository';

import type { ReminderService } from './reminder.service';
import type { VehicleService } from './vehicle.service';

/** Editable fields of a saved service; it never moves to another vehicle. */
export type ServiceChanges = Omit<NewServiceInput, 'vehicleId'>;

/** Service records per vehicle (F-09); a new one completes the matching reminder. */
export class ServiceLogService {
  constructor(
    private readonly services: ServiceLogRepository,
    // Vehicle lookups go through its service, not its repository (rule 11).
    private readonly vehicles: VehicleService,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    // Logging a service completes the matching reminder (F-09); optional for tests.
    private readonly reminders?: Pick<ReminderService, 'onServiceLogged'>,
  ) {}

  async add(input: NewServiceInput): Promise<ServiceEntry> {
    const vehicle = await this.vehicles.get(input.vehicleId);
    // Archived vehicles are read-only until restored (FR-5).
    if (!vehicle || vehicle.isArchived) {
      throw new AppError('VEHICLE_NOT_FOUND', 'No active vehicle with this id');
    }
    const now = this.clock.now();
    const value = this.validate(input, now, vehicle.initialOdometerM);
    const timestamp = now.toISOString();
    const entry: ServiceEntry = {
      id: this.ids.next(),
      ...value,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.services.insert(entry);
    await this.reminders?.onServiceLogged(entry);
    return entry;
  }

  async update(id: string, changes: ServiceChanges): Promise<ServiceEntry> {
    const existing = await this.services.getById(id);
    if (!existing) throw new AppError('SERVICE_NOT_FOUND', 'No service with this id');
    const vehicle = await this.vehicles.get(existing.vehicleId);
    if (!vehicle) throw new AppError('VEHICLE_NOT_FOUND', 'No vehicle with this id');
    const now = this.clock.now();
    const value = this.validate(
      { ...changes, vehicleId: existing.vehicleId },
      now,
      vehicle.initialOdometerM,
    );
    const entry: ServiceEntry = { ...existing, ...value, updatedAt: now.toISOString() };
    await this.services.update(entry);
    return entry;
  }

  async delete(id: string): Promise<void> {
    if (!(await this.services.getById(id))) {
      throw new AppError('SERVICE_NOT_FOUND', 'No service with this id');
    }
    await this.services.delete(id);
  }

  get(id: string): Promise<ServiceEntry | null> {
    return this.services.getById(id);
  }

  /** Newest date first. */
  listByVehicle(vehicleId: string): Promise<ServiceEntry[]> {
    return this.services.listByVehicle(vehicleId);
  }

  private validate(input: NewServiceInput, now: Date, initialOdometerM: number): ValidServiceInput {
    const result = validateService(input, localDateOf(now));
    if (!result.ok) {
      // Field names and rule codes only; never the user's values (rule 2).
      throw new AppError('INVALID_SERVICE', 'Service input is invalid', { issues: result.issues });
    }
    if (result.value.currency !== null && !isCurrencyCode(result.value.currency)) {
      throw new AppError('INVALID_CURRENCY', 'Currency must be an ISO 4217 code');
    }
    // A reading before the vehicle's start can't be right (same rule as fill-ups, KB #24).
    if (result.value.odometerM !== null && result.value.odometerM < initialOdometerM) {
      throw new AppError('ODOMETER_BELOW_START', 'Odometer is below the vehicle start');
    }
    return result.value;
  }
}

import type { Clock } from '@/domain/clock';
import { EfficiencyEngine, type Plausibility } from '@/domain/efficiency';
import { AppError } from '@/domain/errors';
import {
  checkOdometerOrder,
  localDateOf,
  validateFillUp,
  type FillUp,
  type NewFillUpInput,
  type OdometerProblem,
  type ValidFillUpInput,
} from '@/domain/fill-up';
import type { IdGenerator } from '@/domain/id-generator';
import { isCurrencyCode } from '@/domain/money';
import type { FillUpRepository } from '@/repositories/fill-up.repository';

import type { VehicleFillUpHistory, VehicleService } from './vehicle.service';

/** Things worth a second look before saving; they never block the save (FR-8). */
export type FillUpWarning =
  { kind: 'efficiency'; level: Exclude<Plausibility, 'ok'> } | { kind: 'tank' };

const CANDIDATE_ID = '__candidate__';

/** Editable fields of a saved fill-up; it never moves to another vehicle. */
export type FillUpChanges = Omit<NewFillUpInput, 'vehicleId'>;

export class FillUpService implements VehicleFillUpHistory {
  constructor(
    private readonly fillUps: FillUpRepository,
    // Vehicle lookups go through its service, not its repository (rule 11).
    private readonly vehicles: VehicleService,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly engine: EfficiencyEngine = new EfficiencyEngine(),
  ) {}

  /** Validates (fields + FR-7 order) and stores a fill-up on an active vehicle. */
  async add(input: NewFillUpInput): Promise<FillUp> {
    const vehicle = await this.vehicles.get(input.vehicleId);
    // Archived vehicles are read-only until restored (FR-5).
    if (!vehicle || vehicle.isArchived) {
      throw new AppError('VEHICLE_NOT_FOUND', 'No active vehicle with this id');
    }
    const now = this.clock.now();
    const value = this.validate(input, now);
    await this.assertOdometer(value, vehicle.initialOdometerM, null);
    const timestamp = now.toISOString();
    const fillUp: FillUp = {
      id: this.ids.next(),
      ...this.toRow(value),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.fillUps.insert(fillUp);
    // ReminderService.replan(vehicleId) goes here once reminders exist (Phase 2).
    return fillUp;
  }

  /** Same rules as add, checked against the vehicle's other entries (FR-11). */
  async update(id: string, changes: FillUpChanges): Promise<FillUp> {
    const existing = await this.fillUps.getById(id);
    if (!existing) throw new AppError('FILL_UP_NOT_FOUND', 'No fill-up with this id');
    const vehicle = await this.vehicles.get(existing.vehicleId);
    if (!vehicle) throw new AppError('VEHICLE_NOT_FOUND', 'No vehicle with this id');
    const now = this.clock.now();
    const value = this.validate({ ...changes, vehicleId: existing.vehicleId }, now);
    await this.assertOdometer(value, vehicle.initialOdometerM, id);
    const fillUp: FillUp = {
      ...existing,
      ...this.toRow(value),
      updatedAt: now.toISOString(),
    };
    await this.fillUps.update(fillUp);
    return fillUp;
  }

  async delete(id: string): Promise<void> {
    if (!(await this.fillUps.getById(id))) {
      throw new AppError('FILL_UP_NOT_FOUND', 'No fill-up with this id');
    }
    await this.fillUps.delete(id);
  }

  get(id: string): Promise<FillUp | null> {
    return this.fillUps.getById(id);
  }

  /** Ordered by odometer, as the efficiency engine expects. */
  listByVehicle(vehicleId: string): Promise<FillUp[]> {
    return this.fillUps.listByVehicle(vehicleId);
  }

  /** The most recent entry by date: the form pre-fills unit price and station from it (F-03). */
  async latest(vehicleId: string): Promise<FillUp | null> {
    const all = await this.fillUps.listByVehicle(vehicleId);
    return all.reduce<FillUp | null>(
      (latest, f) => (!latest || f.filledAt > latest.filledAt ? f : latest),
      null,
    );
  }

  async firstOdometerM(vehicleId: string): Promise<number | null> {
    const [first] = await this.fillUps.listByVehicle(vehicleId);
    return first?.odometerM ?? null;
  }

  /**
   * FR-7 check without saving, so the form can show the reading to beat ("must be above
   * 12,650 km"). Kept out of the thrown error because odometers are user data (rule 2).
   */
  async odometerProblem(
    vehicleId: string,
    candidate: { filledAt: Date; odometerM: number },
    editingId: string | null,
  ): Promise<OdometerProblem | null> {
    const vehicle = await this.vehicles.get(vehicleId);
    if (!vehicle) return null;
    const others = (await this.fillUps.listByVehicle(vehicleId)).filter((f) => f.id !== editingId);
    return checkOdometerOrder(candidate, others, vehicle.initialOdometerM);
  }

  /**
   * FR-8 / LLD §4.2: would this entry give an unbelievable mileage for the segment it closes or
   * opens, or more fuel than the tank holds? Computed by the engine on the vehicle's entries as
   * they would be after saving.
   */
  async warnings(input: NewFillUpInput, editingId: string | null): Promise<FillUpWarning[]> {
    const vehicle = await this.vehicles.get(input.vehicleId);
    if (!vehicle) return [];
    const others = (await this.fillUps.listByVehicle(input.vehicleId)).filter(
      (f) => f.id !== editingId,
    );
    const candidate = {
      id: CANDIDATE_ID,
      odometerM: input.odometerM,
      quantityBase: input.quantityBase,
      totalMinor: input.totalMinor,
      currency: input.currency,
      isFull: input.isFull,
      missedPrevious: input.missedPrevious,
      localDate: localDateOf(input.filledAt),
    };
    const warnings: FillUpWarning[] = [];
    // A back-dated full fill also changes the segment after it.
    const touched = this.engine
      .segments([...others, candidate])
      .filter((s) => s.endId === CANDIDATE_ID || s.startId === CANDIDATE_ID);
    for (const segment of touched) {
      const level = this.engine.plausibility(segment, vehicle);
      if (level !== 'ok') {
        warnings.push({ kind: 'efficiency', level });
        break;
      }
    }
    if (this.engine.exceedsTank(input.quantityBase, vehicle.tankCapacityBase)) {
      warnings.push({ kind: 'tank' });
    }
    return warnings;
  }

  private validate(input: NewFillUpInput, now: Date): ValidFillUpInput {
    const result = validateFillUp(input, now);
    if (!result.ok) {
      // Field names and rule codes only; never the user's values (rule 2).
      throw new AppError('INVALID_FILL_UP', 'Fill-up input is invalid', { issues: result.issues });
    }
    if (!isCurrencyCode(result.value.currency)) {
      throw new AppError('INVALID_CURRENCY', 'Currency must be an ISO 4217 code');
    }
    return result.value;
  }

  private async assertOdometer(
    value: { vehicleId: string; filledAt: Date; odometerM: number },
    initialOdometerM: number,
    editingId: string | null,
  ): Promise<void> {
    const others = (await this.fillUps.listByVehicle(value.vehicleId)).filter(
      (f) => f.id !== editingId,
    );
    const problem = checkOdometerOrder(value, others, initialOdometerM);
    if (problem) throw new AppError(problem.code, 'Odometer is out of order');
  }

  private toRow(value: ValidFillUpInput) {
    return {
      vehicleId: value.vehicleId,
      filledAt: value.filledAt.toISOString(),
      localDate: localDateOf(value.filledAt),
      odometerM: value.odometerM,
      quantityBase: value.quantityBase,
      totalMinor: value.totalMinor,
      currency: value.currency,
      isFull: value.isFull,
      missedPrevious: value.missedPrevious,
      entryMode: value.entryMode,
      station: value.station,
      note: value.note,
    };
  }
}

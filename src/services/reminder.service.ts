import type { Clock } from '@/domain/clock';
import { AppError } from '@/domain/errors';
import { localDateOf } from '@/domain/fill-up';
import type { IdGenerator } from '@/domain/id-generator';
import {
  completeReminder,
  validateReminder,
  type NewReminderInput,
  type Reminder,
} from '@/domain/reminder';
import type { ServiceEntry } from '@/domain/service-entry';
import type { ReminderRepository } from '@/repositories/reminder.repository';

import type { VehicleService } from './vehicle.service';

/**
 * The vehicle's latest known odometer (LLD §5.1), from fill-ups, services and the start. A port
 * resolved in the composition root, because those services also notify this one.
 */
export interface OdometerSource {
  currentOdometerM(vehicleId: string): Promise<number | null>;
}

/** Reminders (F-10, FR-12–14). Notifications are planned from these in Step 12. */
export class ReminderService {
  constructor(
    private readonly reminders: ReminderRepository,
    // Vehicle lookups go through its service, not its repository (rule 11).
    private readonly vehicles: VehicleService,
    private readonly odometers: OdometerSource,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async create(input: NewReminderInput): Promise<Reminder> {
    const value = await this.validate(input);
    const timestamp = this.clock.now().toISOString();
    const reminder: Reminder = {
      id: this.ids.next(),
      ...value,
      status: 'active',
      lastDoneDate: null,
      lastDoneOdometerM: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.reminders.insert(reminder);
    return reminder;
  }

  async update(id: string, input: NewReminderInput): Promise<Reminder> {
    const existing = await this.require(id);
    const value = await this.validate(input);
    const reminder: Reminder = { ...existing, ...value, updatedAt: this.clock.now().toISOString() };
    await this.reminders.update(reminder);
    return reminder;
  }

  async delete(id: string): Promise<void> {
    await this.require(id);
    await this.reminders.delete(id);
  }

  get(id: string): Promise<Reminder | null> {
    return this.reminders.getById(id);
  }

  listActive(): Promise<Reminder[]> {
    return this.reminders.listActive();
  }

  listActiveForVehicle(vehicleId: string): Promise<Reminder[]> {
    return this.reminders.listActiveForVehicle(vehicleId);
  }

  /**
   * FR-14: done today (or on `done.date`) at the given or current odometer; a repeating reminder
   * rolls forward, a one-off is finished (LLD §5.5).
   */
  async markDone(
    id: string,
    done: { date?: string; odometerM?: number | null } = {},
  ): Promise<Reminder> {
    const reminder = await this.require(id);
    return this.complete(reminder, {
      date: done.date ?? localDateOf(this.clock.now()),
      odometerM: done.odometerM ?? null,
    });
  }

  /** F-09: logging a service completes the vehicle's active reminder for the same preset. */
  async onServiceLogged(service: ServiceEntry): Promise<void> {
    if (service.typeKey === 'custom') return; // custom titles can't be matched reliably
    const matching = (await this.reminders.listActiveForVehicle(service.vehicleId)).filter(
      (r) => r.kind === 'service' && r.typeKey === service.typeKey,
    );
    for (const reminder of matching) {
      await this.complete(reminder, { date: service.servicedDate, odometerM: service.odometerM });
    }
  }

  private async complete(
    reminder: Reminder,
    done: { date: string; odometerM: number | null },
  ): Promise<Reminder> {
    const odometerM =
      done.odometerM ??
      (reminder.vehicleId ? await this.odometers.currentOdometerM(reminder.vehicleId) : null);
    const updated: Reminder = {
      ...reminder,
      ...completeReminder(reminder, { date: done.date, odometerM }),
      updatedAt: this.clock.now().toISOString(),
    };
    await this.reminders.update(updated);
    return updated;
  }

  private async validate(input: NewReminderInput) {
    if (input.vehicleId !== null) {
      const vehicle = await this.vehicles.get(input.vehicleId);
      if (!vehicle || vehicle.isArchived) {
        throw new AppError('VEHICLE_NOT_FOUND', 'No active vehicle with this id');
      }
    }
    const result = validateReminder(input);
    if (!result.ok) {
      // Field names and rule codes only; never the user's values (rule 2).
      throw new AppError('INVALID_REMINDER', 'Reminder input is invalid', {
        issues: result.issues,
      });
    }
    return result.value;
  }

  private async require(id: string): Promise<Reminder> {
    const reminder = await this.reminders.getById(id);
    if (!reminder) throw new AppError('REMINDER_NOT_FOUND', 'No reminder with this id');
    return reminder;
  }
}

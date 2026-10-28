import type { Clock } from '@/domain/clock';
import { averageDailyM, predictedDueDate } from '@/domain/distance-forecaster';
import { localDateOf } from '@/domain/fill-up';
import { reminderStatus, type Reminder } from '@/domain/reminder';
import {
  NUDGE,
  planNotifications,
  planWeeklyNudge,
  type NotificationKind,
  type PlannableReminder,
} from '@/domain/reminder-planner';
import { currentOdometerM } from '@/domain/vehicle-stats';
import type { NotificationContent, PermissionState } from '@/notifications/notification-gateway';
import type { NotificationScheduler } from '@/notifications/notification-scheduler';

import type { FillUpService } from './fill-up.service';
import type { ReminderService } from './reminder.service';
import type { ServiceLogService } from './service-log.service';
import type { SettingsService } from './settings.service';
import type { VehicleService } from './vehicle.service';

export type NotificationTextInput =
  | {
      kind: NotificationKind;
      reminder: Reminder;
      /** Null for person-level reminders (licence). */
      vehicleName: string | null;
      dueDate: string;
    }
  /** The weekly "log your fill-up" nudge (F-11). */
  | { kind: 'nudge' };

/** Words for a notification in the user's language; supplied by the UI layer (i18n). */
export type NotificationTexts = (input: NotificationTextInput) => NotificationContent;

/**
 * Plans reminder notifications from the stored data and hands them to NotificationScheduler
 * (LLD §4.3). Runs on app foreground, after data changes and after settings changes.
 */
export class ReminderNotificationService {
  constructor(
    private readonly reminders: ReminderService,
    private readonly vehicles: VehicleService,
    private readonly fillUps: FillUpService,
    private readonly services: ServiceLogService,
    private readonly scheduler: NotificationScheduler,
    private readonly clock: Clock,
    // Weekly nudge on/off (notify_weekly_nudge).
    private readonly settings: SettingsService,
  ) {}

  permission(): Promise<PermissionState> {
    return this.scheduler.permission();
  }

  ensurePermission(): Promise<PermissionState> {
    return this.scheduler.ensurePermission();
  }

  async sync(texts: NotificationTexts): Promise<void> {
    const now = this.clock.now();
    const today = localDateOf(now);
    const active = await this.reminders.listActive();
    const odometers = new Map<
      string,
      { name: string; current: number; avgDaily: number | null } | null
    >();

    const items: (PlannableReminder & { reminder: Reminder })[] = [];
    for (const reminder of active) {
      let vehicle: { name: string; current: number; avgDaily: number | null } | null = null;
      if (reminder.vehicleId !== null) {
        if (!odometers.has(reminder.vehicleId)) {
          odometers.set(reminder.vehicleId, await this.vehicleOdometer(reminder.vehicleId, today));
        }
        vehicle = odometers.get(reminder.vehicleId) ?? null;
        // Archived (or missing) vehicles stay quiet until restored (FR-5).
        if (!vehicle) continue;
      }
      const predictedDate =
        vehicle && reminder.dueOdometerM !== null
          ? predictedDueDate(reminder.dueOdometerM, vehicle.current, vehicle.avgDaily, today)
          : null;
      const view = reminderStatus(reminder, {
        today,
        currentOdometerM: vehicle?.current ?? null,
        predictedDate,
      });
      items.push({ reminder, effectiveDate: view.effectiveDate });
    }

    const byId = new Map(items.map((i) => [i.reminder.id, i.reminder]));
    const requests = planNotifications(items, now).map((n) => {
      const reminder = byId.get(n.reminderId)!;
      const vehicleName = reminder.vehicleId
        ? (odometers.get(reminder.vehicleId)?.name ?? null)
        : null;
      return {
        key: n.key,
        fireAt: n.fireAt,
        content: texts({ kind: n.kind, reminder, vehicleName, dueDate: n.dueDate }),
      };
    });
    const nudgeAt = await this.nextNudge(now);
    if (nudgeAt)
      requests.push({ key: NUDGE.key, fireAt: nudgeAt, content: texts({ kind: 'nudge' }) });
    // One budget for everything: the soonest 60 win (AGENTS.md rule 8).
    requests.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
    await this.scheduler.sync(requests);
  }

  /** KB §3: Sunday 10:00 after a week with no fill-up or service on any active vehicle. */
  private async nextNudge(now: Date): Promise<Date | null> {
    const enabled = await this.settings.isWeeklyNudgeOn();
    const active = enabled ? await this.vehicles.list() : [];
    let lastEntryDate: string | null = null;
    for (const v of active) {
      const [fills, logged] = await Promise.all([
        this.fillUps.listByVehicle(v.id),
        this.services.listByVehicle(v.id),
      ]);
      for (const day of [...fills.map((f) => f.localDate), ...logged.map((s) => s.servicedDate)]) {
        if (lastEntryDate === null || day > lastEntryDate) lastEntryDate = day;
      }
    }
    return planWeeklyNudge({ enabled, hasVehicle: active.length > 0, lastEntryDate, now });
  }

  private async vehicleOdometer(vehicleId: string, today: string) {
    const vehicle = await this.vehicles.get(vehicleId);
    if (!vehicle || vehicle.isArchived) return null;
    const [fills, logged] = await Promise.all([
      this.fillUps.listByVehicle(vehicleId),
      this.services.listByVehicle(vehicleId),
    ]);
    const readings = [
      ...fills.map((f) => ({ date: f.localDate, odometerM: f.odometerM })),
      ...logged.flatMap((s) =>
        s.odometerM === null ? [] : [{ date: s.servicedDate, odometerM: s.odometerM }],
      ),
    ];
    return {
      name: vehicle.name,
      current: currentOdometerM([...fills, ...logged], vehicle.initialOdometerM),
      avgDaily: averageDailyM(readings, today),
    };
  }
}

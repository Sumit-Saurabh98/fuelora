import { addDays, daysBetween } from './dates';
import { leadDate, type Reminder } from './reminder';

// LLD §5.4 / FR-15: which local notifications should exist right now. Pure: the
// NotificationScheduler diffs this against what the OS has scheduled.

/** iOS allows 64 pending notifications per app; keep headroom (AGENTS.md rule 8). */
export const NOTIFICATION_BUDGET = 60;
export const NOTIFY_HOUR = 9;
/** Overdue reminders notify once more this many days after the due date, then only in-app. */
export const OVERDUE_AFTER_DAYS = 3;

export type NotificationKind = 'lead' | 'due' | 'overdue';

/** KB §3: Sunday 10:00, only after a week with nothing logged. */
export const NUDGE = { key: 'weekly_nudge', weekday: 0, hour: 10, quietDays: 7 } as const;

export type DesiredNotification = {
  /** Stable per reminder and kind, so re-planning doesn't duplicate. */
  key: string;
  reminderId: string;
  kind: NotificationKind;
  /** Local wall-clock instant (09:00 on the day). */
  fireAt: Date;
  /** The day it is about (YYYY-MM-DD), for the text. */
  dueDate: string;
};

export type PlannableReminder = {
  reminder: Pick<Reminder, 'id' | 'leadDays' | 'status'>;
  /** LLD §5.3 effective due date (set date, forecast, or the earlier); null = nothing to time. */
  effectiveDate: string | null;
};

/** 09:00 local on a calendar day. */
export function atNotifyHour(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y!, m! - 1, d!, NOTIFY_HOUR, 0, 0, 0);
}

/**
 * One notification on the lead day, one on the due day, one 3 days after: each only if still
 * in the future, never two for one reminder on the same day. Soonest first, at most 60. A
 * distance reminder without a forecast has no date, so it shows in the app only.
 */
export function planNotifications(
  items: readonly PlannableReminder[],
  now: Date,
): DesiredNotification[] {
  const planned: DesiredNotification[] = [];
  for (const { reminder, effectiveDate } of items) {
    if (reminder.status !== 'active' || effectiveDate === null) continue;
    const days = new Map<string, NotificationKind>();
    if (reminder.leadDays > 0) days.set(leadDate(effectiveDate, reminder.leadDays), 'lead');
    days.set(effectiveDate, 'due');
    days.set(addDays(effectiveDate, OVERDUE_AFTER_DAYS), 'overdue');
    for (const [day, kind] of days) {
      const fireAt = atNotifyHour(day);
      if (fireAt.getTime() <= now.getTime()) continue;
      planned.push({
        key: `${reminder.id}:${kind}`,
        reminderId: reminder.id,
        kind,
        fireAt,
        dueDate: effectiveDate,
      });
    }
  }
  return planned
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime() || a.key.localeCompare(b.key))
    .slice(0, NOTIFICATION_BUDGET);
}

/**
 * The next weekly nudge (KB §3, F-11): the first Sunday 10:00 after `now` that is at least 7 days
 * after the last fill-up or service. Re-planned after every entry, so logging pushes it out.
 * Null when turned off or with no vehicle to log for. `lastEntryDate` is YYYY-MM-DD or null.
 */
export function planWeeklyNudge(options: {
  enabled: boolean;
  hasVehicle: boolean;
  lastEntryDate: string | null;
  now: Date;
}): Date | null {
  if (!options.enabled || !options.hasVehicle) return null;
  const { now } = options;
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), NUDGE.hour, 0, 0, 0);
  // Step to the next Sunday 10:00 that is still ahead.
  while (candidate.getDay() !== NUDGE.weekday || candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  if (options.lastEntryDate) {
    const day = () =>
      `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, '0')}-${String(candidate.getDate()).padStart(2, '0')}`;
    while (daysBetween(options.lastEntryDate, day()) < NUDGE.quietDays) {
      candidate.setDate(candidate.getDate() + 7);
    }
  }
  return candidate;
}

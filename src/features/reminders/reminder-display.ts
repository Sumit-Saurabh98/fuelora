import type { TFunction } from 'i18next';

import { daysBetween } from '@/domain/dates';
import type { Region } from '@/domain/regions';
import {
  documentNameKey,
  isDocumentKey,
  reminderStatus,
  type Reminder,
  type ReminderState,
  type ReminderStatusView,
} from '@/domain/reminder';
import type { UnitPreferences } from '@/domain/unit-preferences';
import { formatDay } from '@/ui/format';

import { distanceText } from '../fill-up/figures-text';

type Ctx = { t: TFunction; units: UnitPreferences; locale: string; region: Region };

/** "Engine oil change", "PUC" / "MOT", or the user's own title. */
export function reminderName(reminder: Pick<Reminder, 'typeKey' | 'title'>, ctx: Ctx): string {
  if (reminder.typeKey === 'custom') return reminder.title ?? '';
  if (isDocumentKey(reminder.typeKey)) return ctx.t(documentNameKey(reminder.typeKey, ctx.region));
  return ctx.t(`servicePresets.${reminder.typeKey}`);
}

/** "Due 15 Nov 2026 · in 18 days", "300 km to go", "Overdue since 20 Oct 2026"… */
export function dueText(view: ReminderStatusView, today: string, ctx: Ctx): string {
  const parts: string[] = [];
  if (view.effectiveDate) {
    const date = formatDay(view.effectiveDate, ctx.locale);
    const days = daysBetween(today, view.effectiveDate);
    if (days < 0) parts.push(ctx.t('reminders.overdueSince', { date }));
    else if (days === 0) parts.push(ctx.t('reminders.dueToday'));
    else if (days === 1) parts.push(ctx.t('reminders.dueTomorrow'));
    else parts.push(ctx.t('reminders.dueOn', { date, days }));
  }
  if (view.remainingM !== null) {
    parts.push(
      view.remainingM > 0
        ? ctx.t('reminders.toGo', { distance: distanceText(view.remainingM, ctx) })
        : ctx.t('reminders.pastBy', { distance: distanceText(-view.remainingM, ctx) }),
    );
  }
  return parts.join(' · ');
}

const ORDER: Record<ReminderState, number> = { overdue: 0, due: 1, due_soon: 2, upcoming: 3 };

/** Most urgent first; then the nearest date, then the nearest distance (LLD §5.3). */
export function sortedByUrgency(
  reminders: readonly Reminder[],
  context: { today: string; currentOdometerM: number | null },
): { reminder: Reminder; view: ReminderStatusView }[] {
  return reminders
    .map((reminder) => ({ reminder, view: reminderStatus(reminder, context) }))
    .sort(
      (a, b) =>
        ORDER[a.view.state] - ORDER[b.view.state] ||
        (a.view.effectiveDate ?? '9999').localeCompare(b.view.effectiveDate ?? '9999') ||
        (a.view.remainingM ?? Infinity) - (b.view.remainingM ?? Infinity),
    );
}

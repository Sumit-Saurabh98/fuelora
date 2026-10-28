import type { TFunction } from 'i18next';

import type { Region } from '@/domain/regions';
import type { UnitPreferences } from '@/domain/unit-preferences';
import type { NotificationTexts } from '@/services/reminder-notification.service';
import { formatDay } from '@/ui/format';

import { reminderName } from './reminder-display';

/** Notification words in the app language, with region names (PUC / MOT, KB §4). */
export function notificationTexts(ctx: {
  t: TFunction;
  units: UnitPreferences;
  locale: string;
  region: Region;
}): NotificationTexts {
  return (input) => {
    if (input.kind === 'nudge') {
      return { title: ctx.t('notifications.nudgeTitle'), body: ctx.t('notifications.nudgeBody') };
    }
    const { kind, reminder, vehicleName, dueDate } = input;
    const name = reminderName(reminder, ctx);
    const date = formatDay(dueDate, ctx.locale);
    return {
      title: vehicleName ? `${name} · ${vehicleName}` : name,
      body:
        kind === 'lead'
          ? ctx.t('notifications.lead', { date })
          : kind === 'due'
            ? ctx.t('notifications.due')
            : ctx.t('notifications.overdue', { date }),
    };
  };
}

import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getContainer } from '@/container';
import { getDatabase } from '@/db/client';
import { settings } from '@/db/schema';
import { SETTING_KEYS } from '@/services/settings.service';

/** The weekly nudge switch, kept live; on unless turned off (F-11). */
export function useWeeklyNudge(): { on: boolean; setOn: (on: boolean) => Promise<void> } {
  const { db } = getDatabase();
  const { data } = useLiveQuery(
    db.select().from(settings).where(eq(settings.key, SETTING_KEYS.weeklyNudge)),
  );
  return {
    on: data?.[0]?.value !== 'false',
    // The settings change re-plans notifications (useNotificationSync watches the table).
    setOn: (on) => getContainer().settingsService.setWeeklyNudge(on),
  };
}

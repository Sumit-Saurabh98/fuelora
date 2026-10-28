import { and, asc, eq, isNull, or } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getDatabase } from '@/db/client';
import { reminders } from '@/db/schema';
import type { Reminder } from '@/domain/reminder';

/**
 * Active reminders of a vehicle plus person-level ones (licence), kept live; `undefined` while
 * loading. Without a vehicle, only person-level ones.
 */
export function useActiveReminders(vehicleId: string | null): Reminder[] | undefined {
  const { db } = getDatabase();
  const scope = vehicleId
    ? or(eq(reminders.vehicleId, vehicleId), isNull(reminders.vehicleId))
    : isNull(reminders.vehicleId);
  const { data, updatedAt } = useLiveQuery(
    db
      .select()
      .from(reminders)
      .where(and(eq(reminders.status, 'active'), scope))
      .orderBy(asc(reminders.createdAt)),
    [vehicleId],
  );
  return updatedAt ? data : undefined;
}

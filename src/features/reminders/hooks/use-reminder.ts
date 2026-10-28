import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getDatabase } from '@/db/client';
import { reminders } from '@/db/schema';
import type { Reminder } from '@/domain/reminder';

/** One reminder, kept live; `undefined` while loading, null when it doesn't exist. */
export function useReminder(id: string): Reminder | null | undefined {
  const { db } = getDatabase();
  const { data, updatedAt } = useLiveQuery(
    db.select().from(reminders).where(eq(reminders.id, id)).limit(1),
    [id],
  );
  if (!updatedAt) return undefined;
  return data[0] ?? null;
}

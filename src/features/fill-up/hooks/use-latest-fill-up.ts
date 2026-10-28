import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getDatabase } from '@/db/client';
import { fillUps } from '@/db/schema';
import type { FillUp } from '@/domain/fill-up';

/** Newest fill-up of a vehicle by date; `undefined` while loading, null when there are none. */
export function useLatestFillUp(vehicleId: string): FillUp | null | undefined {
  const { db } = getDatabase();
  const { data, updatedAt } = useLiveQuery(
    db
      .select()
      .from(fillUps)
      .where(eq(fillUps.vehicleId, vehicleId))
      .orderBy(desc(fillUps.filledAt))
      .limit(1),
    [vehicleId],
  );
  if (!updatedAt) return undefined;
  return data[0] ?? null;
}

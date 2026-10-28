import { asc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getDatabase } from '@/db/client';
import { fillUps } from '@/db/schema';
import type { FillUp } from '@/domain/fill-up';

/** A vehicle's fill-ups by odometer, kept live; `undefined` while loading. */
export function useVehicleFillUps(vehicleId: string): FillUp[] | undefined {
  const { db } = getDatabase();
  const { data, updatedAt } = useLiveQuery(
    db
      .select()
      .from(fillUps)
      .where(eq(fillUps.vehicleId, vehicleId))
      .orderBy(asc(fillUps.odometerM)),
    [vehicleId],
  );
  return updatedAt ? data : undefined;
}

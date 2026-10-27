import { and, asc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getDatabase } from '@/db/client';
import { settings, vehicles } from '@/db/schema';
import { pickCurrentVehicle, type Vehicle } from '@/domain/vehicle';
import { SETTING_KEYS } from '@/services/settings.service';

/** The current vehicle, kept live: re-renders after any write to vehicles or settings. */
export function useCurrentVehicle(): Vehicle | null {
  const { db } = getDatabase();
  const { data: active } = useLiveQuery(
    db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.isArchived, false)))
      .orderBy(asc(vehicles.sortOrder), asc(vehicles.createdAt)),
  );
  const { data: current } = useLiveQuery(
    db.select().from(settings).where(eq(settings.key, SETTING_KEYS.currentVehicleId)),
  );
  return pickCurrentVehicle(active ?? [], current?.[0]?.value ?? null);
}

import { asc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getDatabase } from '@/db/client';
import { settings, vehicles } from '@/db/schema';
import { pickCurrentVehicle, type Vehicle } from '@/domain/vehicle';
import { SETTING_KEYS } from '@/services/settings.service';

export type VehicleLists = {
  active: Vehicle[];
  archived: Vehicle[];
  /** The vehicle that opens by default; null when there are no active vehicles. */
  currentId: string | null;
};

/** Every vehicle split for the vehicles screen, kept live after any write. */
export function useVehicles(): VehicleLists {
  const { db } = getDatabase();
  const { data: all } = useLiveQuery(
    db.select().from(vehicles).orderBy(asc(vehicles.sortOrder), asc(vehicles.createdAt)),
  );
  const { data: current } = useLiveQuery(
    db.select().from(settings).where(eq(settings.key, SETTING_KEYS.currentVehicleId)),
  );
  const rows = all ?? [];
  const active = rows.filter((v) => !v.isArchived);
  return {
    active,
    archived: rows.filter((v) => v.isArchived),
    currentId: pickCurrentVehicle(active, current?.[0]?.value ?? null)?.id ?? null,
  };
}

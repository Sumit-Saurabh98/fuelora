import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getDatabase } from '@/db/client';
import { vehicles } from '@/db/schema';
import type { Vehicle } from '@/domain/vehicle';

/** One vehicle, kept live; `undefined` while loading, null when it doesn't exist. */
export function useVehicle(id: string): Vehicle | null | undefined {
  const { db } = getDatabase();
  const { data, updatedAt } = useLiveQuery(
    db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1),
    [id],
  );
  if (!updatedAt) return undefined;
  return data[0] ?? null;
}

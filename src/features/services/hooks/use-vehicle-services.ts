import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getDatabase } from '@/db/client';
import { services } from '@/db/schema';
import type { ServiceEntry } from '@/domain/service-entry';

/** A vehicle's services, newest first, kept live; `undefined` while loading. */
export function useVehicleServices(vehicleId: string): ServiceEntry[] | undefined {
  const { db } = getDatabase();
  const { data, updatedAt } = useLiveQuery(
    db
      .select()
      .from(services)
      .where(eq(services.vehicleId, vehicleId))
      .orderBy(desc(services.servicedDate)),
    [vehicleId],
  );
  return updatedAt ? data : undefined;
}

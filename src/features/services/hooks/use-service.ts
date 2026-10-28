import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getDatabase } from '@/db/client';
import { services } from '@/db/schema';
import type { ServiceEntry } from '@/domain/service-entry';

/** One service, kept live; `undefined` while loading, null when it doesn't exist. */
export function useService(id: string): ServiceEntry | null | undefined {
  const { db } = getDatabase();
  const { data, updatedAt } = useLiveQuery(
    db.select().from(services).where(eq(services.id, id)).limit(1),
    [id],
  );
  if (!updatedAt) return undefined;
  return data[0] ?? null;
}

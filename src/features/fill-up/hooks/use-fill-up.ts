import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getDatabase } from '@/db/client';
import { fillUps } from '@/db/schema';
import type { FillUp } from '@/domain/fill-up';

/** One fill-up, kept live; `undefined` while loading, null when it doesn't exist. */
export function useFillUp(id: string): FillUp | null | undefined {
  const { db } = getDatabase();
  const { data, updatedAt } = useLiveQuery(
    db.select().from(fillUps).where(eq(fillUps.id, id)).limit(1),
    [id],
  );
  if (!updatedAt) return undefined;
  return data[0] ?? null;
}

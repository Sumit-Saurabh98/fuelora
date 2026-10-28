import { count, gt } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useState } from 'react';

import { getContainer } from '@/container';
import { getDatabase } from '@/db/client';
import { fillUps, services } from '@/db/schema';
import { shouldNudgeBackup } from '@/domain/backup';

/** FR-27: whether Home should ask for a backup now, and the two ways to answer. */
export function useBackupNudge() {
  const { db } = getDatabase();
  const backups = getContainer().backupService;
  const [lastExportAt, setLastExportAt] = useState(() => backups.lastExportAt());
  const [lastNudgeAt, setLastNudgeAt] = useState(() => backups.lastNudgeAt());
  // Never exported: everything counts as new (the epoch is before any entry).
  const since = lastExportAt ?? '1970-01-01T00:00:00.000Z';
  const { data: allFills } = useLiveQuery(db.select({ n: count() }).from(fillUps));
  const { data: allServices } = useLiveQuery(db.select({ n: count() }).from(services));
  const { data: newFills } = useLiveQuery(
    db.select({ n: count() }).from(fillUps).where(gt(fillUps.createdAt, since)),
    [since],
  );
  const { data: newServices } = useLiveQuery(
    db.select({ n: count() }).from(services).where(gt(services.createdAt, since)),
    [since],
  );
  const n = (rows: { n: number }[] | undefined) => rows?.[0]?.n ?? 0;

  return {
    show: shouldNudgeBackup({
      lastExportAt,
      lastNudgeAt,
      entries: n(allFills) + n(allServices),
      entriesSinceExport: n(newFills) + n(newServices),
      now: getContainer().clock.now(),
    }),
    later: () => {
      backups.markNudged();
      setLastNudgeAt(backups.lastNudgeAt());
    },
    /** After a successful export the nudge goes away by itself. */
    exported: () => setLastExportAt(backups.lastExportAt()),
  };
}

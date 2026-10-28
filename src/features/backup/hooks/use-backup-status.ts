import { count } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getContainer } from '@/container';
import { getDatabase } from '@/db/client';
import { fillUps, services } from '@/db/schema';
import { backupStatus, type BackupStatus } from '@/domain/backup';

/** FR-26 status for Settings; `refresh` after an export (MMKV isn't observable). */
export function useBackupStatus(): BackupStatus & { refresh: () => void } {
  const { db } = getDatabase();
  const { data: fills } = useLiveQuery(db.select({ n: count() }).from(fillUps));
  const { data: logged } = useLiveQuery(db.select({ n: count() }).from(services));
  const read = () => getContainer().backupService.lastExportAt();
  const [lastExportAt, setLastExportAt] = useState(read);
  const refresh = useCallback(
    () => setLastExportAt(getContainer().backupService.lastExportAt()),
    [],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const hasEntries = (fills?.[0]?.n ?? 0) + (logged?.[0]?.n ?? 0) > 0;
  return { ...backupStatus(lastExportAt, getContainer().clock.now(), hasEntries), refresh };
}

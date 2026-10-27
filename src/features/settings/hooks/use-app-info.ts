import Constants from 'expo-constants';
import { useMemo } from 'react';

import { getDatabase } from '@/db/client';
import { readDatabaseInfo, type DatabaseInfo } from '@/db/database-info';

export type AppInfo = {
  appVersion: string;
  database: { ok: true; info: DatabaseInfo } | { ok: false };
};

export function useAppInfo(): AppInfo {
  return useMemo(() => {
    const appVersion = Constants.expoConfig?.version ?? '—';
    try {
      return { appVersion, database: { ok: true, info: readDatabaseInfo(getDatabase().sqlite) } };
    } catch {
      return { appVersion, database: { ok: false } };
    }
  }, []);
}

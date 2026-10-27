import { DevSettings } from 'react-native';

import { getDatabase } from '@/db/client';
import { resetAllData } from '@/db/dev-reset';

/** Deletes all app data and restarts the JS app. Only reachable from dev builds. */
export function useDevReset(): () => void {
  return () => {
    resetAllData((sql) => getDatabase().sqlite.execSync(sql));
    DevSettings.reload();
  };
}

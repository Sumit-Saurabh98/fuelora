import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';

import { runMigrations } from '@/db/run-migrations';
import { FONT_ASSETS } from '@/ui/fonts';

export type StartupState = 'loading' | 'ready' | 'error';

export function useAppStartup(): StartupState {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const [db, setDb] = useState<StartupState>('loading');

  useEffect(() => {
    let cancelled = false;
    runMigrations().then(
      () => !cancelled && setDb('ready'),
      () => !cancelled && setDb('error'),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // A font failure only degrades to system fonts; a database failure must stop the app
  // before any screen reads or writes.
  const fontsDone = fontsLoaded || fontError !== null;
  if (db === 'error') return 'error';
  return fontsDone && db === 'ready' ? 'ready' : 'loading';
}

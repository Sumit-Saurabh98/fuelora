import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';

import { getContainer } from '@/container';
import { runMigrations } from '@/db/run-migrations';
import { FONT_ASSETS } from '@/ui/fonts';

import { hydrateOnboarding } from '../onboarding/onboarding.store';
import { hydratePreferences } from '../settings/preferences.store';

export type StartupState = 'loading' | 'ready' | 'error';

async function prepareData(): Promise<void> {
  await runMigrations();
  try {
    await hydratePreferences(getContainer().settingsService);
  } catch (error: unknown) {
    // Defaults are fine if preferences can't be read; the database itself is usable.
    console.warn('Could not load preferences', error);
  }
  // Unlike preferences, this must succeed: guessing could hide onboarding from a new user.
  await hydrateOnboarding(getContainer().onboardingService);
}

export function useAppStartup(): StartupState {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const [db, setDb] = useState<StartupState>('loading');

  useEffect(() => {
    let cancelled = false;
    prepareData().then(
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

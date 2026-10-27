import { create } from 'zustand';

import { getContainer } from '@/container';
import type { Language, ThemeMode } from '@/domain/preferences';
import { regionFromCountry, type Region } from '@/domain/regions';
import type { UnitOverrides, UnitPreference, UnitPreferences } from '@/domain/unit-preferences';
import { deviceLanguage, deviceLocale, i18n } from '@/i18n/i18n';
import type { SettingsService } from '@/services/settings.service';

export type { ThemeMode };

type PreferencesState = {
  themeMode: ThemeMode;
  language: Language;
  region: Region;
  unitOverrides: UnitOverrides;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (language: Language) => void;
  /** Also resets unit overrides to the new region's defaults. */
  setRegion: (region: Region) => void;
  setUnit: <K extends UnitPreference>(key: K, value: UnitPreferences[K]) => void;
  resetUnits: () => void;
};

function deviceRegion(): Region {
  return regionFromCountry(deviceLocale().regionCode);
}

// The UI updates immediately; writes to SQLite run in the background, one at a time in the order
// the user made them. Without the queue, "change region" (save + clear overrides) could finish
// after a quick unit change and delete it. A failed write only loses that preference, never user
// data, so it is logged and the queue continues.
let writes: Promise<void> = Promise.resolve();

function persist(write: () => Promise<void>): void {
  writes = writes
    .then(write)
    .catch((error: unknown) => console.warn('Could not save preference', error));
}

/** Resolves when every queued preference write has finished (tests, before backup export). */
export function preferenceWritesSettled(): Promise<void> {
  return writes;
}

export const usePreferences = create<PreferencesState>()((set) => ({
  themeMode: 'system',
  language: deviceLanguage(),
  region: deviceRegion(),
  unitOverrides: {},
  setThemeMode: (themeMode) => {
    set({ themeMode });
    persist(() => getContainer().settingsService.setThemeMode(themeMode));
  },
  setLanguage: (language) => {
    void i18n.changeLanguage(language);
    set({ language });
    persist(() => getContainer().settingsService.setLanguage(language));
  },
  setRegion: (region) => {
    set({ region, unitOverrides: {} });
    persist(() => getContainer().settingsService.changeRegion(region));
  },
  setUnit: (key, value) => {
    set((state) => ({ unitOverrides: { ...state.unitOverrides, [key]: value } }));
    persist(() => getContainer().settingsService.setUnit(key, value));
  },
  resetUnits: () => {
    set({ unitOverrides: {} });
    persist(() => getContainer().settingsService.clearUnitOverrides());
  },
}));

/** Loads saved preferences into the store; called once at startup, before the splash hides. */
export async function hydratePreferences(service: SettingsService): Promise<void> {
  const saved = await service.getPreferences();
  const language = saved.language ?? deviceLanguage();
  await i18n.changeLanguage(language);
  usePreferences.setState({
    themeMode: saved.themeMode,
    language,
    region: saved.region ?? deviceRegion(),
    unitOverrides: saved.unitOverrides,
  });
}

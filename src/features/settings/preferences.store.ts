import { create } from 'zustand';

import { getContainer } from '@/container';
import type { Language, ThemeMode } from '@/domain/preferences';
import { deviceLanguage, i18n } from '@/i18n/i18n';
import type { SettingsService } from '@/services/settings.service';

export type { ThemeMode };

type PreferencesState = {
  themeMode: ThemeMode;
  language: Language;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (language: Language) => void;
};

// The UI updates immediately; the write to SQLite happens in the background. A failed write
// only loses the preference, never user data, so it is logged rather than surfaced.
function persist(write: Promise<void>): void {
  write.catch((error: unknown) => console.warn('Could not save preference', error));
}

export const usePreferences = create<PreferencesState>()((set) => ({
  themeMode: 'system',
  language: deviceLanguage(),
  setThemeMode: (themeMode) => {
    set({ themeMode });
    persist(getContainer().settingsService.setThemeMode(themeMode));
  },
  setLanguage: (language) => {
    void i18n.changeLanguage(language);
    set({ language });
    persist(getContainer().settingsService.setLanguage(language));
  },
}));

/** Loads saved preferences into the store; called once at startup, before the splash hides. */
export async function hydratePreferences(service: SettingsService): Promise<void> {
  const saved = await service.getAppearance();
  const language = saved.language ?? deviceLanguage();
  await i18n.changeLanguage(language);
  usePreferences.setState({ themeMode: saved.themeMode, language });
}

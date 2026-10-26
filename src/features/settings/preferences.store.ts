import { create } from 'zustand';

import { deviceLanguage, i18n, type Language } from '@/i18n/i18n';

export type ThemeMode = 'system' | 'light' | 'dark';

type PreferencesState = {
  themeMode: ThemeMode;
  language: Language;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (language: Language) => void;
};

// In-memory for Phase 0. These move to the SQLite `settings` table in Phase 1 so they
// travel with backups (ARCHITECTURE.md, MMKV is only for non-user flags).
export const usePreferences = create<PreferencesState>()((set) => ({
  themeMode: 'system',
  language: deviceLanguage(),
  setThemeMode: (themeMode) => set({ themeMode }),
  setLanguage: (language) => {
    void i18n.changeLanguage(language);
    set({ language });
  },
}));

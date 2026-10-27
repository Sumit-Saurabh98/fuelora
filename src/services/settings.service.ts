import type { Clock } from '@/domain/clock';
import { isLanguage, isThemeMode, type Language, type ThemeMode } from '@/domain/preferences';
import type { SettingsRepository } from '@/repositories/settings.repository';

// Key names match LLD §2 so they line up with the backup format.
const KEYS = { theme: 'theme', language: 'language' } as const;

export type AppearancePreferences = {
  themeMode: ThemeMode;
  /** null = never chosen; the UI falls back to the device language. */
  language: Language | null;
};

export class SettingsService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly clock: Clock,
  ) {}

  async getAppearance(): Promise<AppearancePreferences> {
    const all = await this.settings.getAll();
    const theme = all.get(KEYS.theme);
    const language = all.get(KEYS.language);
    // Unknown stored values (e.g. from a newer app's backup) fall back instead of breaking startup.
    return {
      themeMode: isThemeMode(theme) ? theme : 'system',
      language: isLanguage(language) ? language : null,
    };
  }

  setThemeMode(mode: ThemeMode): Promise<void> {
    return this.save(KEYS.theme, mode);
  }

  setLanguage(language: Language): Promise<void> {
    return this.save(KEYS.language, language);
  }

  private save(key: string, value: string): Promise<void> {
    return this.settings.set(key, value, this.clock.now().toISOString());
  }
}

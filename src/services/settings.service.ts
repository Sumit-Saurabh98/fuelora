import type { Clock } from '@/domain/clock';
import { isLanguage, isThemeMode, type Language, type ThemeMode } from '@/domain/preferences';
import { isRegion, type Region } from '@/domain/regions';
import type { SettingsRepository } from '@/repositories/settings.repository';

// Key names match LLD §2 so they line up with the backup format.
const KEYS = { theme: 'theme', language: 'language', region: 'region' } as const;

export type Preferences = {
  themeMode: ThemeMode;
  /** null = never chosen; the UI falls back to the device language. */
  language: Language | null;
  /** null = never chosen; the UI falls back to the device country. */
  region: Region | null;
};

export class SettingsService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly clock: Clock,
  ) {}

  async getPreferences(): Promise<Preferences> {
    const all = await this.settings.getAll();
    const theme = all.get(KEYS.theme);
    const language = all.get(KEYS.language);
    const region = all.get(KEYS.region);
    // Unknown stored values (e.g. from a newer app's backup) fall back instead of breaking startup.
    return {
      themeMode: isThemeMode(theme) ? theme : 'system',
      language: isLanguage(language) ? language : null,
      region: isRegion(region) ? region : null,
    };
  }

  setThemeMode(mode: ThemeMode): Promise<void> {
    return this.save(KEYS.theme, mode);
  }

  setLanguage(language: Language): Promise<void> {
    return this.save(KEYS.language, language);
  }

  setRegion(region: Region): Promise<void> {
    return this.save(KEYS.region, region);
  }

  private save(key: string, value: string): Promise<void> {
    return this.settings.set(key, value, this.clock.now().toISOString());
  }
}

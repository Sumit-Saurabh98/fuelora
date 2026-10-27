import type { Clock } from '@/domain/clock';
import { isLanguage, isThemeMode, type Language, type ThemeMode } from '@/domain/preferences';
import { isRegion, type Region } from '@/domain/regions';
import {
  isValidUnitValue,
  UNIT_PREFERENCES,
  type UnitOverrides,
  type UnitPreference,
  type UnitPreferences,
} from '@/domain/unit-preferences';
import type { SettingsRepository } from '@/repositories/settings.repository';

// Key names match LLD §2 so they line up with the backup format.
const KEYS = { theme: 'theme', language: 'language', region: 'region' } as const;

const UNIT_KEYS: Record<UnitPreference, string> = {
  currency: 'currency',
  distanceUnit: 'distance_unit',
  volumeUnit: 'volume_unit',
  efficiencyLiquid: 'efficiency_format_liquid',
  efficiencyEv: 'efficiency_format_ev',
};

export type Preferences = {
  themeMode: ThemeMode;
  /** null = never chosen; the UI falls back to the device language. */
  language: Language | null;
  /** null = never chosen; the UI falls back to the device country. */
  region: Region | null;
  /** Only the units the user changed; the rest follow the region. */
  unitOverrides: UnitOverrides;
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
    const unitOverrides: Record<string, unknown> = {};
    for (const key of UNIT_PREFERENCES) {
      const value = all.get(UNIT_KEYS[key]);
      if (isValidUnitValue(key, value)) unitOverrides[key] = value;
    }
    return {
      themeMode: isThemeMode(theme) ? theme : 'system',
      language: isLanguage(language) ? language : null,
      region: isRegion(region) ? region : null,
      unitOverrides: unitOverrides as UnitOverrides,
    };
  }

  setThemeMode(mode: ThemeMode): Promise<void> {
    return this.save(KEYS.theme, mode);
  }

  setLanguage(language: Language): Promise<void> {
    return this.save(KEYS.language, language);
  }

  /** Saves the region and drops unit overrides so the new region's defaults apply. */
  async changeRegion(region: Region): Promise<void> {
    await this.save(KEYS.region, region);
    await this.clearUnitOverrides();
  }

  setUnit<K extends UnitPreference>(key: K, value: UnitPreferences[K]): Promise<void> {
    return this.save(UNIT_KEYS[key], value);
  }

  clearUnitOverrides(): Promise<void> {
    return this.settings.remove(UNIT_PREFERENCES.map((k) => UNIT_KEYS[k]));
  }

  private save(key: string, value: string): Promise<void> {
    return this.settings.set(key, value, this.clock.now().toISOString());
  }
}

import { useMemo } from 'react';

import { regionDefaults, type Region } from '@/domain/regions';
import { resolveUnits, type UnitPreferences } from '@/domain/unit-preferences';
import { deviceLocale } from '@/i18n/i18n';
import { formatLocale } from '@/ui/format';

import { usePreferences } from '../preferences.store';

// Without a device currency (rare), OTHER shows USD until the user picks a currency.
const FALLBACK_CURRENCY = 'USD';

export type UnitContext = {
  region: Region;
  units: UnitPreferences;
  regionUnits: UnitPreferences;
  /** Locale for numbers and money (language + region, or the device's for OTHER). */
  locale: string;
  deviceCurrency: string;
  hasOverrides: boolean;
};

/** Units every screen should display and accept: region defaults + the user's overrides. */
export function useUnitPreferences(): UnitContext {
  const region = usePreferences((s) => s.region);
  const language = usePreferences((s) => s.language);
  const overrides = usePreferences((s) => s.unitOverrides);

  return useMemo(() => {
    const device = deviceLocale();
    const deviceCurrency = device.currencyCode ?? FALLBACK_CURRENCY;
    const regionUnits = regionDefaults(region, deviceCurrency);
    return {
      region,
      units: resolveUnits(regionUnits, overrides),
      regionUnits,
      locale: formatLocale(language, region, device.languageTag),
      deviceCurrency,
      hasOverrides: Object.keys(overrides).length > 0,
    };
  }, [region, language, overrides]);
}

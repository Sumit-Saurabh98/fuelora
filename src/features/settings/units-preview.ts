import { Money } from '@/domain/money';
import { regionNameKey, type Region } from '@/domain/regions';
import type { UnitPreferences } from '@/domain/unit-preferences';
import { baseTo, metresTo } from '@/domain/units';
import { formatNumber } from '@/ui/format';

// Fixed canonical sample (100 km, 10 L, 1,00,000 in the chosen currency) so changing region or
// units visibly exercises conversion and the device's Intl formatting.
const SAMPLE_METRES = 100_000;
const SAMPLE_ML = 10_000;
const SAMPLE_MAJOR = 100_000;

export type UnitsPreview = {
  emissionNameKey: string;
  sample: { distance: string; quantity: string; money: string };
};

export function buildUnitsPreview(input: {
  region: Region;
  units: UnitPreferences;
  locale: string;
}): UnitsPreview {
  const { units, locale } = input;
  return {
    emissionNameKey: regionNameKey(input.region, 'emission'),
    sample: {
      distance: formatNumber(metresTo(SAMPLE_METRES, units.distanceUnit), locale, 1),
      quantity: formatNumber(baseTo(SAMPLE_ML, units.volumeUnit), locale, 2),
      money: Money.fromMajor(SAMPLE_MAJOR, units.currency).format(locale),
    },
  };
}

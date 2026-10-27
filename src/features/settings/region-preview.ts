import { Money } from '@/domain/money';
import type { Language } from '@/domain/preferences';
import { regionDefaults, regionNameKey, type Region, type RegionDefaults } from '@/domain/regions';
import { baseTo, metresTo } from '@/domain/units';
import { formatLocale, formatNumber } from '@/ui/format';

// Fixed canonical sample (100 km, 10 L, 1,00,000 in the region currency) so switching regions
// visibly exercises conversion and the device's Intl formatting.
const SAMPLE_METRES = 100_000;
const SAMPLE_ML = 10_000;
const SAMPLE_MAJOR = 100_000;

export type RegionPreview = {
  locale: string;
  defaults: RegionDefaults;
  emissionNameKey: string;
  sample: { distance: string; quantity: string; money: string };
};

export function buildRegionPreview(input: {
  region: Region;
  language: Language;
  deviceCurrency: string;
  deviceLanguageTag: string;
}): RegionPreview {
  const defaults = regionDefaults(input.region, input.deviceCurrency);
  const locale = formatLocale(input.language, input.region, input.deviceLanguageTag);
  return {
    locale,
    defaults,
    emissionNameKey: regionNameKey(input.region, 'emission'),
    sample: {
      distance: formatNumber(metresTo(SAMPLE_METRES, defaults.distanceUnit), locale, 1),
      quantity: formatNumber(baseTo(SAMPLE_ML, defaults.volumeUnit), locale, 2),
      money: Money.fromMajor(SAMPLE_MAJOR, defaults.currency).format(locale),
    },
  };
}

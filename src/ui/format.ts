import type { Language } from '@/domain/preferences';
import type { Region } from '@/domain/regions';
import type { NumberSeparators } from '@/domain/units';

/**
 * Locale for numbers and money: the app language in the chosen region (hi + IN → hi-IN, which
 * gives lakh grouping). For OTHER, the device's own locale tag.
 */
export function formatLocale(
  language: Language,
  region: Region,
  deviceLanguageTag: string,
): string {
  return region === 'OTHER' ? deviceLanguageTag : `${language}-${region}`;
}

export function formatNumber(value: number, locale: string, maxFractionDigits: number): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxFractionDigits }).format(value);
}

/**
 * The locale's decimal and grouping characters, for parsing what users type. Read from format()
 * output: Hermes on iOS has no Intl formatToParts. Our parser only accepts '.' and ',', so locales
 * with other separators (or non-Latin digits) fall back to '.' decimal / ',' grouping.
 */
export function numberSeparators(locale: string): NumberSeparators {
  const sample = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(12345.6);
  const separators = [...sample].filter((c) => c === '.' || c === ',');
  return separators.at(-1) === ',' ? { decimal: ',', group: '.' } : { decimal: '.', group: ',' };
}

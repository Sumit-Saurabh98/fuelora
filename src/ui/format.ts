import type { Language } from '@/domain/preferences';
import type { Region } from '@/domain/regions';

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

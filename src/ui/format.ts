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

/** Always `digits` decimals ("40.0"), for values whose precision is part of the meaning. */
export function formatFixed(value: number, locale: string, digits: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
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

// Explicit fields instead of dateStyle/timeStyle: Hermes' Intl coverage differs on iOS (KB #23).
export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
}

/** "₹", "$", "£" for a field affix: format() output with the digits removed (KB #23). */
export function currencySymbol(locale: string, currency: string): string {
  const sample = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(0);
  return sample.replace(/[\d\s\u00a0\u202f.,]/g, '') || currency;
}

/** "October 2026" for a YYYY-MM month key. */
export function formatMonth(month: string, locale: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(year!, m! - 1, 1),
  );
}

/** A YYYY-MM-DD calendar day, formatted at local noon so no time zone moves it. */
export function formatDay(day: string, locale: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return formatDate(new Date(y!, m! - 1, d!, 12), locale);
}

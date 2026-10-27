import type { FuelType } from './vehicle';

// Canonical storage (AGENTS.md rule 3, LLD §3): distance in metres, quantity in base units
// (mL liquid, g CNG, Wh electric), always integers. Convert only here, at the input/display edge.

export const DISTANCE_UNITS = ['km', 'mi'] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

export const VOLUME_UNITS = ['L', 'gal_us', 'gal_uk'] as const;
export type VolumeUnit = (typeof VOLUME_UNITS)[number];

export type QuantityUnit = VolumeUnit | 'kg' | 'kWh';
export type BaseUnit = 'mL' | 'g' | 'Wh';

// Exact definitions (international mile, US liquid gallon, imperial gallon).
const METRES_PER: Record<DistanceUnit, number> = { km: 1000, mi: 1609.344 };
const BASE_PER: Record<QuantityUnit, number> = {
  L: 1000,
  gal_us: 3785.411784,
  gal_uk: 4546.09,
  kg: 1000,
  kWh: 1000,
};

export function distanceToMetres(value: number, unit: DistanceUnit): number {
  return Math.round(value * METRES_PER[unit]);
}

export function metresTo(metres: number, unit: DistanceUnit): number {
  return metres / METRES_PER[unit];
}

export function quantityToBase(value: number, unit: QuantityUnit): number {
  return Math.round(value * BASE_PER[unit]);
}

export function baseTo(base: number, unit: QuantityUnit): number {
  return base / BASE_PER[unit];
}

export function baseUnitFor(fuel: FuelType): BaseUnit {
  if (fuel === 'cng') return 'g';
  if (fuel === 'electric') return 'Wh';
  return 'mL'; // petrol, diesel, LPG (autogas is sold by the litre)
}

/** Units a user may enter/see a quantity in for this fuel. */
export function quantityUnitsFor(fuel: FuelType): readonly QuantityUnit[] {
  if (fuel === 'cng') return ['kg'];
  if (fuel === 'electric') return ['kWh'];
  return VOLUME_UNITS;
}

export type NumberSeparators = { decimal: string; group: string };

const DIGITS = /^\d+$/;

/**
 * Parses what a user typed into a number field. Accepts `.` or `,` as the decimal point and the
 * locale's grouping (incl. Indian 1,00,000). Returns null for anything ambiguous or invalid so
 * the form asks again instead of guessing — a misread odometer corrupts every later mileage.
 */
export function parseDecimalInput(input: string, separators: NumberSeparators): number | null {
  const text = input.replace(/[\s\u00a0\u202f]/g, '');
  if (text === '' || !/^[\d.,]+$/.test(text)) return null;

  const seps = [...text].filter((c) => c === '.' || c === ',');
  let integerPart = text;
  let fraction = '';

  if (seps.length > 0) {
    const last = text.search(/[.,][^.,]*$/);
    const lastSep = text[last]!;
    const before = text.slice(0, last);
    const after = text.slice(last + 1);
    const mixed = new Set(seps).size > 1;
    // A single `,` or `.` that is the locale's group separator followed by exactly 3 digits is
    // grouping ("12,345" km in en-IN); a repeated separator is grouping too ("1,00,000").
    const isGrouping =
      !mixed &&
      lastSep === separators.group &&
      after.length === 3 &&
      (seps.length > 1 || lastSep !== separators.decimal);

    if (isGrouping) {
      integerPart = text;
    } else if (mixed || seps.length === 1) {
      integerPart = before;
      fraction = after;
    } else {
      return null; // e.g. "1.2.3" — repeated separator that isn't valid grouping
    }
  }

  // ".5" means 0.5
  const groups = integerPart === '' && fraction !== '' ? ['0'] : integerPart.split(/[.,]/);
  if (!groups.every((g) => DIGITS.test(g))) return null;
  if (groups.length > 1) {
    // Grouping: last group 3 digits, middle groups 2 (Indian) or 3, first 1–3.
    const [first, ...rest] = groups;
    const lastGroup = rest.at(-1)!;
    if (first!.length > 3 || lastGroup.length !== 3) return null;
    if (!rest.slice(0, -1).every((g) => g.length === 2 || g.length === 3)) return null;
  }
  if (fraction !== '' && !DIGITS.test(fraction)) return null;

  const value = Number(`${groups.join('')}${fraction ? `.${fraction}` : ''}`);
  return Number.isFinite(value) ? value : null;
}

import { Money } from './money';
import { baseTo, quantityToBase, type QuantityUnit } from './units';

// How the user entered a fill-up (LLD §2 `entry_mode`): which two of quantity, price and total
// they typed, or money only ("₹200 of petrol"). Stored as text, so never rename a value.
export const ENTRY_MODES = ['qty_price', 'qty_total', 'price_total', 'amount_only'] as const;
export type EntryMode = (typeof ENTRY_MODES)[number];

/** A stored fill-up or charge in canonical units (LLD §2 `fill_ups`). */
export type FillUp = {
  id: string;
  vehicleId: string;
  filledAt: string; // UTC instant
  localDate: string; // YYYY-MM-DD in the user's zone
  odometerM: number;
  quantityBase: number;
  totalMinor: number;
  currency: string;
  isFull: boolean;
  missedPrevious: boolean;
  entryMode: EntryMode;
  station: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Quantity in base units from a total and a unit price per display unit, e.g. ₹200 at ₹104.50/L
 * → 1913.88 mL → 1914 (LLD §4.4 #8). Used by amount-only entry with the remembered price.
 * Null when there is no usable price.
 */
export function quantityFromTotal(
  total: Money,
  unitPrice: number,
  unit: QuantityUnit,
): number | null {
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null;
  return quantityToBase(total.major / unitPrice, unit);
}

/**
 * The two values the user typed (FR-9). `unitPrice` is in major units per display `unit`
 * (₹104.50 per L, $3.459 per US gal); `total` is in the entry currency.
 */
export type FillUpAmounts =
  | {
      mode: 'qty_price';
      quantityBase: number;
      unitPrice: number;
      unit: QuantityUnit;
      currency: string;
    }
  | { mode: 'qty_total'; quantityBase: number; total: Money }
  | { mode: 'price_total'; unitPrice: number; unit: QuantityUnit; total: Money }
  | { mode: 'amount_only'; unitPrice: number; unit: QuantityUnit; total: Money };

export type ResolvedAmounts = { quantityBase: number; total: Money };

/**
 * Derives the missing third value and rounds once: total to minor units, quantity to base units
 * (FR-9). Null when the inputs can't produce a positive quantity (e.g. a zero price).
 */
export function resolveAmounts(amounts: FillUpAmounts): ResolvedAmounts | null {
  switch (amounts.mode) {
    case 'qty_price': {
      if (!(amounts.unitPrice > 0) || !Number.isFinite(amounts.unitPrice)) return null;
      const major = baseTo(amounts.quantityBase, amounts.unit) * amounts.unitPrice;
      return {
        quantityBase: amounts.quantityBase,
        total: Money.fromMajor(major, amounts.currency),
      };
    }
    case 'qty_total':
      return { quantityBase: amounts.quantityBase, total: amounts.total };
    case 'price_total':
    case 'amount_only': {
      const quantityBase = quantityFromTotal(amounts.total, amounts.unitPrice, amounts.unit);
      return quantityBase === null ? null : { quantityBase, total: amounts.total };
    }
  }
}

/** What the service needs to store a fill-up; amounts are already resolved. */
export type NewFillUpInput = {
  vehicleId: string;
  filledAt: Date;
  odometerM: number;
  quantityBase: number;
  totalMinor: number;
  currency: string;
  isFull: boolean;
  missedPrevious: boolean;
  entryMode: EntryMode;
  station?: string | null;
  note?: string | null;
};

export type FillUpField =
  'filledAt' | 'odometerM' | 'quantityBase' | 'totalMinor' | 'station' | 'note';
export type FillUpIssue = 'required' | 'out_of_range' | 'too_long' | 'in_future';

export const FILL_UP_LIMITS = {
  // Same ceiling as a vehicle's starting odometer (2,000,000 km).
  odometerMaxM: 2_000_000_000,
  // 1,000 L / kg / kWh in one go is a typo for any road vehicle.
  quantityMaxBase: 1_000_000,
  stationMax: 60,
  noteMax: 500,
  // Phones disagree about the time by a few minutes; don't reject "now" over that.
  futureToleranceMs: 5 * 60 * 1000,
} as const;

export type ValidFillUpInput = Omit<NewFillUpInput, 'station' | 'note'> & {
  station: string | null;
  note: string | null;
};

export type FillUpValidation =
  | { ok: true; value: ValidFillUpInput }
  | { ok: false; issues: Partial<Record<FillUpField, FillUpIssue>> };

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/**
 * Field rules for one fill-up, all problems at once. Odometer order against the vehicle's other
 * entries is `checkOdometerOrder`. `now` comes from the injected clock.
 */
export function validateFillUp(input: NewFillUpInput, now: Date): FillUpValidation {
  const issues: Partial<Record<FillUpField, FillUpIssue>> = {};
  const station = optionalText(input.station);
  const note = optionalText(input.note);

  const time = input.filledAt.getTime();
  if (!Number.isFinite(time)) issues.filledAt = 'required';
  else if (time > now.getTime() + FILL_UP_LIMITS.futureToleranceMs) issues.filledAt = 'in_future';
  if (
    !Number.isSafeInteger(input.odometerM) ||
    input.odometerM < 0 ||
    input.odometerM > FILL_UP_LIMITS.odometerMaxM
  ) {
    issues.odometerM = 'out_of_range';
  }
  if (
    !Number.isSafeInteger(input.quantityBase) ||
    input.quantityBase <= 0 ||
    input.quantityBase > FILL_UP_LIMITS.quantityMaxBase
  ) {
    issues.quantityBase = 'out_of_range';
  }
  // Zero is allowed: free charging at home or at work is common for EVs.
  if (!Number.isSafeInteger(input.totalMinor) || input.totalMinor < 0) {
    issues.totalMinor = 'out_of_range';
  }
  if (station && station.length > FILL_UP_LIMITS.stationMax) issues.station = 'too_long';
  if (note && note.length > FILL_UP_LIMITS.noteMax) issues.note = 'too_long';

  if (Object.keys(issues).length > 0) return { ok: false, issues };
  return { ok: true, value: { ...input, station, note } };
}

export type OdometerProblem =
  | { code: 'DUPLICATE_ODOMETER' }
  | { code: 'ODOMETER_BELOW_START'; limitM: number }
  | { code: 'ODOMETER_NOT_INCREASING'; limitM: number }
  | { code: 'ODOMETER_AFTER_NEXT'; limitM: number };

/**
 * FR-7: the odometer must be above the previous entry's and below the next entry's, ordered by
 * date, and not below the vehicle's starting odometer. `others` are the vehicle's other fill-ups
 * (the one being edited excluded). `limitM` is the reading the user has to get past, for the
 * message.
 */
export function checkOdometerOrder(
  candidate: { filledAt: Date; odometerM: number },
  others: readonly Pick<FillUp, 'filledAt' | 'odometerM'>[],
  initialOdometerM: number,
): OdometerProblem | null {
  if (others.some((f) => f.odometerM === candidate.odometerM)) {
    return { code: 'DUPLICATE_ODOMETER' };
  }
  if (candidate.odometerM < initialOdometerM) {
    return { code: 'ODOMETER_BELOW_START', limitM: initialOdometerM };
  }
  const at = candidate.filledAt.getTime();
  let prev: number | null = null; // highest reading at or before this time
  let next: number | null = null; // lowest reading after it
  for (const f of others) {
    const t = Date.parse(f.filledAt);
    if (t <= at) prev = prev === null ? f.odometerM : Math.max(prev, f.odometerM);
    else next = next === null ? f.odometerM : Math.min(next, f.odometerM);
  }
  if (prev !== null && candidate.odometerM <= prev) {
    return { code: 'ODOMETER_NOT_INCREASING', limitM: prev };
  }
  if (next !== null && candidate.odometerM >= next) {
    return { code: 'ODOMETER_AFTER_NEXT', limitM: next };
  }
  return null;
}

/** YYYY-MM-DD of an instant in the phone's time zone, for monthly grouping (AGENTS.md rule 6). */
export function localDateOf(instant: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`;
}

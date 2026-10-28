import {
  resolveAmounts,
  validateFillUp,
  type EntryMode,
  type FillUpAmounts,
  type FillUpField,
  type FillUpIssue,
  type NewFillUpInput,
  type ResolvedAmounts,
} from '@/domain/fill-up';
import { currencyDigits, Money, unitPrice } from '@/domain/money';
import type { UnitPreferences } from '@/domain/unit-preferences';
import {
  baseTo,
  distanceToMetres,
  parseDecimalInput,
  quantityToBase,
  type NumberSeparators,
} from '@/domain/units';
import type { FuelType } from '@/domain/vehicle';
import { formatNumber } from '@/ui/format';

import { tankUnitFor } from '../vehicles/vehicle-form-values';

/** The three money/quantity inputs; the user types any two (FR-9). */
export type AmountField = 'quantity' | 'price' | 'total';

export type FillUpFormValues = {
  filledAt: Date;
  odometer: string;
  quantity: string;
  price: string;
  total: string;
  /** Amount fields the user filled, oldest first, at most two; the third is derived. */
  sources: AmountField[];
  isFull: boolean;
  missedPrevious: boolean;
  station: string;
  note: string;
};

export type FillUpFormField = Exclude<keyof FillUpFormValues, 'sources'>;
/** i18n key suffix under `fillUp.errors`. */
export type FillUpFormError = FillUpIssue | 'not_a_number' | 'need_two';

export type FillUpFormContext = {
  fuelType: FuelType;
  units: UnitPreferences;
  separators: NumberSeparators;
  locale: string;
};

/** Unit the user enters fuel in: their volume unit for liquids, kg for CNG, kWh for EVs. */
export const quantityUnitFor = tankUnitFor;

const ALL: readonly AmountField[] = ['quantity', 'price', 'total'];

/**
 * Sources after the user edits `field`: a filled field becomes the newest source (dropping the
 * oldest beyond two), a cleared one stops being a source.
 */
export function withEdited(sources: readonly AmountField[], field: AmountField, text: string) {
  const rest = sources.filter((f) => f !== field);
  return text.trim() === '' ? rest : [...rest, field].slice(-2);
}

/** The field computed from the other two; null until two are filled. */
export function derivedField(sources: readonly AmountField[]): AmountField | null {
  if (sources.length < 2) return null;
  return ALL.find((f) => !sources.includes(f)) ?? null;
}

function modeFor(sources: readonly AmountField[]): EntryMode {
  const has = (f: AmountField) => sources.includes(f);
  if (has('quantity') && has('price')) return 'qty_price';
  if (has('quantity') && has('total')) return 'qty_total';
  return 'price_total';
}

type Parsed =
  | { ok: true; resolved: ResolvedAmounts; mode: EntryMode }
  | { ok: false; errors: Partial<Record<AmountField, FillUpFormError>> };

/** Parses the two source fields and resolves the third in canonical units. */
export function parseAmounts(values: FillUpFormValues, ctx: FillUpFormContext): Parsed {
  if (values.sources.length < 2) {
    const errors: Partial<Record<AmountField, FillUpFormError>> = {};
    for (const f of ALL) if (!values.sources.includes(f)) errors[f] = 'need_two';
    return { ok: false, errors };
  }
  const errors: Partial<Record<AmountField, FillUpFormError>> = {};
  const read = (f: AmountField) => {
    if (!values.sources.includes(f)) return null;
    const n = parseDecimalInput(values[f], ctx.separators);
    if (n === null) errors[f] = 'not_a_number';
    return n;
  };
  const unit = quantityUnitFor(ctx.fuelType, ctx.units);
  const currency = ctx.units.currency;
  const quantity = read('quantity');
  const price = read('price');
  const total = read('total');
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const mode = modeFor(values.sources);
  let amounts: FillUpAmounts;
  if (mode === 'qty_price') {
    amounts = {
      mode,
      quantityBase: quantityToBase(quantity!, unit),
      unitPrice: price!,
      unit,
      currency,
    };
  } else if (mode === 'qty_total') {
    amounts = {
      mode,
      quantityBase: quantityToBase(quantity!, unit),
      total: Money.fromMajor(total!, currency),
    };
  } else {
    amounts = { mode, unitPrice: price!, unit, total: Money.fromMajor(total!, currency) };
  }
  const resolved = resolveAmounts(amounts);
  // A zero price can't produce a quantity.
  if (!resolved) return { ok: false, errors: { price: 'out_of_range' } };
  return { ok: true, resolved, mode };
}

/** Display text for a quantity, price or total in the user's units. */
export function formatAmount(
  field: AmountField,
  resolved: ResolvedAmounts,
  ctx: Pick<FillUpFormContext, 'fuelType' | 'units' | 'locale'>,
): string {
  const unit = quantityUnitFor(ctx.fuelType, ctx.units);
  if (field === 'quantity') return formatNumber(baseTo(resolved.quantityBase, unit), ctx.locale, 2);
  if (field === 'total') {
    return formatNumber(resolved.total.major, ctx.locale, currencyDigits(resolved.total.currency));
  }
  const price = unitPrice(resolved.total, resolved.quantityBase, unit);
  // Fuel is priced to the tenth of a cent in the US ($3.459/gal).
  return price === null ? '' : formatNumber(price, ctx.locale, 3);
}

/** Live text for the derived field, or '' while the inputs aren't complete. */
export function derivedText(values: FillUpFormValues, ctx: FillUpFormContext): string {
  const field = derivedField(values.sources);
  if (!field) return '';
  const parsed = parseAmounts(values, ctx);
  return parsed.ok ? formatAmount(field, parsed.resolved, ctx) : '';
}

/** The last entry's unit price for pre-filling (F-03), only if it was in today's currency. */
export function rememberedPrice(
  last: { totalMinor: number; currency: string; quantityBase: number } | null,
  ctx: Pick<FillUpFormContext, 'fuelType' | 'units' | 'locale'>,
): string {
  if (!last || last.currency !== ctx.units.currency || last.totalMinor === 0) return '';
  const total = Money.ofMinor(last.totalMinor, last.currency);
  const price = unitPrice(total, last.quantityBase, quantityUnitFor(ctx.fuelType, ctx.units));
  return price === null ? '' : formatNumber(price, ctx.locale, 3);
}

const DOMAIN_TO_FORM: Record<FillUpField, FillUpFormField> = {
  filledAt: 'filledAt',
  odometerM: 'odometer',
  quantityBase: 'quantity',
  totalMinor: 'total',
  station: 'station',
  note: 'note',
};

export type FillUpFormResult =
  | { ok: true; input: NewFillUpInput }
  | { ok: false; errors: Partial<Record<FillUpFormField, FillUpFormError>> };

/**
 * Typed values → canonical input, applying the domain field rules (validateFillUp) and mapping
 * every problem back to the field it was typed in. Odometer order is checked by the service.
 */
export function toFillUpInput(
  values: FillUpFormValues,
  ctx: FillUpFormContext & { vehicleId: string; now: Date },
): FillUpFormResult {
  const errors: Partial<Record<FillUpFormField, FillUpFormError>> = {};

  let odometerM = 0;
  if (values.odometer.trim() === '') errors.odometer = 'required';
  else {
    const reading = parseDecimalInput(values.odometer, ctx.separators);
    if (reading === null) errors.odometer = 'not_a_number';
    else odometerM = distanceToMetres(reading, ctx.units.distanceUnit);
  }

  const amounts = parseAmounts(values, ctx);
  if (!amounts.ok) Object.assign(errors, amounts.errors);

  const input: NewFillUpInput = {
    vehicleId: ctx.vehicleId,
    filledAt: values.filledAt,
    odometerM,
    quantityBase: amounts.ok ? amounts.resolved.quantityBase : 1,
    totalMinor: amounts.ok ? amounts.resolved.total.amountMinor : 0,
    currency: ctx.units.currency,
    isFull: values.isFull,
    missedPrevious: values.missedPrevious,
    entryMode: amounts.ok ? amounts.mode : 'qty_total',
    station: values.station,
    note: values.note,
  };

  const result = validateFillUp(input, ctx.now);
  if (!result.ok) {
    for (const [field, issue] of Object.entries(result.issues) as [FillUpField, FillUpIssue][]) {
      // A derived quantity/total that is out of range is reported on a field the user typed.
      let formField = DOMAIN_TO_FORM[field];
      if (formField === derivedField(values.sources)) formField = values.sources[1] ?? formField;
      errors[formField] ??= issue;
    }
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, input };
}

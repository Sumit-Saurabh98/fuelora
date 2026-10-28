import {
  resolveAmounts,
  validateFillUp,
  type EntryMode,
  type FillUp,
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
  metresTo,
  parseDecimalInput,
  quantityToBase,
  type NumberSeparators,
} from '@/domain/units';
import type { FuelType, VehicleType } from '@/domain/vehicle';
import { formatNumber } from '@/ui/format';

import { tankUnitFor } from '../vehicles/vehicle-form-values';

/** The three money/quantity inputs; the user types any two (FR-9). */
export type AmountField = 'quantity' | 'price' | 'total';

/** "amount": only money is typed, fuel comes from the price (F-04); "full": any two of three. */
export type EntryLayout = 'amount' | 'full';

export type FillUpFormValues = {
  layout: EntryLayout;
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
  /** Price text pre-filled from the last entry ('' when none); untouched, it means amount-only. */
  rememberedPrice?: string;
};

/**
 * KB #25: two-wheeler owners mostly fill by money ("₹200 of petrol"), so they start in amount
 * mode when a last price exists; cars and others start with the full form.
 */
export function defaultLayout(type: VehicleType, hasRememberedPrice: boolean): EntryLayout {
  return hasRememberedPrice && (type === 'bike' || type === 'scooter') ? 'amount' : 'full';
}

/** The amount fields that count as typed: in amount mode always price + total. */
export function effectiveSources(values: Pick<FillUpFormValues, 'layout' | 'sources'>) {
  return values.layout === 'amount' ? (['price', 'total'] as AmountField[]) : values.sources;
}

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

function modeFor(
  sources: readonly AmountField[],
  price: string,
  rememberedPrice: string | undefined,
): EntryMode {
  const has = (f: AmountField) => sources.includes(f);
  if (has('quantity') && has('price')) return 'qty_price';
  if (has('quantity') && has('total')) return 'qty_total';
  // Money only, fuel from the remembered price (F-04); a price the user typed is price_total.
  return rememberedPrice && price.trim() === rememberedPrice ? 'amount_only' : 'price_total';
}

type Parsed =
  | { ok: true; resolved: ResolvedAmounts; mode: EntryMode }
  | { ok: false; errors: Partial<Record<AmountField, FillUpFormError>> };

/** Parses the two source fields and resolves the third in canonical units. */
export function parseAmounts(values: FillUpFormValues, ctx: FillUpFormContext): Parsed {
  const sources = effectiveSources(values);
  const errors: Partial<Record<AmountField, FillUpFormError>> = {};
  if (values.layout === 'amount') {
    for (const f of sources) if (values[f].trim() === '') errors[f] = 'required';
    if (Object.keys(errors).length > 0) return { ok: false, errors };
  } else if (sources.length < 2) {
    for (const f of ALL) if (!sources.includes(f)) errors[f] = 'need_two';
    return { ok: false, errors };
  }
  const read = (f: AmountField) => {
    if (!sources.includes(f)) return null;
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

  const mode = modeFor(sources, values.price, ctx.rememberedPrice);
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
  const field = derivedField(effectiveSources(values));
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
      const sources = effectiveSources(values);
      let formField = DOMAIN_TO_FORM[field];
      if (formField === derivedField(sources)) formField = sources[1] ?? formField;
      errors[formField] ??= issue;
    }
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, input };
}

const SOURCES_BY_MODE: Record<EntryMode, AmountField[]> = {
  qty_price: ['quantity', 'price'],
  qty_total: ['quantity', 'total'],
  price_total: ['price', 'total'],
  amount_only: ['price', 'total'],
};

/**
 * A saved fill-up as form text, for editing (FR-11). The two fields the user typed stay the
 * inputs; `ctx.units.currency` must be the entry's own currency.
 */
export function toFillUpFormValues(
  fillUp: FillUp,
  ctx: Pick<FillUpFormContext, 'fuelType' | 'units' | 'locale'>,
): FillUpFormValues {
  const resolved = {
    quantityBase: fillUp.quantityBase,
    total: Money.ofMinor(fillUp.totalMinor, fillUp.currency),
  };
  return {
    layout: 'full',
    filledAt: new Date(fillUp.filledAt),
    odometer: formatNumber(metresTo(fillUp.odometerM, ctx.units.distanceUnit), ctx.locale, 1),
    quantity: formatAmount('quantity', resolved, ctx),
    price: formatAmount('price', resolved, ctx),
    total: formatAmount('total', resolved, ctx),
    sources: SOURCES_BY_MODE[fillUp.entryMode],
    isFull: fillUp.isFull,
    missedPrevious: fillUp.missedPrevious,
    station: fillUp.station ?? '',
    note: fillUp.note ?? '',
  };
}

/**
 * Edits re-read numbers from rounded display text (1.914 L shows as "1.91"), which would change
 * stored values on every save. Untouched odometer and amounts keep their exact stored values.
 */
export function keepUntouchedFillUp(
  input: NewFillUpInput,
  existing: FillUp,
  initial: FillUpFormValues,
  current: FillUpFormValues,
): NewFillUpInput {
  const amountsUntouched =
    current.layout === initial.layout &&
    current.sources.join() === initial.sources.join() &&
    current.quantity === initial.quantity &&
    current.price === initial.price &&
    current.total === initial.total;
  return {
    ...input,
    odometerM: current.odometer === initial.odometer ? existing.odometerM : input.odometerM,
    ...(amountsUntouched
      ? {
          quantityBase: existing.quantityBase,
          totalMinor: existing.totalMinor,
          currency: existing.currency,
          entryMode: existing.entryMode,
        }
      : {}),
  };
}

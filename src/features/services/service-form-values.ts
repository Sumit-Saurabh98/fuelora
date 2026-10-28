import { localDateOf } from '@/domain/fill-up';
import { currencyDigits, Money } from '@/domain/money';
import type { ServiceTypeKey } from '@/domain/presets';
import {
  validateService,
  type NewServiceInput,
  type ServiceEntry,
  type ServiceField,
  type ServiceIssue,
} from '@/domain/service-entry';
import type { UnitPreferences } from '@/domain/unit-preferences';
import {
  distanceToMetres,
  metresTo,
  parseDecimalInput,
  type NumberSeparators,
} from '@/domain/units';
import { formatNumber } from '@/ui/format';

export type ServiceFormValues = {
  servicedOn: Date;
  typeKey: ServiceTypeKey;
  title: string;
  odometer: string;
  cost: string;
  note: string;
};

export type ServiceFormField = keyof ServiceFormValues;
/** i18n key suffix under `serviceForm.errors`. */
export type ServiceFormError = ServiceIssue | 'not_a_number';

export type ServiceFormContext = {
  units: UnitPreferences;
  separators: NumberSeparators;
  locale: string;
};

const DOMAIN_TO_FORM: Record<ServiceField, ServiceFormField> = {
  servicedDate: 'servicedOn',
  odometerM: 'odometer',
  typeKey: 'typeKey',
  title: 'title',
  costMinor: 'cost',
  note: 'note',
};

export type ServiceFormResult =
  | { ok: true; input: NewServiceInput }
  | { ok: false; errors: Partial<Record<ServiceFormField, ServiceFormError>> };

/** Typed values → canonical input with the domain rules (validateService). */
export function toServiceInput(
  values: ServiceFormValues,
  ctx: ServiceFormContext & { vehicleId: string; today: string },
): ServiceFormResult {
  const errors: Partial<Record<ServiceFormField, ServiceFormError>> = {};

  let odometerM: number | null = null;
  if (values.odometer.trim() !== '') {
    const reading = parseDecimalInput(values.odometer, ctx.separators);
    if (reading === null) errors.odometer = 'not_a_number';
    else odometerM = distanceToMetres(reading, ctx.units.distanceUnit);
  }

  let costMinor: number | null = null;
  if (values.cost.trim() !== '') {
    const cost = parseDecimalInput(values.cost, ctx.separators);
    if (cost === null) errors.cost = 'not_a_number';
    else costMinor = Money.fromMajor(cost, ctx.units.currency).amountMinor;
  }

  const input: NewServiceInput = {
    vehicleId: ctx.vehicleId,
    servicedDate: localDateOf(values.servicedOn),
    odometerM,
    typeKey: values.typeKey,
    title: values.title,
    costMinor,
    currency: ctx.units.currency,
    note: values.note,
  };
  const result = validateService(input, ctx.today);
  if (!result.ok) {
    for (const [field, issue] of Object.entries(result.issues) as [ServiceField, ServiceIssue][]) {
      errors[DOMAIN_TO_FORM[field]] ??= issue;
    }
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, input };
}

/** A saved service as form text, for editing; `ctx.units.currency` must be the entry's. */
export function toServiceFormValues(
  entry: ServiceEntry,
  ctx: Pick<ServiceFormContext, 'units' | 'locale'>,
): ServiceFormValues {
  const [y, m, d] = entry.servicedDate.split('-').map(Number);
  return {
    // Noon, so no time-zone shift can move it to another day.
    servicedOn: new Date(y!, m! - 1, d!, 12),
    typeKey: entry.typeKey,
    title: entry.title ?? '',
    odometer:
      entry.odometerM === null
        ? ''
        : formatNumber(metresTo(entry.odometerM, ctx.units.distanceUnit), ctx.locale, 1),
    cost:
      entry.costMinor === null || entry.currency === null
        ? ''
        : formatNumber(
            Money.ofMinor(entry.costMinor, entry.currency).major,
            ctx.locale,
            currencyDigits(entry.currency),
          ),
    note: entry.note ?? '',
  };
}

/** Untouched odometer keeps its exact stored metres (the form shows rounded text). */
export function keepUntouchedService(
  input: NewServiceInput,
  existing: ServiceEntry,
  initial: ServiceFormValues,
  current: ServiceFormValues,
): NewServiceInput {
  return current.odometer === initial.odometer
    ? { ...input, odometerM: existing.odometerM }
    : input;
}

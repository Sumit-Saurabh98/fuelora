import { addDays, addMonths } from '@/domain/dates';
import { localDateOf } from '@/domain/fill-up';
import type { SuggestedInterval } from '@/domain/presets';
import {
  DEFAULT_LEAD,
  validateReminder,
  type NewReminderInput,
  type Reminder,
  type ReminderField,
  type ReminderIssue,
  type ReminderKind,
  type ReminderTypeKey,
} from '@/domain/reminder';
import type { UnitPreferences } from '@/domain/unit-preferences';
import {
  distanceToMetres,
  metresTo,
  parseDecimalInput,
  type NumberSeparators,
} from '@/domain/units';
import { formatNumber } from '@/ui/format';

export type ReminderFormValues = {
  kind: ReminderKind;
  typeKey: ReminderTypeKey;
  title: string;
  hasDueDate: boolean;
  dueDate: Date;
  dueOdometer: string;
  repeatMonths: string;
  repeatDistance: string;
  leadDays: string;
  leadDistance: string;
};

export type ReminderFormField = Exclude<keyof ReminderFormValues, 'hasDueDate'> | 'due';
/** i18n key suffix under `reminderForm.errors`. */
export type ReminderFormError = ReminderIssue | 'not_a_number';

export type ReminderFormContext = {
  units: UnitPreferences;
  separators: NumberSeparators;
  locale: string;
};

const DOMAIN_TO_FORM: Record<ReminderField, ReminderFormField> = {
  vehicleId: 'typeKey',
  typeKey: 'typeKey',
  title: 'title',
  due: 'due',
  dueDate: 'dueDate',
  dueOdometerM: 'dueOdometer',
  repeatMonths: 'repeatMonths',
  repeatDistanceM: 'repeatDistance',
  leadDays: 'leadDays',
  leadDistanceM: 'leadDistance',
};

/** A licence belongs to the person, not a vehicle, and is due by date only. */
export const isPersonLevel = (typeKey: ReminderTypeKey) => typeKey === 'licence';

export type ReminderFormResult =
  | { ok: true; input: NewReminderInput }
  | { ok: false; errors: Partial<Record<ReminderFormField, ReminderFormError>> };

/** Typed values → canonical input with the domain rules (validateReminder). */
export function toReminderInput(
  values: ReminderFormValues,
  ctx: ReminderFormContext & { vehicleId: string | null },
): ReminderFormResult {
  const errors: Partial<Record<ReminderFormField, ReminderFormError>> = {};
  const personLevel = isPersonLevel(values.typeKey);

  const number = (field: ReminderFormField, text: string): number | null => {
    if (text.trim() === '') return null;
    const n = parseDecimalInput(text, ctx.separators);
    if (n === null) errors[field] = 'not_a_number';
    return n;
  };
  const distance = (field: ReminderFormField, text: string) => {
    const n = number(field, text);
    return n === null ? null : distanceToMetres(n, ctx.units.distanceUnit);
  };
  const whole = (field: ReminderFormField, text: string) => {
    const n = number(field, text);
    if (n !== null && !Number.isInteger(n)) errors[field] = 'out_of_range';
    return n;
  };

  const leadDays = whole('leadDays', values.leadDays);
  const leadDistanceM = distance('leadDistance', values.leadDistance);
  const input: NewReminderInput = {
    vehicleId: personLevel ? null : ctx.vehicleId,
    kind: values.kind,
    typeKey: values.typeKey,
    title: values.title,
    dueDate: values.hasDueDate ? localDateOf(values.dueDate) : null,
    dueOdometerM: personLevel ? null : distance('dueOdometer', values.dueOdometer),
    repeatMonths: whole('repeatMonths', values.repeatMonths),
    repeatDistanceM: personLevel ? null : distance('repeatDistance', values.repeatDistance),
    leadDays: leadDays ?? DEFAULT_LEAD.days,
    leadDistanceM: leadDistanceM ?? DEFAULT_LEAD.distanceM,
  };
  const result = validateReminder(input);
  if (!result.ok) {
    for (const [field, issue] of Object.entries(result.issues) as [
      ReminderField,
      ReminderIssue,
    ][]) {
      errors[DOMAIN_TO_FORM[field]] ??= issue;
    }
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, input };
}

const distanceText = (m: number | null, ctx: Pick<ReminderFormContext, 'units' | 'locale'>) =>
  m === null ? '' : formatNumber(metresTo(m, ctx.units.distanceUnit), ctx.locale, 1);

/** Starting values for a new reminder of `kind`. */
export function blankReminder(
  kind: ReminderKind,
  typeKey: ReminderTypeKey,
  now: Date,
  ctx: Pick<ReminderFormContext, 'units' | 'locale'>,
): ReminderFormValues {
  return {
    kind,
    typeKey,
    title: '',
    hasDueDate: kind !== 'service',
    dueDate: now,
    dueOdometer: '',
    repeatMonths: kind === 'document' ? '12' : '',
    repeatDistance: '',
    leadDays: String(DEFAULT_LEAD.days),
    leadDistance: distanceText(DEFAULT_LEAD.distanceM, ctx),
  };
}

/**
 * Suggested due and repeat from a preset's interval (KB §5): due one interval from today and the
 * current odometer. Only a suggestion; every field stays editable.
 */
export function suggestFromInterval(
  interval: SuggestedInterval,
  context: { today: string; currentOdometerM: number | null },
  ctx: Pick<ReminderFormContext, 'units' | 'locale'>,
): Pick<
  ReminderFormValues,
  'hasDueDate' | 'dueDate' | 'dueOdometer' | 'repeatMonths' | 'repeatDistance'
> {
  const dueDay =
    interval.months !== undefined
      ? addMonths(context.today, interval.months)
      : interval.days !== undefined
        ? addDays(context.today, interval.days)
        : null;
  const [y, m, d] = (dueDay ?? context.today).split('-').map(Number);
  const dueOdometerM =
    interval.distanceM !== undefined && context.currentOdometerM !== null
      ? context.currentOdometerM + interval.distanceM
      : null;
  return {
    hasDueDate: dueDay !== null,
    dueDate: new Date(y!, m! - 1, d!, 12),
    dueOdometer: distanceText(dueOdometerM, ctx),
    repeatMonths: interval.months !== undefined ? String(interval.months) : '',
    repeatDistance: distanceText(interval.distanceM ?? null, ctx),
  };
}

/** A saved reminder as form text, for editing. */
export function toReminderFormValues(
  reminder: Reminder,
  ctx: Pick<ReminderFormContext, 'units' | 'locale'>,
): ReminderFormValues {
  const [y, m, d] = (reminder.dueDate ?? '2000-01-01').split('-').map(Number);
  return {
    kind: reminder.kind,
    typeKey: reminder.typeKey,
    title: reminder.title ?? '',
    hasDueDate: reminder.dueDate !== null,
    dueDate: reminder.dueDate ? new Date(y!, m! - 1, d!, 12) : new Date(),
    dueOdometer: distanceText(reminder.dueOdometerM, ctx),
    repeatMonths: reminder.repeatMonths === null ? '' : String(reminder.repeatMonths),
    repeatDistance: distanceText(reminder.repeatDistanceM, ctx),
    leadDays: String(reminder.leadDays),
    leadDistance: distanceText(reminder.leadDistanceM, ctx),
  };
}

/** Untouched distances keep their exact stored metres (the form shows rounded text). */
export function keepUntouchedReminder(
  input: NewReminderInput,
  existing: Reminder,
  initial: ReminderFormValues,
  current: ReminderFormValues,
): NewReminderInput {
  return {
    ...input,
    ...(current.dueOdometer === initial.dueOdometer && input.dueOdometerM !== null
      ? { dueOdometerM: existing.dueOdometerM }
      : {}),
    ...(current.repeatDistance === initial.repeatDistance && input.repeatDistanceM !== null
      ? { repeatDistanceM: existing.repeatDistanceM }
      : {}),
    ...(current.leadDistance === initial.leadDistance
      ? { leadDistanceM: existing.leadDistanceM }
      : {}),
  };
}

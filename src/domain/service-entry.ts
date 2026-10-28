import { isServiceTypeKey, type ServiceTypeKey } from './presets';

/** A stored service record (LLD §2 `services`); odometer and cost are optional. */
export type ServiceEntry = {
  id: string;
  vehicleId: string;
  servicedDate: string; // YYYY-MM-DD, a calendar day (no time)
  odometerM: number | null;
  typeKey: ServiceTypeKey;
  title: string | null; // required for 'custom'
  costMinor: number | null;
  currency: string | null; // set whenever costMinor is
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewServiceInput = {
  vehicleId: string;
  servicedDate: string;
  odometerM?: number | null;
  typeKey: ServiceTypeKey;
  title?: string | null;
  costMinor?: number | null;
  currency: string;
  note?: string | null;
};

export type ServiceField =
  'servicedDate' | 'odometerM' | 'typeKey' | 'title' | 'costMinor' | 'note';
export type ServiceIssue = 'required' | 'out_of_range' | 'too_long' | 'in_future' | 'invalid';

export const SERVICE_LIMITS = {
  titleMax: 40,
  noteMax: 500,
  odometerMaxM: 2_000_000_000,
} as const;

export type ValidServiceInput = Omit<ServiceEntry, 'id' | 'createdAt' | 'updatedAt'>;

export type ServiceValidation =
  | { ok: true; value: ValidServiceInput }
  | { ok: false; issues: Partial<Record<ServiceField, ServiceIssue>> };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/**
 * Field rules for a service record, all problems at once. `today` is the user's local date from
 * the injected clock; a service can't be logged ahead of time (that's what reminders are for).
 */
export function validateService(input: NewServiceInput, today: string): ServiceValidation {
  const issues: Partial<Record<ServiceField, ServiceIssue>> = {};
  const title = optionalText(input.title);
  const note = optionalText(input.note);
  const odometerM = input.odometerM ?? null;
  const costMinor = input.costMinor ?? null;

  if (!DATE.test(input.servicedDate) || Number.isNaN(Date.parse(input.servicedDate))) {
    issues.servicedDate = 'required';
  } else if (input.servicedDate > today) {
    issues.servicedDate = 'in_future';
  }
  if (!isServiceTypeKey(input.typeKey)) issues.typeKey = 'invalid';
  if (input.typeKey === 'custom' && title === null) issues.title = 'required';
  if (title && title.length > SERVICE_LIMITS.titleMax) issues.title = 'too_long';
  if (
    odometerM !== null &&
    (!Number.isSafeInteger(odometerM) || odometerM < 0 || odometerM > SERVICE_LIMITS.odometerMaxM)
  ) {
    issues.odometerM = 'out_of_range';
  }
  if (costMinor !== null && (!Number.isSafeInteger(costMinor) || costMinor < 0)) {
    issues.costMinor = 'out_of_range';
  }
  if (note && note.length > SERVICE_LIMITS.noteMax) issues.note = 'too_long';

  if (Object.keys(issues).length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: {
      vehicleId: input.vehicleId,
      servicedDate: input.servicedDate,
      odometerM,
      typeKey: input.typeKey,
      // A preset's name comes from i18n; only custom services keep a title.
      title: input.typeKey === 'custom' ? title : null,
      costMinor,
      currency: costMinor === null ? null : input.currency,
      note,
    },
  };
}

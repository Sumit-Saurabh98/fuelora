import { addDays, addMonths, daysBetween } from './dates';
import { isServiceTypeKey, type ServiceTypeKey } from './presets';
import { regionNameKey, type Region, type RegionNames } from './regions';

// Reminders (F-10, LLD §2 `reminders`, §5). Keys and kinds are stored text: never rename one.
export const REMINDER_KINDS = ['service', 'document', 'custom'] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const DOCUMENT_KEYS = ['insurance', 'emission_test', 'registration', 'licence'] as const;
export type DocumentKey = (typeof DOCUMENT_KEYS)[number];

export const REMINDER_STATUSES = ['active', 'done', 'archived'] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

export type ReminderTypeKey = ServiceTypeKey | DocumentKey;

export type Reminder = {
  id: string;
  /** Null for person-level reminders (driving licence). */
  vehicleId: string | null;
  kind: ReminderKind;
  typeKey: ReminderTypeKey;
  title: string | null;
  dueDate: string | null; // YYYY-MM-DD
  dueOdometerM: number | null;
  repeatMonths: number | null;
  repeatDistanceM: number | null;
  leadDays: number;
  leadDistanceM: number;
  status: ReminderStatus;
  lastDoneDate: string | null;
  lastDoneOdometerM: number | null;
  createdAt: string;
  updatedAt: string;
};

/** KB §2 defaults: warn 7 days / 300 km early. */
export const DEFAULT_LEAD = { days: 7, distanceM: 300_000 } as const;

const DOCUMENT_CONCEPT: Record<DocumentKey, keyof RegionNames> = {
  insurance: 'insurance',
  emission_test: 'emission',
  registration: 'registration',
  licence: 'licence',
};

/** i18n key for a document's region-specific name: PUC / MOT / smog check (KB §4). */
export function documentNameKey(key: DocumentKey, region: Region): string {
  return regionNameKey(region, DOCUMENT_CONCEPT[key]);
}

export function isDocumentKey(value: unknown): value is DocumentKey {
  return DOCUMENT_KEYS.some((k) => k === value);
}

export type NewReminderInput = {
  vehicleId: string | null;
  kind: ReminderKind;
  typeKey: ReminderTypeKey;
  title?: string | null;
  dueDate?: string | null;
  dueOdometerM?: number | null;
  repeatMonths?: number | null;
  repeatDistanceM?: number | null;
  leadDays?: number;
  leadDistanceM?: number;
};

export type ReminderField =
  | 'vehicleId'
  | 'typeKey'
  | 'title'
  | 'due'
  | 'dueDate'
  | 'dueOdometerM'
  | 'repeatMonths'
  | 'repeatDistanceM'
  | 'leadDays'
  | 'leadDistanceM';
export type ReminderIssue = 'required' | 'invalid' | 'out_of_range' | 'too_long';

export const REMINDER_LIMITS = {
  titleMax: 40,
  repeatMonthsMax: 120,
  leadDaysMax: 90,
  odometerMaxM: 2_000_000_000,
} as const;

export type ValidReminderInput = Required<
  Omit<NewReminderInput, 'title' | 'dueDate' | 'dueOdometerM' | 'repeatMonths' | 'repeatDistanceM'>
> & {
  title: string | null;
  dueDate: string | null;
  dueOdometerM: number | null;
  repeatMonths: number | null;
  repeatDistanceM: number | null;
};

export type ReminderValidation =
  | { ok: true; value: ValidReminderInput }
  | { ok: false; issues: Partial<Record<ReminderField, ReminderIssue>> };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const positiveInt = (n: number | null) => n === null || (Number.isSafeInteger(n) && n > 0);

/**
 * FR-12 rules: due date and/or due odometer (at least one), optional repeat, lead time. Services
 * use service presets, documents the document keys, custom needs a title. Only a licence may be
 * person-level (no vehicle).
 */
export function validateReminder(input: NewReminderInput): ReminderValidation {
  const issues: Partial<Record<ReminderField, ReminderIssue>> = {};
  const title = input.title?.trim() || null;
  const dueDate = input.dueDate ?? null;
  const dueOdometerM = input.dueOdometerM ?? null;
  const repeatMonths = input.repeatMonths ?? null;
  const repeatDistanceM = input.repeatDistanceM ?? null;
  const leadDays = input.leadDays ?? DEFAULT_LEAD.days;
  const leadDistanceM = input.leadDistanceM ?? DEFAULT_LEAD.distanceM;

  const typeOk =
    (input.kind === 'service' && isServiceTypeKey(input.typeKey)) ||
    (input.kind === 'document' && isDocumentKey(input.typeKey)) ||
    (input.kind === 'custom' && input.typeKey === 'custom');
  if (!typeOk) issues.typeKey = 'invalid';
  const needsTitle = input.kind === 'custom' || input.typeKey === 'custom';
  if (needsTitle && !title) issues.title = 'required';
  if (title && title.length > REMINDER_LIMITS.titleMax) issues.title = 'too_long';
  if (input.vehicleId === null && input.typeKey !== 'licence') issues.vehicleId = 'required';

  if (dueDate === null && dueOdometerM === null) issues.due = 'required';
  if (dueDate !== null && (!DATE.test(dueDate) || Number.isNaN(Date.parse(dueDate)))) {
    issues.dueDate = 'invalid';
  }
  if (
    dueOdometerM !== null &&
    (!Number.isSafeInteger(dueOdometerM) ||
      dueOdometerM < 0 ||
      dueOdometerM > REMINDER_LIMITS.odometerMaxM)
  ) {
    issues.dueOdometerM = 'out_of_range';
  }
  // A person has no odometer: a licence is due by date only.
  if (input.vehicleId === null && dueOdometerM !== null) issues.dueOdometerM = 'invalid';
  if (!positiveInt(repeatMonths) || (repeatMonths ?? 0) > REMINDER_LIMITS.repeatMonthsMax) {
    issues.repeatMonths = 'out_of_range';
  }
  if (!positiveInt(repeatDistanceM)) issues.repeatDistanceM = 'out_of_range';
  if (!Number.isSafeInteger(leadDays) || leadDays < 0 || leadDays > REMINDER_LIMITS.leadDaysMax) {
    issues.leadDays = 'out_of_range';
  }
  if (!Number.isSafeInteger(leadDistanceM) || leadDistanceM < 0) {
    issues.leadDistanceM = 'out_of_range';
  }

  if (Object.keys(issues).length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: {
      vehicleId: input.vehicleId,
      kind: input.kind,
      typeKey: input.typeKey,
      title: needsTitle ? title : null,
      dueDate,
      dueOdometerM,
      repeatMonths,
      repeatDistanceM,
      leadDays,
      leadDistanceM,
    },
  };
}

export type ReminderState = 'upcoming' | 'due_soon' | 'due' | 'overdue';

export type ReminderStatusView = {
  state: ReminderState;
  /** LLD §5.3: the date, the predicted date for distance, or the earlier of both. */
  effectiveDate: string | null;
  /** Distance left to the due odometer (negative when past it); null without one. */
  remainingM: number | null;
};

/**
 * Where an active reminder stands today (LLD §5.3). `predictedDate` is the forecast date for the
 * due odometer (Step 11); without it a distance reminder is judged by the odometer alone.
 */
export function reminderStatus(
  reminder: Pick<Reminder, 'dueDate' | 'dueOdometerM' | 'leadDays' | 'leadDistanceM'>,
  context: { today: string; currentOdometerM: number | null; predictedDate?: string | null },
): ReminderStatusView {
  const { today, currentOdometerM } = context;
  const dates = [reminder.dueDate, context.predictedDate ?? null].filter(
    (d): d is string => d !== null,
  );
  const effectiveDate = dates.length ? dates.sort()[0]! : null;
  const remainingM =
    reminder.dueOdometerM !== null && currentOdometerM !== null
      ? reminder.dueOdometerM - currentOdometerM
      : null;

  let state: ReminderState = 'upcoming';
  if (effectiveDate !== null) {
    const days = daysBetween(today, effectiveDate);
    if (days < 0) state = 'overdue';
    else if (days === 0) state = 'due';
    else if (days <= reminder.leadDays) state = 'due_soon';
  }
  if (remainingM !== null) {
    const byDistance: ReminderState =
      remainingM <= 0 ? 'due' : remainingM <= reminder.leadDistanceM ? 'due_soon' : 'upcoming';
    state = moreUrgent(state, byDistance);
  }
  return { state, effectiveDate, remainingM };
}

const URGENCY: Record<ReminderState, number> = { upcoming: 0, due_soon: 1, due: 2, overdue: 3 };

function moreUrgent(a: ReminderState, b: ReminderState): ReminderState {
  return URGENCY[a] >= URGENCY[b] ? a : b;
}

/**
 * LLD §5.5: marking done records when and where; a repeating reminder rolls forward from the
 * done date / odometer, a one-off one is finished. Callers pass the vehicle's current reading as
 * `odometerM` when the user gave none, so a distance repeat always has a base.
 */
export function completeReminder(
  reminder: Reminder,
  done: { date: string; odometerM: number | null },
): Pick<Reminder, 'dueDate' | 'dueOdometerM' | 'status' | 'lastDoneDate' | 'lastDoneOdometerM'> {
  const repeats = reminder.repeatMonths !== null || reminder.repeatDistanceM !== null;
  if (!repeats) {
    return {
      dueDate: reminder.dueDate,
      dueOdometerM: reminder.dueOdometerM,
      status: 'done',
      lastDoneDate: done.date,
      lastDoneOdometerM: done.odometerM,
    };
  }
  return {
    // A part that doesn't repeat is dropped; the other keeps the reminder alive.
    dueDate: reminder.repeatMonths !== null ? addMonths(done.date, reminder.repeatMonths) : null,
    dueOdometerM:
      reminder.repeatDistanceM !== null && done.odometerM !== null
        ? done.odometerM + reminder.repeatDistanceM
        : null,
    status: 'active',
    lastDoneDate: done.date,
    lastDoneOdometerM: done.odometerM,
  };
}

/** Lead day for a date-due reminder: when the first notification fires (LLD §5.4). */
export function leadDate(effectiveDate: string, leadDays: number): string {
  return addDays(effectiveDate, -leadDays);
}

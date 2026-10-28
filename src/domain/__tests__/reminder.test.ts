import {
  completeReminder,
  documentNameKey,
  reminderStatus,
  validateReminder,
  type NewReminderInput,
  type Reminder,
} from '../reminder';

const input = (change: Partial<NewReminderInput> = {}): NewReminderInput => ({
  vehicleId: 'v1',
  kind: 'service',
  typeKey: 'engine_oil',
  dueOdometerM: 15_000_000,
  ...change,
});

describe('validateReminder (FR-12)', () => {
  it('fills the default lead (7 days / 300 km)', () => {
    expect(validateReminder(input())).toEqual({
      ok: true,
      value: {
        vehicleId: 'v1',
        kind: 'service',
        typeKey: 'engine_oil',
        title: null,
        dueDate: null,
        dueOdometerM: 15_000_000,
        repeatMonths: null,
        repeatDistanceM: null,
        leadDays: 7,
        leadDistanceM: 300_000,
      },
    });
  });

  it('needs a due date or a due odometer', () => {
    expect(validateReminder(input({ dueOdometerM: null }))).toEqual({
      ok: false,
      issues: { due: 'required' },
    });
  });

  it('kind and key must match; custom needs a title', () => {
    expect(validateReminder(input({ kind: 'document', typeKey: 'engine_oil' }))).toMatchObject({
      issues: { typeKey: 'invalid' },
    });
    expect(validateReminder(input({ kind: 'custom', typeKey: 'custom' }))).toMatchObject({
      issues: { title: 'required' },
    });
    expect(
      validateReminder(input({ kind: 'custom', typeKey: 'custom', title: ' Wash ' })),
    ).toMatchObject({ ok: true, value: { title: 'Wash' } });
  });

  it('only a licence can be person-level, and it is due by date', () => {
    expect(validateReminder(input({ vehicleId: null }))).toMatchObject({
      issues: { vehicleId: 'required', dueOdometerM: 'invalid' },
    });
    expect(
      validateReminder({
        vehicleId: null,
        kind: 'document',
        typeKey: 'licence',
        dueDate: '2030-05-01',
      }),
    ).toMatchObject({ ok: true });
  });

  it('checks repeat and lead ranges', () => {
    expect(validateReminder(input({ repeatMonths: 0, repeatDistanceM: -1, leadDays: 91 }))).toEqual(
      {
        ok: false,
        issues: {
          repeatMonths: 'out_of_range',
          repeatDistanceM: 'out_of_range',
          leadDays: 'out_of_range',
        },
      },
    );
  });
});

describe('reminderStatus (LLD §5.3)', () => {
  const base = { dueDate: null, dueOdometerM: null, leadDays: 7, leadDistanceM: 300_000 };
  const today = '2026-10-28';

  it('date reminders: upcoming → due soon (lead) → due → overdue', () => {
    const at = (dueDate: string) =>
      reminderStatus({ ...base, dueDate }, { today, currentOdometerM: null }).state;
    expect(at('2026-11-10')).toBe('upcoming');
    expect(at('2026-11-04')).toBe('due_soon');
    expect(at('2026-10-28')).toBe('due');
    expect(at('2026-10-27')).toBe('overdue');
  });

  it('distance reminders by odometer: within 300 km is due soon, reached is due', () => {
    const at = (current: number) =>
      reminderStatus({ ...base, dueOdometerM: 15_000_000 }, { today, currentOdometerM: current });
    expect(at(14_500_000)).toEqual({ state: 'upcoming', effectiveDate: null, remainingM: 500_000 });
    expect(at(14_800_000).state).toBe('due_soon');
    expect(at(15_050_000)).toMatchObject({ state: 'due', remainingM: -50_000 });
  });

  it('both: the more urgent wins; the earlier date is the effective one', () => {
    const view = reminderStatus(
      { ...base, dueDate: '2027-04-01', dueOdometerM: 15_000_000 },
      { today, currentOdometerM: 14_900_000, predictedDate: '2026-11-02' },
    );
    expect(view).toEqual({ state: 'due_soon', effectiveDate: '2026-11-02', remainingM: 100_000 });
  });
});

describe('completeReminder (LLD §5.5)', () => {
  const reminder: Reminder = {
    id: 'r1',
    vehicleId: 'v1',
    kind: 'service',
    typeKey: 'engine_oil',
    title: null,
    dueDate: '2026-11-01',
    dueOdometerM: 15_000_000,
    repeatMonths: 6,
    repeatDistanceM: 3_000_000,
    leadDays: 7,
    leadDistanceM: 300_000,
    status: 'active',
    lastDoneDate: null,
    lastDoneOdometerM: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };

  it('a repeating reminder rolls forward from when and where it was done', () => {
    expect(completeReminder(reminder, { date: '2026-10-28', odometerM: 14_900_000 })).toEqual({
      dueDate: '2027-04-28',
      dueOdometerM: 17_900_000,
      status: 'active',
      lastDoneDate: '2026-10-28',
      lastDoneOdometerM: 14_900_000,
    });
  });

  it('a one-off reminder is finished', () => {
    const once = { ...reminder, repeatMonths: null, repeatDistanceM: null };
    expect(completeReminder(once, { date: '2026-10-28', odometerM: null })).toMatchObject({
      status: 'done',
      lastDoneDate: '2026-10-28',
    });
  });

  it('a yearly document repeats by date only', () => {
    const insurance = {
      ...reminder,
      kind: 'document' as const,
      typeKey: 'insurance' as const,
      dueOdometerM: null,
      repeatMonths: 12,
      repeatDistanceM: null,
    };
    expect(completeReminder(insurance, { date: '2026-10-28', odometerM: null })).toMatchObject({
      dueDate: '2027-10-28',
      dueOdometerM: null,
      status: 'active',
    });
  });
});

describe('documentNameKey (KB §4)', () => {
  it('uses the region name', () => {
    expect(documentNameKey('emission_test', 'IN')).toBe('regionNames.emission.puc');
    expect(documentNameKey('emission_test', 'GB')).toBe('regionNames.emission.mot');
    expect(documentNameKey('registration', 'GB')).toBe('regionNames.registration.roadTax');
  });
});

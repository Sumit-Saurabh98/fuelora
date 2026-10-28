import type { Reminder } from '@/domain/reminder';
import { regionDefaults } from '@/domain/regions';

import {
  blankReminder,
  keepUntouchedReminder,
  suggestFromInterval,
  toReminderFormValues,
  toReminderInput,
  type ReminderFormValues,
} from '../reminder-form-values';

const india = {
  units: regionDefaults('IN', 'INR'),
  separators: { decimal: '.', group: ',' },
  locale: 'en-IN',
};
const us = {
  units: regionDefaults('US', 'USD'),
  separators: { decimal: '.', group: ',' },
  locale: 'en-US',
};
const NOW = new Date(2026, 9, 28, 10);

describe('blank reminders', () => {
  it('services start by distance; documents by date with a yearly repeat', () => {
    expect(blankReminder('service', 'general_service', NOW, india)).toMatchObject({
      hasDueDate: false,
      repeatMonths: '',
      leadDays: '7',
      leadDistance: '300',
    });
    expect(blankReminder('document', 'insurance', NOW, india)).toMatchObject({
      hasDueDate: true,
      repeatMonths: '12',
    });
  });
});

describe('suggestFromInterval (KB §5)', () => {
  it('due one interval from today and the current odometer', () => {
    const s = suggestFromInterval(
      { distanceM: 3_000_000, months: 6 },
      { today: '2026-10-28', currentOdometerM: 12_400_000 },
      india,
    );
    expect(s).toEqual({
      hasDueDate: true,
      dueDate: new Date(2027, 3, 28, 12),
      dueOdometer: '15,400',
      repeatMonths: '6',
      repeatDistance: '3,000',
    });
  });

  it('distance-only intervals have no date; miles for US users', () => {
    const s = suggestFromInterval(
      { distanceM: 500_000 },
      { today: '2026-10-28', currentOdometerM: 0 },
      us,
    );
    expect(s).toMatchObject({
      hasDueDate: false,
      dueOdometer: '310.7',
      repeatMonths: '',
      repeatDistance: '310.7',
    });
  });
});

const values = (change: Partial<ReminderFormValues> = {}): ReminderFormValues => ({
  ...blankReminder('service', 'engine_oil', NOW, india),
  dueOdometer: '15,000',
  ...change,
});

describe('toReminderInput', () => {
  it('canonical metres and the default lead', () => {
    expect(
      toReminderInput(values({ repeatDistance: '3,000' }), { ...india, vehicleId: 'v1' }),
    ).toEqual({
      ok: true,
      input: {
        vehicleId: 'v1',
        kind: 'service',
        typeKey: 'engine_oil',
        title: '',
        dueDate: null,
        dueOdometerM: 15_000_000,
        repeatMonths: null,
        repeatDistanceM: 3_000_000,
        leadDays: 7,
        leadDistanceM: 300_000,
      },
    });
  });

  it('a licence is person-level and date only, whatever was typed', () => {
    const result = toReminderInput(
      values({ kind: 'document', typeKey: 'licence', hasDueDate: true, dueOdometer: '99' }),
      { ...india, vehicleId: 'v1' },
    );
    expect(result).toMatchObject({
      ok: true,
      input: { vehicleId: null, dueOdometerM: null, dueDate: '2026-10-28' },
    });
  });

  it('needs a due; months must be whole; typos per field', () => {
    expect(
      toReminderInput(values({ dueOdometer: '', repeatMonths: '1.5', leadDays: 'x' }), {
        ...india,
        vehicleId: 'v1',
      }),
    ).toEqual({
      ok: false,
      errors: { repeatMonths: 'out_of_range', leadDays: 'not_a_number', due: 'required' },
    });
  });
});

describe('editing a reminder', () => {
  const saved: Reminder = {
    id: 'r1',
    vehicleId: 'v1',
    kind: 'service',
    typeKey: 'engine_oil',
    title: null,
    dueDate: '2027-04-28',
    dueOdometerM: 15_400_123,
    repeatMonths: 6,
    repeatDistanceM: 3_000_000,
    leadDays: 7,
    leadDistanceM: 300_000,
    status: 'active',
    lastDoneDate: null,
    lastDoneOdometerM: null,
    createdAt: '2026-10-28T10:00:00.000Z',
    updatedAt: '2026-10-28T10:00:00.000Z',
  };

  it('round-trips and keeps exact metres when untouched', () => {
    const initial = toReminderFormValues(saved, india);
    expect(initial).toMatchObject({ dueOdometer: '15,400.1', repeatMonths: '6', hasDueDate: true });
    const current = { ...initial, leadDays: '14' };
    const result = toReminderInput(current, { ...india, vehicleId: 'v1' });
    if (!result.ok) throw new Error('expected ok');
    expect(result.input.dueDate).toBe('2027-04-28');
    expect(keepUntouchedReminder(result.input, saved, initial, current)).toMatchObject({
      dueOdometerM: 15_400_123,
      leadDays: 14,
    });
  });
});

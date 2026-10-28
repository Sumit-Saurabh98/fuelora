import type { ServiceEntry } from '@/domain/service-entry';
import { regionDefaults } from '@/domain/regions';

import {
  keepUntouchedService,
  toServiceFormValues,
  toServiceInput,
  type ServiceFormValues,
} from '../service-form-values';

const india = {
  units: regionDefaults('IN', 'INR'),
  separators: { decimal: '.', group: ',' },
  locale: 'en-IN',
};
const ctx = { ...india, vehicleId: 'v1', today: '2026-10-28' };

const values = (change: Partial<ServiceFormValues> = {}): ServiceFormValues => ({
  servicedOn: new Date(2026, 9, 20, 15, 30),
  typeKey: 'general_service',
  title: '',
  odometer: '',
  cost: '',
  note: '',
  ...change,
});

describe('toServiceInput', () => {
  it('date only is enough for a preset', () => {
    expect(toServiceInput(values(), ctx)).toEqual({
      ok: true,
      input: expect.objectContaining({
        servicedDate: '2026-10-20',
        odometerM: null,
        costMinor: null,
        typeKey: 'general_service',
      }),
    });
  });

  it('odometer in metres and cost in minor units', () => {
    expect(toServiceInput(values({ odometer: '12,500', cost: '850.50' }), ctx)).toMatchObject({
      ok: true,
      input: { odometerM: 12_500_000, costMinor: 85_050, currency: 'INR' },
    });
  });

  it('custom needs a title; typos go to their field; no future dates', () => {
    expect(
      toServiceInput(
        values({
          typeKey: 'custom',
          odometer: 'x',
          cost: '1.2.3',
          servicedOn: new Date(2026, 9, 29, 9),
        }),
        ctx,
      ),
    ).toEqual({
      ok: false,
      errors: {
        odometer: 'not_a_number',
        cost: 'not_a_number',
        title: 'required',
        servicedOn: 'in_future',
      },
    });
  });
});

describe('editing a service', () => {
  const saved: ServiceEntry = {
    id: 's1',
    vehicleId: 'v1',
    servicedDate: '2026-10-20',
    odometerM: 12_345_678,
    typeKey: 'custom',
    title: 'Horn',
    costMinor: 45_000,
    currency: 'INR',
    note: null,
    createdAt: '2026-10-20T09:00:00.000Z',
    updatedAt: '2026-10-20T09:00:00.000Z',
  };

  it('shows the saved values; the day survives the round trip', () => {
    const form = toServiceFormValues(saved, india);
    expect(form).toMatchObject({
      typeKey: 'custom',
      title: 'Horn',
      odometer: '12,345.7',
      cost: '450',
    });
    expect(toServiceInput(form, ctx)).toMatchObject({ input: { servicedDate: '2026-10-20' } });
  });

  it('an untouched odometer keeps its exact metres', () => {
    const initial = toServiceFormValues(saved, india);
    const current = { ...initial, note: 'Left side' };
    const result = toServiceInput(current, ctx);
    if (!result.ok) throw new Error('expected ok');
    expect(keepUntouchedService(result.input, saved, initial, current).odometerM).toBe(12_345_678);
  });
});

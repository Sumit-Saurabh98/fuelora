import { regionDefaults } from '@/domain/regions';

import type { Vehicle } from '@/domain/vehicle';

import {
  keepUntouchedValues,
  tankUnitFor,
  toFormValues,
  toNewVehicleInput,
  type VehicleFormValues,
} from '../vehicle-form-values';

const india = { units: regionDefaults('IN', 'INR'), separators: { decimal: '.', group: ',' } };
const us = { units: regionDefaults('US', 'USD'), separators: { decimal: '.', group: ',' } };
const ctx = (c: typeof india) => ({ ...c, currentYear: 2026 });

const values = (change: Partial<VehicleFormValues> = {}): VehicleFormValues => ({
  type: 'scooter',
  fuelType: 'petrol',
  name: 'My scooter',
  odometer: '12,345',
  make: '',
  model: '',
  year: '',
  plate: '',
  tank: '',
  ...change,
});

describe('toNewVehicleInput', () => {
  it('converts an Indian odometer with grouping to metres', () => {
    expect(toNewVehicleInput(values(), ctx(india))).toEqual({
      ok: true,
      input: expect.objectContaining({ initialOdometerM: 12_345_000, name: 'My scooter' }),
    });
  });

  it('converts miles for US users', () => {
    const result = toNewVehicleInput(values({ odometer: '1,000' }), ctx(us));
    expect(result).toMatchObject({ ok: true, input: { initialOdometerM: 1_609_344 } });
  });

  it('converts tank size in the user units, and battery size in kWh', () => {
    expect(toNewVehicleInput(values({ tank: '5.3' }), ctx(india))).toMatchObject({
      input: { tankCapacityBase: 5300 },
    });
    expect(toNewVehicleInput(values({ tank: '12', fuelType: 'petrol' }), ctx(us))).toMatchObject({
      input: { tankCapacityBase: 45_425 }, // 12 US gal
    });
    expect(toNewVehicleInput(values({ tank: '3.2', fuelType: 'electric' }), ctx(us))).toMatchObject(
      { input: { tankCapacityBase: 3200 } }, // kWh regardless of region
    );
  });

  it('accepts 0 for a new vehicle and a 4-digit year', () => {
    expect(toNewVehicleInput(values({ odometer: '0', year: '2024' }), ctx(india))).toMatchObject({
      ok: true,
      input: { initialOdometerM: 0, year: 2024 },
    });
  });

  it('maps every problem to the field the user typed it in', () => {
    const result = toNewVehicleInput(
      values({ name: ' ', odometer: '', year: '24', tank: 'abc', plate: 'X'.repeat(21) }),
      ctx(india),
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        name: 'required',
        odometer: 'required',
        year: 'not_a_number',
        tank: 'not_a_number',
        plate: 'too_long',
      },
    });
  });

  it('reports a parse error rather than the range error it would cause', () => {
    expect(toNewVehicleInput(values({ odometer: '1.2.3' }), ctx(india))).toEqual({
      ok: false,
      errors: { odometer: 'not_a_number' },
    });
  });

  it('flags an impossible odometer', () => {
    expect(toNewVehicleInput(values({ odometer: '3000000' }), ctx(india))).toEqual({
      ok: false,
      errors: { odometer: 'out_of_range' },
    });
  });

  it('picks the tank unit from the fuel', () => {
    expect(tankUnitFor('cng', india.units)).toBe('kg');
    expect(tankUnitFor('electric', india.units)).toBe('kWh');
    expect(tankUnitFor('diesel', us.units)).toBe('gal_us');
  });
});

const saved: Vehicle = {
  id: 'v1',
  name: 'My Activa',
  type: 'scooter',
  fuelType: 'petrol',
  make: 'Honda',
  model: null,
  year: 2023,
  plate: 'KA01AB1234',
  initialOdometerM: 12_345_000,
  tankCapacityBase: 5300,
  isArchived: false,
  sortOrder: 0,
  createdAt: '2026-10-28T10:00:00.000Z',
  updatedAt: '2026-10-28T10:00:00.000Z',
};

describe('toFormValues', () => {
  it('shows a saved vehicle in the user units, empty text for missing details', () => {
    expect(toFormValues(saved, { units: india.units, locale: 'en-IN' })).toEqual({
      type: 'scooter',
      fuelType: 'petrol',
      name: 'My Activa',
      odometer: '12,345',
      make: 'Honda',
      model: '',
      year: '2023',
      plate: 'KA01AB1234',
      tank: '5.3',
    });
  });

  it('converts to miles and US gallons, rounded for display', () => {
    const form = toFormValues(saved, { units: us.units, locale: 'en-US' });
    expect(form.odometer).toBe('7,670.8'); // 7,670.849… mi
    expect(form.tank).toBe('1.4');
  });

  it('round-trips back to the same input for Indian units', () => {
    const form = toFormValues(saved, { units: india.units, locale: 'en-IN' });
    expect(toNewVehicleInput(form, ctx(india))).toMatchObject({
      ok: true,
      input: { initialOdometerM: 12_345_000, tankCapacityBase: 5300 },
    });
  });
});

describe('keepUntouchedValues', () => {
  // What re-reading the rounded US text would give: slightly off from the stored values.
  const reparsed = {
    name: 'My Activa',
    type: 'scooter' as const,
    fuelType: 'petrol' as const,
    initialOdometerM: 12_344_986,
    tankCapacityBase: 5300,
  };

  it('keeps the exact stored odometer and tank when the user did not touch them', () => {
    const input = keepUntouchedValues(
      { ...reparsed, tankCapacityBase: 5300 + 3 },
      saved,
      { odometer: false, tank: false },
      us.units,
    );
    expect(input).toMatchObject({ initialOdometerM: 12_345_000, tankCapacityBase: 5300 });
  });

  it('uses the new values for fields the user changed', () => {
    const input = keepUntouchedValues(reparsed, saved, { odometer: true, tank: true }, us.units);
    expect(input).toMatchObject({ initialOdometerM: 12_344_986, tankCapacityBase: 5300 });
  });

  it('re-reads the tank when the fuel change switches its unit (L → kWh)', () => {
    const input = keepUntouchedValues(
      { ...reparsed, fuelType: 'electric', tankCapacityBase: 5_300_000 },
      saved,
      { odometer: false, tank: false },
      india.units,
    );
    expect(input.tankCapacityBase).toBe(5_300_000);
  });
});

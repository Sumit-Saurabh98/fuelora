import { regionDefaults } from '@/domain/regions';

import { tankUnitFor, toNewVehicleInput, type VehicleFormValues } from '../vehicle-form-values';

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

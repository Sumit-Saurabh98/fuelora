import { validateNewVehicle, type NewVehicleInput } from '../vehicle';

const YEAR = 2026;
const base: NewVehicleInput = {
  name: 'My Activa',
  type: 'scooter',
  fuelType: 'petrol',
  initialOdometerM: 12_345_000,
};

describe('validateNewVehicle', () => {
  it('accepts the essentials and fills optional fields with null', () => {
    expect(validateNewVehicle(base, YEAR)).toEqual({
      ok: true,
      value: {
        ...base,
        make: null,
        model: null,
        year: null,
        plate: null,
        tankCapacityBase: null,
      },
    });
  });

  it('trims text, drops empty optionals and uppercases the plate', () => {
    const result = validateNewVehicle(
      { ...base, name: '  My Activa ', make: ' Honda ', model: '   ', plate: ' ka01ab1234 ' },
      YEAR,
    );
    expect(result).toMatchObject({
      ok: true,
      value: { name: 'My Activa', make: 'Honda', model: null, plate: 'KA01AB1234' },
    });
  });

  it('accepts full details', () => {
    const result = validateNewVehicle(
      { ...base, make: 'Honda', model: 'Activa 6G', year: 2023, tankCapacityBase: 5300 },
      YEAR,
    );
    expect(result).toMatchObject({ ok: true, value: { year: 2023, tankCapacityBase: 5300 } });
  });

  it('reports every problem at once', () => {
    const result = validateNewVehicle(
      {
        name: '   ',
        type: 'boat' as NewVehicleInput['type'],
        fuelType: 'coal' as NewVehicleInput['fuelType'],
        initialOdometerM: -1,
        make: 'x'.repeat(41),
        model: 'y'.repeat(41),
        plate: 'Z'.repeat(21),
        year: 1899,
        tankCapacityBase: 0,
      },
      YEAR,
    );
    expect(result).toEqual({
      ok: false,
      issues: {
        name: 'required',
        type: 'invalid',
        fuelType: 'invalid',
        initialOdometerM: 'out_of_range',
        make: 'too_long',
        model: 'too_long',
        plate: 'too_long',
        year: 'out_of_range',
        tankCapacityBase: 'out_of_range',
      },
    });
  });

  it.each([
    ['name too long', { name: 'n'.repeat(41) }, 'name', 'too_long'],
    ['fractional odometer', { initialOdometerM: 10.5 }, 'initialOdometerM', 'out_of_range'],
    [
      'odometer over 2,000,000 km',
      { initialOdometerM: 2_000_000_001 },
      'initialOdometerM',
      'out_of_range',
    ],
    ['next-next year', { year: YEAR + 2 }, 'year', 'out_of_range'],
    ['fractional year', { year: 2020.5 }, 'year', 'out_of_range'],
    ['negative tank', { tankCapacityBase: -5 }, 'tankCapacityBase', 'out_of_range'],
    ['tank over 1,000 L', { tankCapacityBase: 1_000_001 }, 'tankCapacityBase', 'out_of_range'],
  ] as const)('rejects %s', (_label, change, field, issue) => {
    const result = validateNewVehicle({ ...base, ...change }, YEAR);
    expect(result).toEqual({ ok: false, issues: { [field]: issue } });
  });

  it.each([
    ['odometer 0 (new vehicle)', { initialOdometerM: 0 }],
    ['next model year', { year: YEAR + 1 }],
    ['oldest year', { year: 1900 }],
    ['40-character name', { name: 'n'.repeat(40) }],
  ] as const)('accepts %s', (_label, change) => {
    expect(validateNewVehicle({ ...base, ...change }, YEAR).ok).toBe(true);
  });
});

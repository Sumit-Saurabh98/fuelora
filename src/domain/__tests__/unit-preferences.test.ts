import { regionDefaults } from '../regions';
import { isValidUnitValue, resolveUnits } from '../unit-preferences';

describe('resolveUnits', () => {
  const india = regionDefaults('IN', 'INR');

  it('uses the region defaults when nothing is overridden', () => {
    expect(resolveUnits(india, {})).toEqual(india);
  });

  it('applies only the fields the user changed', () => {
    expect(resolveUnits(india, { distanceUnit: 'mi', efficiencyLiquid: 'l_per_100km' })).toEqual({
      ...india,
      distanceUnit: 'mi',
      efficiencyLiquid: 'l_per_100km',
    });
  });
});

describe('isValidUnitValue', () => {
  it.each([
    ['currency', 'EUR', true],
    ['currency', 'eur', false],
    ['currency', 'EURO', false],
    ['distanceUnit', 'mi', true],
    ['distanceUnit', 'L', false],
    ['volumeUnit', 'gal_uk', true],
    ['volumeUnit', 'kg', false],
    ['efficiencyLiquid', 'mpg_uk', true],
    ['efficiencyLiquid', 'km_per_kwh', false],
    ['efficiencyEv', 'mi_per_kwh', true],
    ['efficiencyEv', 'km_per_l', false],
  ] as const)('%s = %p → %p', (key, value, expected) => {
    expect(isValidUnitValue(key, value)).toBe(expected);
  });

  it('rejects missing values', () => {
    expect(isValidUnitValue('distanceUnit', undefined)).toBe(false);
  });
});

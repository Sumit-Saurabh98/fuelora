import { isServiceTypeKey, presetColumnFor, servicePresetsFor } from '../presets';

describe('service presets (KB §5)', () => {
  it('bike list includes chain lube; scooter has the CVT belt instead', () => {
    const bike = servicePresetsFor({ type: 'bike', fuelType: 'petrol' }).map((p) => p.key);
    const scooter = servicePresetsFor({ type: 'scooter', fuelType: 'petrol' }).map((p) => p.key);
    expect(bike).toContain('chain_lube');
    expect(bike).not.toContain('cvt_belt');
    expect(scooter).toContain('cvt_belt');
    expect(scooter).not.toContain('chain_lube');
  });

  it('EVs have no engine oil and get their own intervals', () => {
    const ev = servicePresetsFor({ type: 'car', fuelType: 'electric' });
    expect(ev.map((p) => p.key)).not.toContain('engine_oil');
    expect(ev.find((p) => p.key === 'battery_check')?.interval).toEqual({ months: 12 });
  });

  it('suggested intervals in canonical metres', () => {
    const car = servicePresetsFor({ type: 'car', fuelType: 'diesel' });
    expect(car[0]).toEqual({
      key: 'general_service',
      interval: { distanceM: 10_000_000, months: 12 },
    });
    expect(car.find((p) => p.key === 'tyre_pressure')?.interval).toEqual({
      days: 30,
      optional: true,
    });
  });

  it('electric wins over body type; "other" uses the car list', () => {
    expect(presetColumnFor({ type: 'scooter', fuelType: 'electric' })).toBe('ev');
    expect(presetColumnFor({ type: 'other', fuelType: 'cng' })).toBe('car');
  });

  it('recognises stored keys', () => {
    expect(isServiceTypeKey('engine_oil')).toBe(true);
    expect(isServiceTypeKey('custom')).toBe(true);
    expect(isServiceTypeKey('oil')).toBe(false);
  });
});

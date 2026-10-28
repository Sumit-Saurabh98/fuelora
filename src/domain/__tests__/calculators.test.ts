import { EfficiencyEngine } from '../efficiency';
import { mileageInAllFormats, splitEvenly, tripCost } from '../calculators';
import { Money } from '../money';

describe('EfficiencyEngine.quantityFor (inverse of value)', () => {
  const engine = new EfficiencyEngine();
  it.each([
    ['km_per_l', 40, 300_000, 7500],
    ['l_per_100km', 6, 300_000, 18_000],
    ['mpg_us', 30, 482_803, 37_854], // 300 mi → 10 US gal
    ['km_per_kwh', 6, 300_000, 50_000],
  ] as const)('%s', (format, efficiency, distanceM, quantityBase) => {
    expect(engine.quantityFor(distanceM, efficiency, format)).toBe(quantityBase);
  });

  it('round-trips with value()', () => {
    const q = engine.quantityFor(320_000, 40, 'km_per_l')!;
    expect(engine.value({ distanceM: 320_000, quantityBase: q }, 'km_per_l')).toBe(40);
  });

  it('no quantity without distance or efficiency', () => {
    expect(engine.quantityFor(0, 40, 'km_per_l')).toBeNull();
    expect(engine.quantityFor(1000, 0, 'km_per_l')).toBeNull();
  });
});

describe('tripCost (FR-19)', () => {
  it('300 km at 40 km/L and ₹104.50/L, split between 3', () => {
    const trip = tripCost({
      distanceM: 300_000,
      efficiency: 40,
      format: 'km_per_l',
      unitPrice: 104.5,
      unit: 'L',
      currency: 'INR',
      people: 3,
    });
    expect(trip?.quantityBase).toBe(7500);
    expect(trip?.total.amountMinor).toBe(78_375); // ₹783.75
    expect(trip?.perPerson.map((m) => m.amountMinor)).toEqual([26_125, 26_125, 26_125]);
  });

  it('US: 300 mi at 30 mpg and $3.459/gal', () => {
    const trip = tripCost({
      distanceM: 482_803,
      efficiency: 30,
      format: 'mpg_us',
      unitPrice: 3.459,
      unit: 'gal_us',
      currency: 'USD',
    });
    expect(trip?.total.amountMinor).toBe(3459);
  });

  it('invalid inputs give nothing', () => {
    const base = {
      distanceM: 1000,
      efficiency: 40,
      format: 'km_per_l' as const,
      unit: 'L' as const,
      currency: 'INR',
    };
    expect(tripCost({ ...base, unitPrice: Number.NaN })).toBeNull();
    expect(tripCost({ ...base, unitPrice: 100, people: 0 })).toBeNull();
  });
});

describe('splitEvenly', () => {
  it('shares add up exactly', () => {
    const shares = splitEvenly(Money.ofMinor(10_000, 'INR'), 3)!;
    expect(shares.map((m) => m.amountMinor)).toEqual([3334, 3333, 3333]);
    expect(shares.reduce((sum, m) => sum + m.amountMinor, 0)).toBe(10_000);
  });

  it('zero-decimal currencies split in whole yen', () => {
    expect(splitEvenly(Money.ofMinor(1000, 'JPY'), 3)!.map((m) => m.amountMinor)).toEqual([
      334, 333, 333,
    ]);
  });
});

describe('mileageInAllFormats (FR-20)', () => {
  it('liquid: km/L, L/100 km, mpg US and UK', () => {
    const all = mileageInAllFormats(320_000, 8000, 'liquid');
    expect(all.map((r) => r.format)).toEqual(['km_per_l', 'l_per_100km', 'mpg_us', 'mpg_uk']);
    expect(all[0]?.value).toBe(40);
    expect(all[1]?.value).toBe(2.5);
    expect(all[2]?.value).toBeCloseTo(94.09, 2); // 198.84 mi on 2.113 US gal
  });

  it('EV and CNG formats', () => {
    expect(mileageInAllFormats(120_000, 20_000, 'electric').map((r) => r.format)).toEqual([
      'km_per_kwh',
      'mi_per_kwh',
      'kwh_per_100km',
    ]);
    expect(mileageInAllFormats(100_000, 1000, 'cng')).toEqual([
      { format: 'km_per_kg', value: 100 },
    ]);
  });
});

import type { EfficiencyFillUp } from '../efficiency';
import { regionDefaults } from '../regions';
import { efficiencyFormatFor, fillUpResult, vehicleStats } from '../vehicle-stats';

// odo km, litres, rupees, full?, date
function f(
  id: string,
  km: number,
  litres: number,
  rupees: number,
  isFull = true,
  localDate = '2026-10-10',
  missedPrevious = false,
): EfficiencyFillUp {
  return {
    id,
    odometerM: km * 1000,
    quantityBase: litres * 1000,
    totalMinor: rupees * 100,
    currency: 'INR',
    isFull,
    missedPrevious,
    localDate,
  };
}

const kmL = { format: 'km_per_l' as const, distanceUnit: 'km' as const };

describe('efficiencyFormatFor', () => {
  it('uses the liquid / EV setting; CNG is always km/kg', () => {
    const us = regionDefaults('US', 'USD');
    expect(efficiencyFormatFor('petrol', us)).toBe('mpg_us');
    expect(efficiencyFormatFor('diesel', us)).toBe('mpg_us');
    expect(efficiencyFormatFor('electric', us)).toBe('mi_per_kwh');
    expect(efficiencyFormatFor('cng', us)).toBe('km_per_kg');
  });
});

describe('fillUpResult (FR-10)', () => {
  const entries = [
    f('a', 10_000, 5, 500),
    f('b', 10_150, 3, 300, false),
    f('c', 10_320, 5, 500),
    f('d', 10_600, 7, 700, true, '2026-10-20', true),
  ];

  it('a full fill closing a segment: km/L and cost per km over the whole tank', () => {
    expect(fillUpResult(entries, 'c', kmL)).toEqual({
      kind: 'segment',
      figures: {
        distanceM: 320_000,
        quantityBase: 8000,
        efficiency: 40,
        costPerDistance: [expect.objectContaining({ amountMinor: 250, currency: 'INR' })],
      },
    });
  });

  it('first full fill is the baseline; a partial waits for the next full tank', () => {
    expect(fillUpResult(entries, 'a', kmL)).toEqual({ kind: 'baseline' });
    expect(fillUpResult(entries, 'b', kmL)).toEqual({ kind: 'partial' });
  });

  it('a segment with a missed fill-up shows no number', () => {
    expect(fillUpResult(entries, 'd', kmL)).toEqual({ kind: 'missed' });
  });

  it('unknown id', () => {
    expect(fillUpResult(entries, 'zz', kmL)).toBeNull();
  });

  it('US: mpg', () => {
    // 300 mi on 10 US gal (LLD §4.4 #9)
    const us = [
      { ...f('a', 0, 1, 1), odometerM: 0, quantityBase: 1000 },
      { ...f('b', 0, 0, 30), odometerM: 482_803, quantityBase: 37_854 },
    ];
    const result = fillUpResult(us, 'b', { format: 'mpg_us', distanceUnit: 'mi' });
    expect(result?.kind === 'segment' && result.figures.efficiency).toBeCloseTo(30, 1);
  });
});

describe('vehicleStats (F-06)', () => {
  const options = { ...kmL, today: '2026-10-28', initialOdometerM: 9_900_000 };

  it('nothing to show without fill-ups', () => {
    expect(vehicleStats([], options)).toEqual({
      last: null,
      average: null,
      monthSpend: [],
      monthDistanceM: null,
    });
  });

  it('last and distance-weighted average (LLD §4.4 #11)', () => {
    const stats = vehicleStats(
      [f('a', 1000, 5, 500), f('b', 1400, 10, 1000), f('c', 1500, 5, 500)],
      options,
    );
    expect(stats.last?.efficiency).toBe(20);
    expect(stats.average?.efficiency).toBeCloseTo(33.33, 2); // 500 / 15, not 30
    expect(stats.average?.segments).toBe(2);
    // ₹1,500 over 500 km
    expect(stats.average?.costPerDistance.map((m) => m.amountMinor)).toEqual([300]);
  });

  it('a missed segment is skipped for last and average', () => {
    const stats = vehicleStats(
      [
        f('a', 1000, 5, 500),
        f('b', 1400, 10, 1000),
        f('c', 1500, 5, 500, true, '2026-10-12', true),
      ],
      options,
    );
    expect(stats.last?.efficiency).toBe(40);
    expect(stats.average?.segments).toBe(1);
  });

  it('this month: spend per currency and distance from the last reading before it', () => {
    const stats = vehicleStats(
      [
        f('sep', 10_000, 5, 500, true, '2026-09-28'),
        f('oct1', 10_200, 4, 400, false, '2026-10-05'),
        f('oct2', 10_450, 5, 550, true, '2026-10-20'),
      ],
      options,
    );
    expect(stats.monthSpend.map((m) => m.amountMinor)).toEqual([95_000]);
    expect(stats.monthDistanceM).toBe(450_000);
  });

  it('first month of a vehicle counts from its starting odometer', () => {
    const stats = vehicleStats([f('a', 10_000, 5, 500, true, '2026-10-05')], options);
    expect(stats.monthDistanceM).toBe(100_000);
  });

  it('nothing this month', () => {
    const stats = vehicleStats([f('sep', 10_000, 5, 500, true, '2026-09-28')], options);
    expect(stats.monthSpend).toEqual([]);
    expect(stats.monthDistanceM).toBeNull();
  });
});

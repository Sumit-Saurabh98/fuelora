import type { EfficiencyFillUp } from '../efficiency';
import { rangeStart, statsSeries } from '../stats';

function f(
  id: string,
  km: number,
  litres: number,
  rupees: number,
  localDate: string,
  change: Partial<EfficiencyFillUp> = {},
): EfficiencyFillUp {
  return {
    id,
    odometerM: km * 1000,
    quantityBase: litres * 1000,
    totalMinor: rupees * 100,
    currency: 'INR',
    isFull: true,
    missedPrevious: false,
    localDate,
    ...change,
  };
}

const today = '2026-10-28';
const opts = (range: '3m' | '6m' | '1y' | 'all') => ({
  range,
  today,
  format: 'km_per_l' as const,
  distanceUnit: 'km' as const,
});

const history = [
  f('a', 10_000, 5, 500, '2026-03-10'),
  f('b', 10_400, 10, 1000, '2026-04-10'), // 40 km/L, April
  f('c', 10_500, 5, 500, '2026-09-05'), // 20 km/L, September
  f('d', 10_800, 6, 600, '2026-10-20'), // 50 km/L, October
];

describe('rangeStart', () => {
  it('months back from today; all time has none', () => {
    expect(rangeStart('3m', today)).toBe('2026-07-28');
    expect(rangeStart('1y', today)).toBe('2025-10-28');
    expect(rangeStart('all', today)).toBeNull();
  });
});

describe('statsSeries (F-08)', () => {
  it('all time: a point per segment, distance-weighted average, best and worst', () => {
    const s = statsSeries(history, opts('all'));
    expect(s.efficiency).toEqual([
      { date: '2026-04-10', value: 40 },
      { date: '2026-09-05', value: 20 },
      { date: '2026-10-20', value: 50 },
    ]);
    expect(s.average).toBeCloseTo(800 / 21, 5); // not the mean of 40, 20, 50
    expect(s.best).toBe(50);
    expect(s.worst).toBe(20);
    expect(s.segments).toBe(3);
    expect(s.distanceM).toBe(800_000);
  });

  it('3 months: only segments that closed in range; spend per month with gaps', () => {
    const s = statsSeries(history, opts('3m'));
    expect(s.efficiency.map((p) => p.date)).toEqual(['2026-09-05', '2026-10-20']);
    expect(s.monthly.map((m) => [m.month, m.spend.map((x) => x.amountMinor)])).toEqual([
      ['2026-07', []],
      ['2026-08', []],
      ['2026-09', [50_000]],
      ['2026-10', [60_000]],
    ]);
    expect(s.totalSpend.map((m) => m.amountMinor)).toEqual([110_000]);
    // ₹1,100 over 400 km
    expect(s.costPerDistance.map((m) => m.amountMinor)).toEqual([275]);
  });

  it('all time starts at the first entry', () => {
    expect(statsSeries(history, opts('all')).monthly[0]?.month).toBe('2026-03');
  });

  it('L/100 km: lower is better', () => {
    const s = statsSeries(history, { ...opts('all'), format: 'l_per_100km' });
    expect(s.best).toBe(2); // 50 km/L
    expect(s.worst).toBe(5); // 20 km/L
  });

  it('nothing to show', () => {
    expect(statsSeries([], opts('all'))).toMatchObject({
      efficiency: [],
      monthly: [],
      average: null,
      best: null,
      segments: 0,
    });
  });
});

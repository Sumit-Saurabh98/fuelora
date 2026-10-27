import { EfficiencyEngine, type EfficiencyFillUp, type Segment } from '../efficiency';
import { quantityFromTotal } from '../fill-up';
import { Money } from '../money';
import { distanceToMetres, quantityToBase, type DistanceUnit, type QuantityUnit } from '../units';

const engine = new EfficiencyEngine();

let seq = 0;
/** A fill-up as the user would type it, converted to canonical units by the real converters. */
function fill(
  odometer: number,
  quantity: number,
  opts: {
    full?: boolean;
    missed?: boolean;
    total?: number;
    currency?: string;
    date?: string;
    distanceUnit?: DistanceUnit;
    quantityUnit?: QuantityUnit;
    id?: string;
  } = {},
): EfficiencyFillUp {
  seq += 1;
  const currency = opts.currency ?? 'INR';
  return {
    id: opts.id ?? `f${seq}`,
    odometerM: distanceToMetres(odometer, opts.distanceUnit ?? 'km'),
    quantityBase: quantityToBase(quantity, opts.quantityUnit ?? 'L'),
    totalMinor: Money.fromMajor(opts.total ?? quantity * 100, currency).amountMinor,
    currency,
    isFull: opts.full ?? true,
    missedPrevious: opts.missed ?? false,
    localDate: opts.date ?? '2026-10-01',
  };
}
const partial = (odo: number, qty: number, opts: Parameters<typeof fill>[2] = {}) =>
  fill(odo, qty, { ...opts, full: false });

/** Average over everything, the way the dashboard asks for it. */
function average(fillUps: EfficiencyFillUp[], format: Parameters<EfficiencyEngine['value']>[1]) {
  return engine.value(engine.summary(engine.segments(fillUps)), format);
}

describe('EfficiencyEngine — LLD §4.4 fixtures', () => {
  it('#1 a single full fill-up is only a baseline: no efficiency', () => {
    const fills = [fill(10000, 5)];
    expect(engine.segments(fills)).toEqual([]);
    expect(engine.summary(engine.segments(fills))).toEqual({
      distanceM: 0,
      quantityBase: 0,
      validSegments: 0,
      costs: [],
    });
    expect(average(fills, 'km_per_l')).toBeNull();
  });

  it('#2 two full fills: 320 km / 8 L = 40.0 km/L', () => {
    const fills = [fill(10000, 5, { id: 'a' }), fill(10320, 8, { id: 'b' })];
    const [segment] = engine.segments(fills);
    expect(segment).toMatchObject({
      startId: 'a',
      endId: 'b',
      distanceM: 320_000,
      quantityBase: 8000,
      valid: true,
    });
    expect(average(fills, 'km_per_l')).toBeCloseTo(40.0, 6);
  });

  it('#3 a partial in between is added to the next full: 320 / (3 + 5) = 40.0', () => {
    const fills = [fill(10000, 5), partial(10150, 3), fill(10320, 5)];
    expect(engine.segments(fills)).toHaveLength(1);
    expect(engine.segments(fills)[0]).toMatchObject({ distanceM: 320_000, quantityBase: 8000 });
    expect(average(fills, 'km_per_l')).toBeCloseTo(40.0, 6);
  });

  it('#4 only partials after the baseline: no new value yet (pending)', () => {
    const fills = [fill(10000, 5), partial(10150, 3), partial(10200, 2)];
    expect(engine.segments(fills)).toEqual([]);
    expect(average(fills, 'km_per_l')).toBeNull();
  });

  it('#5 missed fill-up: first segment invalid, second 280/7 = 40.0, average 40.0', () => {
    const fills = [fill(10000, 5), fill(10320, 8, { missed: true }), fill(10600, 7)];
    const segments = engine.segments(fills);
    expect(segments.map((s) => [s.valid, s.reason, s.distanceM, s.quantityBase])).toEqual([
      [false, 'missed_fill', 320_000, 8000],
      [true, undefined, 280_000, 7000],
    ]);
    expect(engine.value(segments[1]!, 'km_per_l')).toBeCloseTo(40.0, 6);
    expect(average(fills, 'km_per_l')).toBeCloseTo(40.0, 6);
  });

  it('#6 partials before the first full are ignored; first full is the baseline: 300/6 = 50.0', () => {
    const fills = [
      partial(10000, 4),
      partial(10100, 2),
      fill(10200, 5, { id: 'c' }),
      fill(10500, 6),
    ];
    const segments = engine.segments(fills);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ startId: 'c', distanceM: 300_000, quantityBase: 6000 });
    expect(average(fills, 'km_per_l')).toBeCloseTo(50.0, 6);
  });

  it('#7 editing a middle odometer changes the order and the segments are recomputed', () => {
    const first = fill(10000, 5, { id: 'a' });
    const middle = partial(10150, 3, { id: 'b' });
    const last = fill(10320, 5, { id: 'c' });
    expect(average([first, middle, last], 'km_per_l')).toBeCloseTo(40.0, 6);

    // The partial's odometer is corrected to after the last full fill (and passed in DB order).
    const edited = { ...middle, odometerM: distanceToMetres(10400, 'km') };
    const segments = engine.segments([first, edited, last]);
    expect(segments.map((s) => [s.startId, s.endId, s.distanceM, s.quantityBase])).toEqual([
      ['a', 'c', 320_000, 5000],
    ]);
    expect(average([first, edited, last], 'km_per_l')).toBeCloseTo(64.0, 6); // 320 / 5
    segments.forEach((s) => expect(s.distanceM).toBeGreaterThan(0));
  });

  it('#8 amount-only: ₹200 at ₹104.50/L → 1913.88 mL → stored 1914', () => {
    expect(quantityFromTotal(Money.fromMajor(200, 'INR'), 104.5, 'L')).toBe(1914);
  });

  it('#9 US: 300 mi on 10 US gal = 30.0 mpg (US) = 12.75 km/L', () => {
    const units = { distanceUnit: 'mi', quantityUnit: 'gal_us' } as const;
    const fills = [fill(1000, 10, units), fill(1300, 10, units)];
    expect(average(fills, 'mpg_us')).toBeCloseTo(30.0, 3);
    expect(average(fills, 'km_per_l')).toBeCloseTo(12.75, 2);
  });

  it('#10 EV: 120 km on 4 kWh = 30.0 km/kWh = 3.33 kWh/100 km', () => {
    const units = { quantityUnit: 'kWh' } as const;
    const fills = [fill(5000, 4, units), fill(5120, 4, units)];
    expect(average(fills, 'km_per_kwh')).toBeCloseTo(30.0, 6);
    expect(average(fills, 'kwh_per_100km')).toBeCloseTo(3.33, 2);
  });

  it('#11 average is distance-weighted: 400/10 and 100/5 → 500/15 = 33.3, not 30.0', () => {
    const fills = [fill(10000, 5), fill(10400, 10), fill(10500, 5)];
    const segments = engine.segments(fills);
    expect(segments.map((s) => engine.value(s, 'km_per_l'))).toEqual([40, 20]);
    expect(average(fills, 'km_per_l')).toBeCloseTo(33.333, 3);
  });
});

describe('EfficiencyEngine — segments', () => {
  it('a missed fill-up flagged on a partial also invalidates its segment', () => {
    const fills = [
      fill(10000, 5),
      partial(10150, 3, { missed: true }),
      fill(10320, 5),
      fill(10620, 6),
    ];
    expect(engine.segments(fills).map((s) => s.valid)).toEqual([false, true]);
    expect(average(fills, 'km_per_l')).toBeCloseTo(50.0, 6); // only 300 / 6
  });

  it('keeps cost per currency and dates segments by their closing fill-up', () => {
    const fills = [
      fill(10000, 5, { total: 500 }),
      partial(10150, 3, { total: 315.5 }),
      fill(10320, 5, { total: 520.25, date: '2026-10-09' }),
    ];
    const [segment] = engine.segments(fills);
    expect(segment!.endDate).toBe('2026-10-09');
    expect(segment!.costs.map((c) => [c.currency, c.amountMinor])).toEqual([['INR', 83_575]]);
  });

  it('handles 1,500 fill-ups in one pass (NFR-4)', () => {
    const fills = Array.from({ length: 1500 }, (_, i) => fill(10000 + i * 100, 2.5));
    const started = performance.now();
    const segments = engine.segments(fills);
    expect(segments).toHaveLength(1499);
    expect(performance.now() - started).toBeLessThan(200);
  });
});

describe('EfficiencyEngine — summary', () => {
  const segmentsOf = (...fills: EfficiencyFillUp[]): Segment[] => engine.segments(fills);

  it('only counts segments that close inside the range', () => {
    const segments = segmentsOf(
      fill(10000, 5, { date: '2026-08-30' }),
      fill(10400, 10, { date: '2026-09-15' }), // 40 km/L, September
      fill(10500, 5, { date: '2026-10-05' }), // 20 km/L, October
    );
    const october = engine.summary(segments, { from: '2026-10-01', to: '2026-10-31' });
    expect(october).toMatchObject({ distanceM: 100_000, quantityBase: 5000, validSegments: 1 });
    expect(engine.value(october, 'km_per_l')).toBeCloseTo(20.0, 6);
    expect(engine.summary(segments, { to: '2026-09-30' }).validSegments).toBe(1);
    expect(engine.summary(segments).validSegments).toBe(2);
  });

  it('gives cost per km and per mile as Money', () => {
    const summary = engine.summary(
      segmentsOf(fill(10000, 5, { total: 500 }), fill(10320, 8, { total: 832 })),
    );
    expect(summary.costs).toHaveLength(1);
    const [inr] = summary.costs;
    expect(engine.costPerDistance(inr!, 'km')!.equals(Money.fromMajor(2.6, 'INR'))).toBe(true);
    expect(engine.costPerDistance(inr!, 'mi')!.amountMinor).toBe(418); // ₹832 / 198.84 mi
  });

  it('never adds different currencies; a mixed-currency segment still counts for mileage', () => {
    const summary = engine.summary(
      segmentsOf(
        fill(10000, 5, { total: 500 }),
        fill(10320, 8, { total: 832 }), // INR segment
        partial(10450, 3, { total: 4.5, currency: 'USD' }),
        fill(10600, 4, { total: 420 }), // mixed INR + USD segment
      ),
    );
    expect(summary.distanceM).toBe(600_000);
    expect(summary.costs.map((c) => [c.cost.currency, c.cost.amountMinor, c.distanceM])).toEqual([
      ['INR', 83_200, 320_000],
    ]);
  });

  it('keeps separate totals for a traveller who changed currency', () => {
    const summary = engine.summary(
      segmentsOf(
        fill(10000, 5, { total: 500 }),
        fill(10320, 8, { total: 832 }),
        fill(10600, 7, { total: 9.1, currency: 'USD' }),
      ),
    );
    expect(summary.costs.map((c) => [c.cost.currency, c.cost.amountMinor, c.distanceM])).toEqual([
      ['INR', 83_200, 320_000],
      ['USD', 910, 280_000],
    ]);
  });

  it('excludes invalid segments from cost per distance too', () => {
    const summary = engine.summary(
      segmentsOf(fill(10000, 5, { total: 500 }), fill(10320, 8, { total: 832, missed: true })),
    );
    expect(summary).toMatchObject({ distanceM: 0, validSegments: 0, costs: [] });
  });
});

describe('EfficiencyEngine — formats (LLD §3)', () => {
  const totals = { distanceM: 400_000, quantityBase: 20_000 }; // 400 km on 20 L

  it.each([
    ['km_per_l', 20],
    ['l_per_100km', 5],
    ['mpg_us', 47.04],
    ['mpg_uk', 56.5],
  ] as const)('400 km on 20 L in %s = %p', (format, expected) => {
    expect(engine.value(totals, format)).toBeCloseTo(expected, 1);
  });

  it('EV: 400 km on 60 kWh', () => {
    const ev = { distanceM: 400_000, quantityBase: 60_000 };
    expect(engine.value(ev, 'km_per_kwh')).toBeCloseTo(6.67, 2);
    expect(engine.value(ev, 'mi_per_kwh')).toBeCloseTo(4.14, 2);
    expect(engine.value(ev, 'kwh_per_100km')).toBeCloseTo(15, 6);
  });

  it('CNG: 250 km on 4.2 kg = 59.5 km/kg', () => {
    expect(engine.value({ distanceM: 250_000, quantityBase: 4200 }, 'km_per_kg')).toBeCloseTo(
      59.52,
      2,
    );
  });

  it('is null when there is no distance or no quantity', () => {
    expect(engine.value({ distanceM: 0, quantityBase: 5000 }, 'km_per_l')).toBeNull();
    expect(engine.value({ distanceM: 1000, quantityBase: 0 }, 'l_per_100km')).toBeNull();
  });

  it('amount-only needs a usable price', () => {
    expect(quantityFromTotal(Money.fromMajor(200, 'INR'), 0, 'L')).toBeNull();
    expect(quantityFromTotal(Money.fromMajor(200, 'INR'), Number.NaN, 'L')).toBeNull();
    expect(quantityFromTotal(Money.fromMajor(43.25, 'USD'), 3.459, 'gal_us')).toBe(47_331); // 12.5036 gal
  });
});

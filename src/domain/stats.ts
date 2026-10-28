import { addMonths } from './dates';
import { EfficiencyEngine, type EfficiencyFillUp, type EfficiencyFormat } from './efficiency';
import { Money, sumByCurrency } from './money';
import type { DistanceUnit } from './units';

// Stats screen series (F-08, ARCHITECTURE §7: pre-aggregated). All efficiency and cost per
// distance comes from EfficiencyEngine (AGENTS.md rule 5).

const engine = new EfficiencyEngine();

export const STATS_RANGES = ['3m', '6m', '1y', 'all'] as const;
export type StatsRange = (typeof STATS_RANGES)[number];

const RANGE_MONTHS: Record<Exclude<StatsRange, 'all'>, number> = { '3m': 3, '6m': 6, '1y': 12 };

/** First day included (YYYY-MM-DD), or null for all time. */
export function rangeStart(range: StatsRange, today: string): string | null {
  return range === 'all' ? null : addMonths(today, -RANGE_MONTHS[range]);
}

export type EfficiencyPoint = { date: string; value: number };
export type MonthSpend = { month: string; spend: Money[] };

export type VehicleStatsSeries = {
  /** One point per valid full-to-full segment, by the day it closed. */
  efficiency: EfficiencyPoint[];
  /** Every month in the range (gaps included, so bars line up), oldest first. */
  monthly: MonthSpend[];
  /** Distance-weighted average over the range; null without a valid segment. */
  average: number | null;
  best: number | null;
  worst: number | null;
  /** Per currency, over valid single-currency segments in range. */
  costPerDistance: Money[];
  totalSpend: Money[];
  distanceM: number;
  segments: number;
};

function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  let cursor = `${from.slice(0, 7)}-01`;
  const last = to.slice(0, 7);
  while (cursor.slice(0, 7) <= last) {
    months.push(cursor.slice(0, 7));
    cursor = addMonths(cursor, 1);
  }
  return months;
}

/**
 * Stats for one vehicle over `range`. For "lower is better" formats (L/100 km, kWh/100 km) best
 * is the smallest value.
 */
export function statsSeries(
  fillUps: readonly EfficiencyFillUp[],
  options: {
    range: StatsRange;
    today: string;
    format: EfficiencyFormat;
    distanceUnit: DistanceUnit;
  },
): VehicleStatsSeries {
  const from = rangeStart(options.range, options.today);
  const inRange = (day: string) => (from === null || day >= from) && day <= options.today;
  const segments = engine.segments(fillUps);
  const valid = segments.filter((s) => s.valid && inRange(s.endDate));

  const efficiency = valid.flatMap((s) => {
    const value = engine.value(s, options.format);
    return value === null ? [] : [{ date: s.endDate, value }];
  });
  const summary = engine.summary(segments, { from: from ?? undefined, to: options.today });
  const lowerIsBetter = options.format === 'l_per_100km' || options.format === 'kwh_per_100km';
  const values = efficiency.map((p) => p.value);

  const entries = fillUps.filter((f) => inRange(f.localDate));
  const firstDay =
    from ??
    entries.reduce<string | null>(
      (min, f) => (!min || f.localDate < min ? f.localDate : min),
      null,
    );
  const monthly = firstDay
    ? monthsBetween(firstDay, options.today).map((month) => ({
        month,
        spend: sumByCurrency(
          entries
            .filter((f) => f.localDate.startsWith(month))
            .map((f) => Money.ofMinor(f.totalMinor, f.currency)),
        ),
      }))
    : [];

  return {
    efficiency,
    monthly,
    average: summary.validSegments > 0 ? engine.value(summary, options.format) : null,
    best: values.length ? (lowerIsBetter ? Math.min(...values) : Math.max(...values)) : null,
    worst: values.length ? (lowerIsBetter ? Math.max(...values) : Math.min(...values)) : null,
    costPerDistance: summary.costs
      .map((c) => engine.costPerDistance(c, options.distanceUnit))
      .filter((m): m is Money => m !== null),
    totalSpend: sumByCurrency(entries.map((f) => Money.ofMinor(f.totalMinor, f.currency))),
    distanceM: summary.distanceM,
    segments: summary.validSegments,
  };
}

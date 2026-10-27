import type {
  CngEfficiencyFormat,
  EvEfficiencyFormat,
  LiquidEfficiencyFormat,
} from './efficiency-formats';
import { Money, sumByCurrency } from './money';
import { baseTo, metresTo, type DistanceUnit } from './units';

// The only place that computes efficiency or cost per distance (AGENTS.md rule 5, LLD §4).
// Screens and services ask this engine; they never divide distance by fuel themselves.

/** What the engine needs from a stored fill-up (canonical units, LLD §2). */
export type EfficiencyFillUp = {
  id: string;
  odometerM: number;
  quantityBase: number;
  totalMinor: number;
  currency: string;
  isFull: boolean;
  missedPrevious: boolean;
  localDate: string; // YYYY-MM-DD
};

export type Segment = {
  /** Full fill-up the segment starts after (exclusive). */
  startId: string;
  /** Full fill-up that closes the segment (inclusive). */
  endId: string;
  /** localDate of the closing fill-up; segments belong to the period they close in. */
  endDate: string;
  distanceM: number;
  quantityBase: number;
  /** Cost per currency (almost always one entry; several only for a traveller). */
  costs: Money[];
  valid: boolean;
  reason?: 'missed_fill';
};

/** Inclusive YYYY-MM-DD bounds; either side may be open. */
export type DateRange = { from?: string; to?: string };

/** Distance and cost for one currency, from valid single-currency segments. */
export type CurrencyCost = { cost: Money; distanceM: number };

export type EfficiencySummary = {
  /** Totals over valid segments in range; average efficiency = distanceM / quantityBase. */
  distanceM: number;
  quantityBase: number;
  validSegments: number;
  costs: CurrencyCost[];
};

export type EfficiencyFormat = LiquidEfficiencyFormat | CngEfficiencyFormat | EvEfficiencyFormat;

export class EfficiencyEngine {
  /**
   * Full-to-full segments (LLD §4.1). Input order doesn't matter: fill-ups are sorted by odometer
   * here, so an edited odometer that changes the order is simply recomputed (fixture #7).
   */
  segments(fillUps: readonly EfficiencyFillUp[]): Segment[] {
    const sorted = [...fillUps].sort((a, b) => a.odometerM - b.odometerM);
    const segments: Segment[] = [];
    let start: EfficiencyFillUp | null = null; // last full fill-up = baseline of the open segment
    let pending: EfficiencyFillUp[] = []; // fill-ups after `start`, up to the next full

    for (const fillUp of sorted) {
      if (start === null) {
        // Anything before the first full fill-up produces no efficiency (rule 2).
        if (fillUp.isFull) start = fillUp;
        continue;
      }
      pending.push(fillUp);
      if (!fillUp.isFull) continue; // partials fold into the next full tank (rule 5)

      const missed = pending.some((f) => f.missedPrevious);
      segments.push({
        startId: start.id,
        endId: fillUp.id,
        endDate: fillUp.localDate,
        distanceM: fillUp.odometerM - start.odometerM,
        quantityBase: pending.reduce((sum, f) => sum + f.quantityBase, 0),
        costs: sumByCurrency(pending.map((f) => Money.ofMinor(f.totalMinor, f.currency))),
        valid: !missed,
        ...(missed ? { reason: 'missed_fill' as const } : {}),
      });
      // The next segment starts here even if this one was invalid (rule 4).
      start = fillUp;
      pending = [];
    }
    return segments;
  }

  /**
   * Distance-weighted totals over valid segments closing in `range` (rules 6–7): the average is
   * Σ distance ÷ Σ quantity, never the mean of segment values. Cost per distance is kept per
   * currency; a segment that mixes currencies counts for efficiency but not for cost.
   */
  summary(segments: readonly Segment[], range: DateRange = {}): EfficiencySummary {
    const inRange = segments.filter(
      (s) =>
        s.valid &&
        (range.from === undefined || s.endDate >= range.from) &&
        (range.to === undefined || s.endDate <= range.to),
    );

    const costs = new Map<string, CurrencyCost>();
    for (const s of inRange) {
      const [cost, ...others] = s.costs;
      if (!cost || others.length > 0) continue;
      const current = costs.get(cost.currency);
      costs.set(cost.currency, {
        cost: current ? current.cost.plus(cost) : cost,
        distanceM: (current?.distanceM ?? 0) + s.distanceM,
      });
    }

    return {
      distanceM: inRange.reduce((sum, s) => sum + s.distanceM, 0),
      quantityBase: inRange.reduce((sum, s) => sum + s.quantityBase, 0),
      validSegments: inRange.length,
      costs: [...costs.values()],
    };
  }

  /**
   * Efficiency in a display format (LLD §3). Base units make the metric forms exact ratios:
   * m/mL = km/L, m/g = km/kg, m/Wh = km/kWh. Null when there is nothing to divide.
   */
  value(
    totals: { distanceM: number; quantityBase: number },
    format: EfficiencyFormat,
  ): number | null {
    const { distanceM: m, quantityBase: q } = totals;
    if (m <= 0 || q <= 0) return null;
    switch (format) {
      case 'km_per_l':
      case 'km_per_kg':
      case 'km_per_kwh':
        return m / q;
      case 'l_per_100km':
      case 'kwh_per_100km':
        return (q / m) * 100;
      case 'mpg_us':
        return metresTo(m, 'mi') / baseTo(q, 'gal_us');
      case 'mpg_uk':
        return metresTo(m, 'mi') / baseTo(q, 'gal_uk');
      case 'mi_per_kwh':
        return metresTo(m, 'mi') / baseTo(q, 'kWh');
    }
  }

  /** Cost per km or mi, rounded to the currency's minor unit. Null without distance. */
  costPerDistance(currencyCost: CurrencyCost, unit: DistanceUnit): Money | null {
    if (currencyCost.distanceM <= 0) return null;
    const perUnit = currencyCost.cost.major / metresTo(currencyCost.distanceM, unit);
    return Money.fromMajor(perUnit, currencyCost.cost.currency);
  }
}

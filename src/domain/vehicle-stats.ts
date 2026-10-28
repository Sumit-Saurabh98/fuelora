import {
  EfficiencyEngine,
  type EfficiencyFillUp,
  type EfficiencyFormat,
  type Segment,
} from './efficiency';
import { Money, sumByCurrency } from './money';
import type { UnitPreferences } from './unit-preferences';
import type { DistanceUnit } from './units';
import type { FuelType } from './vehicle';

// Numbers for the result card and the vehicle dashboard (F-05, F-06). All efficiency and cost
// per distance comes from EfficiencyEngine; this file only picks which segments to ask about.

const engine = new EfficiencyEngine();

/** The display format the user chose for this fuel; CNG is always km/kg (LLD §3). */
export function efficiencyFormatFor(fuel: FuelType, units: UnitPreferences): EfficiencyFormat {
  if (fuel === 'cng') return 'km_per_kg';
  if (fuel === 'electric') return units.efficiencyEv;
  return units.efficiencyLiquid;
}

export type SegmentFigures = {
  distanceM: number;
  quantityBase: number;
  /** Efficiency in the requested format; null when there is nothing to divide. */
  efficiency: number | null;
  /** Per currency; empty when the segment mixed currencies. */
  costPerDistance: Money[];
};

function figures(
  segment: Pick<Segment, 'distanceM' | 'quantityBase' | 'costs'>,
  format: EfficiencyFormat,
  distanceUnit: DistanceUnit,
): SegmentFigures {
  const [cost, ...others] = segment.costs;
  const perDistance =
    cost && others.length === 0
      ? engine.costPerDistance({ cost, distanceM: segment.distanceM }, distanceUnit)
      : null;
  return {
    distanceM: segment.distanceM,
    quantityBase: segment.quantityBase,
    efficiency: engine.value(segment, format),
    costPerDistance: perDistance ? [perDistance] : [],
  };
}

/** What a just-saved fill-up means for mileage (FR-10, LLD §4.1). */
export type FillUpResult =
  | { kind: 'segment'; figures: SegmentFigures }
  /** Full, but nothing before it to measure from: the next full tank gives the first number. */
  | { kind: 'baseline' }
  /** Partial: counted in the next full tank (rule 5). */
  | { kind: 'partial' }
  /** Closes a segment that had a missed fill-up, so no number is shown (rule 4). */
  | { kind: 'missed' };

export function fillUpResult(
  fillUps: readonly EfficiencyFillUp[],
  fillUpId: string,
  options: { format: EfficiencyFormat; distanceUnit: DistanceUnit },
): FillUpResult | null {
  const fillUp = fillUps.find((f) => f.id === fillUpId);
  if (!fillUp) return null;
  if (!fillUp.isFull) return { kind: 'partial' };
  const segment = engine.segments(fillUps).find((s) => s.endId === fillUpId);
  if (!segment) return { kind: 'baseline' };
  if (!segment.valid) return { kind: 'missed' };
  return { kind: 'segment', figures: figures(segment, options.format, options.distanceUnit) };
}

export type VehicleStats = {
  /** The most recent valid full-to-full segment. */
  last: SegmentFigures | null;
  /** Distance-weighted over every valid segment (rule 6). */
  average: (SegmentFigures & { segments: number }) | null;
  /** Money spent on fill-ups dated this month, per currency (rule 8). */
  monthSpend: Money[];
  /** Odometer progress this month; null without a reading this month. */
  monthDistanceM: number | null;
};

/**
 * Dashboard numbers for one vehicle. `today` is the user's local date (YYYY-MM-DD) from the
 * injected clock; `initialOdometerM` is the reading the vehicle was added with.
 */
export function vehicleStats(
  fillUps: readonly EfficiencyFillUp[],
  options: {
    format: EfficiencyFormat;
    distanceUnit: DistanceUnit;
    today: string;
    initialOdometerM: number;
  },
): VehicleStats {
  const { format, distanceUnit } = options;
  const segments = engine.segments(fillUps);
  const valid = segments.filter((s) => s.valid);
  const lastSegment = valid.at(-1);
  const summary = engine.summary(segments);

  const monthStart = `${options.today.slice(0, 7)}-01`;
  const thisMonth = fillUps.filter(
    (f) => f.localDate >= monthStart && f.localDate <= options.today,
  );
  const before = fillUps.filter((f) => f.localDate < monthStart);
  let monthDistanceM: number | null = null;
  if (thisMonth.length > 0) {
    const from = Math.max(options.initialOdometerM, ...before.map((f) => f.odometerM));
    monthDistanceM = Math.max(...thisMonth.map((f) => f.odometerM)) - from;
  }

  return {
    last: lastSegment ? figures(lastSegment, format, distanceUnit) : null,
    average:
      summary.validSegments > 0
        ? {
            distanceM: summary.distanceM,
            quantityBase: summary.quantityBase,
            efficiency: engine.value(summary, format),
            costPerDistance: summary.costs
              .map((c) => engine.costPerDistance(c, distanceUnit))
              .filter((m): m is Money => m !== null),
            segments: summary.validSegments,
          }
        : null,
    monthSpend: sumByCurrency(thisMonth.map((f) => Money.ofMinor(f.totalMinor, f.currency))),
    monthDistanceM,
  };
}

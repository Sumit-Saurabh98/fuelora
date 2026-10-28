import {
  EfficiencyEngine,
  type EfficiencyFillUp,
  type EfficiencyFormat,
  type Segment,
} from './efficiency';
import type { FillUp } from './fill-up';
import { Money, sumByCurrency } from './money';
import type { ServiceEntry } from './service-entry';
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

/**
 * Latest known odometer (LLD §5.1): the highest of fill-up and service readings and the starting
 * reading. Manual odometer readings join when they exist. Services may have no reading.
 */
export function currentOdometerM(
  readings: readonly { odometerM: number | null }[],
  initialOdometerM: number,
): number {
  return readings.reduce((max, r) => Math.max(max, r.odometerM ?? 0), initialOdometerM);
}

/** What the history shows next to a full fill: its segment's efficiency, or that it was missed. */
export type SegmentMark = { kind: 'efficiency'; value: number | null } | { kind: 'missed' };

/** Efficiency per closing fill-up id, for the history list (F-07); one engine pass. */
export function segmentMarks(
  fillUps: readonly EfficiencyFillUp[],
  format: EfficiencyFormat,
): Map<string, SegmentMark> {
  const marks = new Map<string, SegmentMark>();
  for (const s of engine.segments(fillUps)) {
    marks.set(
      s.endId,
      s.valid ? { kind: 'efficiency', value: engine.value(s, format) } : { kind: 'missed' },
    );
  }
  return marks;
}

/** One History line: a fill-up or a service (F-07). */
export type HistoryItem =
  | {
      kind: 'fillUp';
      id: string;
      localDate: string;
      sortKey: string;
      amount: Money;
      fillUp: FillUp;
    }
  | {
      kind: 'service';
      id: string;
      localDate: string;
      sortKey: string;
      amount: Money | null;
      service: ServiceEntry;
    };

export function historyItems(
  fillUps: readonly FillUp[],
  services: readonly ServiceEntry[],
): HistoryItem[] {
  return [
    ...fillUps.map((f): HistoryItem => ({
      kind: 'fillUp',
      id: f.id,
      localDate: f.localDate,
      // Same-day entries: fill-ups by their time, services by when they were logged.
      sortKey: `${f.localDate}|${f.filledAt}`,
      amount: Money.ofMinor(f.totalMinor, f.currency),
      fillUp: f,
    })),
    ...services.map((s): HistoryItem => ({
      kind: 'service',
      id: s.id,
      localDate: s.servicedDate,
      sortKey: `${s.servicedDate}|${s.createdAt}`,
      amount:
        s.costMinor !== null && s.currency !== null ? Money.ofMinor(s.costMinor, s.currency) : null,
      service: s,
    })),
  ];
}

/** History newest first, grouped by calendar month (YYYY-MM) with everything spent in it. */
export function groupByMonth(
  items: readonly HistoryItem[],
): { month: string; spend: Money[]; entries: HistoryItem[] }[] {
  const sorted = [...items].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  const groups: { month: string; spend: Money[]; entries: HistoryItem[] }[] = [];
  for (const item of sorted) {
    const month = item.localDate.slice(0, 7);
    let group = groups.at(-1);
    if (group?.month !== month) {
      group = { month, spend: [], entries: [] };
      groups.push(group);
    }
    group.entries.push(item);
  }
  for (const g of groups) {
    g.spend = sumByCurrency(g.entries.flatMap((e) => (e.amount ? [e.amount] : [])));
  }
  return groups;
}

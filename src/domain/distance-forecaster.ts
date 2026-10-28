import { addDays, daysBetween } from './dates';

// LLD §5.2: how far the vehicle goes per day, from recent odometer readings, to turn a
// distance-due reminder into a predicted date (FR-13).

export type OdometerReading = { date: string; odometerM: number };

export const FORECAST_RULES = { windowDays: 90, minReadings: 2, minSpanDays: 7 } as const;

/**
 * Average metres per day over readings from the last 90 days; null without at least two
 * readings spanning a week, or when the odometer didn't move.
 */
export function averageDailyM(readings: readonly OdometerReading[], today: string): number | null {
  const recent = readings
    .filter((r) => {
      const age = daysBetween(r.date, today);
      return age >= 0 && age <= FORECAST_RULES.windowDays;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.odometerM - b.odometerM);
  if (recent.length < FORECAST_RULES.minReadings) return null;
  const first = recent[0]!;
  const last = recent.at(-1)!;
  const span = daysBetween(first.date, last.date);
  if (span < FORECAST_RULES.minSpanDays) return null;
  const perDay = (last.odometerM - first.odometerM) / span;
  return perDay > 0 ? perDay : null;
}

/** today + ceil(remaining ÷ daily distance); today when already reached; null without a rate. */
export function predictedDueDate(
  dueOdometerM: number,
  currentOdometerM: number,
  avgDailyM: number | null,
  today: string,
): string | null {
  if (avgDailyM === null || avgDailyM <= 0) return null;
  const remaining = dueOdometerM - currentOdometerM;
  if (remaining <= 0) return today;
  return addDays(today, Math.ceil(remaining / avgDailyM));
}

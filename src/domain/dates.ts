// Calendar-day arithmetic on YYYY-MM-DD strings (reminders, services). Pure UTC maths on the
// date parts, so device time zones and DST never shift a day.

function toUtc(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: string, days: number): string {
  return fromUtc(toUtc(day) + days * 86_400_000);
}

/** Adds calendar months, clamping to the month's last day (31 Jan + 1 month → 28/29 Feb). */
export function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const target = new Date(Date.UTC(y!, m! - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d!, lastDay));
  return fromUtc(target.getTime());
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

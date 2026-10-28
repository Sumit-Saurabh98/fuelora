import { atNotifyHour, NOTIFICATION_BUDGET, planNotifications } from '../reminder-planner';

const NOW = new Date(2026, 9, 28, 12, 0); // 28 Oct, 12:00 local
const item = (id: string, effectiveDate: string | null, leadDays = 7) => ({
  reminder: { id, leadDays, status: 'active' as const },
  effectiveDate,
});
const plan = (...items: ReturnType<typeof item>[]) =>
  planNotifications(items, NOW).map((n) => [n.key, n.fireAt.toDateString(), n.fireAt.getHours()]);

describe('planNotifications (LLD §5.4, FR-15)', () => {
  it('lead day, due day and 3 days overdue, all at 09:00', () => {
    expect(plan(item('ins', '2026-11-20'))).toEqual([
      ['ins:lead', new Date(2026, 10, 13).toDateString(), 9],
      ['ins:due', new Date(2026, 10, 20).toDateString(), 9],
      ['ins:overdue', new Date(2026, 10, 23).toDateString(), 9],
    ]);
  });

  it('skips what is already past (lead day gone, today 09:00 gone)', () => {
    expect(plan(item('soon', '2026-10-30')).map(([k]) => k)).toEqual(['soon:due', 'soon:overdue']);
    expect(plan(item('today', '2026-10-28')).map(([k]) => k)).toEqual(['today:overdue']);
    expect(plan(item('old', '2026-10-01'))).toEqual([]);
  });

  it('no lead notification with a 0-day lead; never two on one day', () => {
    expect(plan(item('r', '2026-11-20', 0)).map(([k]) => k)).toEqual(['r:due', 'r:overdue']);
  });

  it('distance reminders without a forecast are in-app only; finished ones never notify', () => {
    expect(plan(item('oil', null))).toEqual([]);
    expect(
      planNotifications(
        [{ reminder: { id: 'x', leadDays: 7, status: 'done' }, effectiveDate: '2026-12-01' }],
        NOW,
      ),
    ).toEqual([]);
  });

  it('keeps the soonest 60 (iOS limit is 64)', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      item(`r${String(i).padStart(2, '0')}`, `2027-${String((i % 12) + 1).padStart(2, '0')}-15`),
    );
    const planned = planNotifications(many, NOW);
    expect(planned).toHaveLength(NOTIFICATION_BUDGET);
    const times = planned.map((n) => n.fireAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('09:00 local on the day', () => {
    const at = atNotifyHour('2026-11-20');
    expect([at.getFullYear(), at.getMonth(), at.getDate(), at.getHours(), at.getMinutes()]).toEqual(
      [2026, 10, 20, 9, 0],
    );
  });
});

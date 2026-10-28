import { InMemoryNotificationGateway } from '../in-memory-notification-gateway';
import { NotificationScheduler } from '../notification-scheduler';

const at = (day: number) => new Date(2026, 10, day, 9);
const req = (key: string, day: number, title = key) => ({
  key,
  fireAt: at(day),
  content: { title, body: 'Due today.' },
});

function setup() {
  const gateway = new InMemoryNotificationGateway();
  return { gateway, scheduler: new NotificationScheduler(gateway) };
}
const keys = (g: InMemoryNotificationGateway) => [...g.scheduled.values()].map((n) => n.key).sort();

describe('NotificationScheduler (AGENTS.md rule 8)', () => {
  it('schedules what is planned', async () => {
    const { gateway, scheduler } = setup();
    await scheduler.sync([req('a:due', 20), req('b:lead', 13)]);
    expect(keys(gateway)).toEqual(['a:due', 'b:lead']);
  });

  it('a second sync with the same plan changes nothing', async () => {
    const { gateway, scheduler } = setup();
    await scheduler.sync([req('a:due', 20)]);
    const ids = [...gateway.scheduled.keys()];
    await scheduler.sync([req('a:due', 20)]);
    expect([...gateway.scheduled.keys()]).toEqual(ids);
  });

  it('moves rescheduled, rewords renamed, cancels stale', async () => {
    const { gateway, scheduler } = setup();
    await scheduler.sync([req('a:due', 20), req('b:due', 21), req('c:due', 22)]);
    await scheduler.sync([req('a:due', 25), req('b:due', 21, 'Renamed')]);
    const byKey = new Map([...gateway.scheduled.values()].map((n) => [n.key, n]));
    expect([...byKey.keys()].sort()).toEqual(['a:due', 'b:due']);
    expect(byKey.get('a:due')?.fireAt).toBe(at(25).getTime());
    expect(byKey.get('b:due')?.title).toBe('Renamed');
  });

  it('never more than 60', async () => {
    const { gateway, scheduler } = setup();
    await scheduler.sync(Array.from({ length: 70 }, (_, i) => req(`r${i}:due`, 1 + (i % 28))));
    expect(gateway.scheduled.size).toBe(60);
  });

  it('without permission it schedules nothing and keeps what is there', async () => {
    const { gateway, scheduler } = setup();
    await scheduler.sync([req('a:due', 20)]);
    gateway.state = 'denied';
    await scheduler.sync([]);
    expect(keys(gateway)).toEqual(['a:due']);
  });

  it('asks for permission only while it can', async () => {
    const { gateway, scheduler } = setup();
    gateway.state = 'undetermined';
    gateway.answer = 'denied';
    expect(await scheduler.ensurePermission()).toBe('denied');
    expect(await scheduler.ensurePermission()).toBe('denied');
    expect(gateway.prompts).toBe(1);
  });
});

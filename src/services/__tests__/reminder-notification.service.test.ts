import { FixedClock } from '@/domain/clock';
import type { IdGenerator } from '@/domain/id-generator';
import { InMemoryNotificationGateway } from '@/notifications/in-memory-notification-gateway';
import { NotificationScheduler } from '@/notifications/notification-scheduler';
import { InMemoryFillUpRepository } from '@/repositories/in-memory-fill-up.repository';
import { InMemoryReminderRepository } from '@/repositories/in-memory-reminder.repository';
import { InMemoryServiceLogRepository } from '@/repositories/in-memory-service-log.repository';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { InMemoryVehicleRepository } from '@/repositories/in-memory-vehicle.repository';

import { FillUpService } from '../fill-up.service';
import {
  ReminderNotificationService,
  type NotificationTexts,
} from '../reminder-notification.service';
import { ReminderService } from '../reminder.service';
import { ServiceLogService } from '../service-log.service';
import { SettingsService } from '../settings.service';
import { VehicleService } from '../vehicle.service';

// 28 Oct 2026, 10:00 local
const NOW = new Date(2026, 9, 28, 10);

async function setup() {
  let n = 0;
  const ids: IdGenerator = { next: () => `id${++n}` };
  const clock = new FixedClock(NOW);
  const settings = new SettingsService(new InMemorySettingsRepository(), clock);
  const vehicles = new VehicleService(new InMemoryVehicleRepository(), settings, clock, ids);
  const fillUps = new FillUpService(new InMemoryFillUpRepository(), vehicles, clock, ids);
  const services = new ServiceLogService(new InMemoryServiceLogRepository(), vehicles, clock, ids);
  const reminders = new ReminderService(
    new InMemoryReminderRepository(),
    vehicles,
    { currentOdometerM: async () => null },
    clock,
    ids,
  );
  const gateway = new InMemoryNotificationGateway();
  const sync = new ReminderNotificationService(
    reminders,
    vehicles,
    fillUps,
    services,
    new NotificationScheduler(gateway),
    clock,
  );
  const activa = await vehicles.create({
    name: 'My Activa',
    type: 'scooter',
    fuelType: 'petrol',
    initialOdometerM: 12_000_000,
  });
  return { sync, gateway, reminders, vehicles, fillUps, activa };
}

const texts: NotificationTexts = ({ kind, reminder, vehicleName, dueDate }) => ({
  title: `${reminder.typeKey}${vehicleName ? ` · ${vehicleName}` : ''}`,
  body: `${kind} ${dueDate}`,
});
const scheduled = (g: InMemoryNotificationGateway) =>
  [...g.scheduled.values()].sort((a, b) => a.fireAt - b.fireAt).map((n) => [n.title, n.body]);

describe('ReminderNotificationService', () => {
  it('a dated reminder gets lead, due and overdue notifications with names', async () => {
    const { sync, gateway, reminders, activa } = await setup();
    await reminders.create({
      vehicleId: activa.id,
      kind: 'document',
      typeKey: 'insurance',
      dueDate: '2026-11-20',
    });
    await reminders.create({
      vehicleId: null,
      kind: 'document',
      typeKey: 'licence',
      dueDate: '2026-11-02',
    });

    await sync.sync(texts);

    expect(scheduled(gateway)).toEqual([
      ['licence', 'due 2026-11-02'],
      ['licence', 'overdue 2026-11-02'],
      ['insurance · My Activa', 'lead 2026-11-20'],
      ['insurance · My Activa', 'due 2026-11-20'],
      ['insurance · My Activa', 'overdue 2026-11-20'],
    ]);
  });

  it('a distance reminder is timed by the recent pace (LLD §5.2)', async () => {
    const { sync, gateway, reminders, fillUps, activa } = await setup();
    const fill = (day: number, km: number) =>
      fillUps.add({
        vehicleId: activa.id,
        filledAt: new Date(2026, 9, day, 9),
        odometerM: km * 1000,
        quantityBase: 5000,
        totalMinor: 50_000,
        currency: 'INR',
        isFull: true,
        missedPrevious: false,
        entryMode: 'qty_total',
      });
    await fill(1, 12_000);
    await fill(21, 12_600); // 30 km/day
    // 900 km to go → 30 days → 27 Nov
    await reminders.create({
      vehicleId: activa.id,
      kind: 'service',
      typeKey: 'engine_oil',
      dueOdometerM: 13_500_000,
    });

    await sync.sync(texts);

    expect(scheduled(gateway).map(([, body]) => body)).toEqual([
      'lead 2026-11-27',
      'due 2026-11-27',
      'overdue 2026-11-27',
    ]);
  });

  it('without a forecast a distance reminder stays in the app only', async () => {
    const { sync, gateway, reminders, activa } = await setup();
    await reminders.create({
      vehicleId: activa.id,
      kind: 'service',
      typeKey: 'engine_oil',
      dueOdometerM: 13_500_000,
    });
    await sync.sync(texts);
    expect(gateway.scheduled.size).toBe(0);
  });

  it('archived vehicles and done reminders go quiet', async () => {
    const { sync, gateway, reminders, vehicles, activa } = await setup();
    const r = await reminders.create({
      vehicleId: activa.id,
      kind: 'document',
      typeKey: 'insurance',
      dueDate: '2026-11-20',
    });
    await sync.sync(texts);
    expect(gateway.scheduled.size).toBe(3);

    await vehicles.archive(activa.id);
    await sync.sync(texts);
    expect(gateway.scheduled.size).toBe(0);

    await vehicles.unarchive(activa.id);
    await reminders.markDone(r.id);
    await sync.sync(texts);
    expect(gateway.scheduled.size).toBe(0);
  });
});

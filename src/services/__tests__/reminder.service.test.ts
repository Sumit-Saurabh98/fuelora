import { FixedClock } from '@/domain/clock';
import type { IdGenerator } from '@/domain/id-generator';
import type { NewReminderInput } from '@/domain/reminder';
import { InMemoryReminderRepository } from '@/repositories/in-memory-reminder.repository';
import { InMemoryServiceLogRepository } from '@/repositories/in-memory-service-log.repository';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { InMemoryVehicleRepository } from '@/repositories/in-memory-vehicle.repository';

import { ReminderService } from '../reminder.service';
import { ServiceLogService } from '../service-log.service';
import { SettingsService } from '../settings.service';
import { VehicleService } from '../vehicle.service';

const NOW = new Date('2026-10-28T10:00:00.000Z');

async function setup(currentOdometerM: number | null = 14_900_000) {
  let n = 0;
  const ids: IdGenerator = { next: () => `id${++n}` };
  const clock = new FixedClock(NOW);
  const settings = new SettingsService(new InMemorySettingsRepository(), clock);
  const vehicles = new VehicleService(new InMemoryVehicleRepository(), settings, clock, ids);
  const repo = new InMemoryReminderRepository();
  const reminders = new ReminderService(
    repo,
    vehicles,
    { currentOdometerM: async () => currentOdometerM },
    clock,
    ids,
  );
  const services = new ServiceLogService(
    new InMemoryServiceLogRepository(),
    vehicles,
    clock,
    ids,
    reminders,
  );
  const activa = await vehicles.create({
    name: 'My Activa',
    type: 'scooter',
    fuelType: 'petrol',
    initialOdometerM: 12_000_000,
  });
  return { reminders, services, vehicles, repo, activa };
}

const oil = (vehicleId: string, change: Partial<NewReminderInput> = {}): NewReminderInput => ({
  vehicleId,
  kind: 'service',
  typeKey: 'engine_oil',
  dueDate: '2026-12-01',
  dueOdometerM: 15_000_000,
  repeatMonths: 6,
  repeatDistanceM: 3_000_000,
  ...change,
});

describe('ReminderService', () => {
  it('creates an active reminder with the default lead', async () => {
    const { reminders, activa } = await setup();
    const r = await reminders.create(oil(activa.id));
    expect(r).toMatchObject({
      status: 'active',
      leadDays: 7,
      leadDistanceM: 300_000,
      lastDoneDate: null,
      createdAt: NOW.toISOString(),
    });
    expect(await reminders.listActiveForVehicle(activa.id)).toEqual([r]);
  });

  it('rejects invalid input and archived vehicles', async () => {
    const { reminders, vehicles, activa } = await setup();
    await expect(
      reminders.create(oil(activa.id, { dueDate: null, dueOdometerM: null })),
    ).rejects.toMatchObject({ code: 'INVALID_REMINDER', details: { issues: { due: 'required' } } });
    await vehicles.archive(activa.id);
    await expect(reminders.create(oil(activa.id))).rejects.toMatchObject({
      code: 'VEHICLE_NOT_FOUND',
    });
  });

  it('a person-level licence reminder needs no vehicle', async () => {
    const { reminders } = await setup();
    const licence = await reminders.create({
      vehicleId: null,
      kind: 'document',
      typeKey: 'licence',
      dueDate: '2030-05-01',
    });
    expect((await reminders.listActive()).map((r) => r.id)).toEqual([licence.id]);
  });

  it('mark done today at the current odometer rolls a repeat forward (FR-14)', async () => {
    const { reminders, activa } = await setup(14_900_000);
    const r = await reminders.create(oil(activa.id));
    const done = await reminders.markDone(r.id);
    expect(done).toMatchObject({
      status: 'active',
      dueDate: '2027-04-28',
      dueOdometerM: 17_900_000,
      lastDoneDate: '2026-10-28',
      lastDoneOdometerM: 14_900_000,
    });
  });

  it('a one-off reminder is finished and leaves the active list', async () => {
    const { reminders, activa } = await setup();
    const r = await reminders.create(oil(activa.id, { repeatMonths: null, repeatDistanceM: null }));
    await reminders.markDone(r.id);
    expect(await reminders.listActiveForVehicle(activa.id)).toEqual([]);
    expect((await reminders.get(r.id))?.status).toBe('done');
  });

  it('logging the same service completes it from the service date and odometer (F-09)', async () => {
    const { reminders, services, activa } = await setup();
    const r = await reminders.create(oil(activa.id));
    const other = await reminders.create(oil(activa.id, { typeKey: 'air_filter' }));

    await services.add({
      vehicleId: activa.id,
      servicedDate: '2026-10-20',
      typeKey: 'engine_oil',
      odometerM: 14_800_000,
      currency: 'INR',
    });

    expect(await reminders.get(r.id)).toMatchObject({
      dueDate: '2027-04-20',
      dueOdometerM: 17_800_000,
      lastDoneDate: '2026-10-20',
      lastDoneOdometerM: 14_800_000,
    });
    expect((await reminders.get(other.id))?.lastDoneDate).toBeNull();
  });

  it('a service without a reading uses the current odometer for the next due', async () => {
    const { reminders, services, activa } = await setup(14_950_000);
    const r = await reminders.create(oil(activa.id));
    await services.add({
      vehicleId: activa.id,
      servicedDate: '2026-10-20',
      typeKey: 'engine_oil',
      currency: 'INR',
    });
    expect((await reminders.get(r.id))?.dueOdometerM).toBe(17_950_000);
  });

  it('updates and deletes', async () => {
    const { reminders, activa } = await setup();
    const r = await reminders.create(oil(activa.id));
    const edited = await reminders.update(r.id, oil(activa.id, { leadDays: 14 }));
    expect(edited).toMatchObject({ leadDays: 14, createdAt: r.createdAt });
    await reminders.delete(r.id);
    expect(await reminders.get(r.id)).toBeNull();
    await expect(reminders.delete(r.id)).rejects.toMatchObject({ code: 'REMINDER_NOT_FOUND' });
  });
});

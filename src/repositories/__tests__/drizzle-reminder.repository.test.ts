import { createTestDatabase } from '@/db/testing/node-drizzle';
import type { Reminder } from '@/domain/reminder';

import { DrizzleReminderRepository } from '../drizzle-reminder.repository';
import { DrizzleVehicleRepository } from '../drizzle-vehicle.repository';

const TS = '2026-10-28T10:00:00.000Z';

function reminder(id: string, change: Partial<Reminder> = {}): Reminder {
  return {
    id,
    vehicleId: 'v1',
    kind: 'service',
    typeKey: 'engine_oil',
    title: null,
    dueDate: null,
    dueOdometerM: 15_000_000,
    repeatMonths: null,
    repeatDistanceM: null,
    leadDays: 7,
    leadDistanceM: 300_000,
    status: 'active',
    lastDoneDate: null,
    lastDoneOdometerM: null,
    createdAt: TS,
    updatedAt: TS,
    ...change,
  };
}

async function setup() {
  const { db } = createTestDatabase();
  await new DrizzleVehicleRepository(db).insert({
    id: 'v1',
    name: 'v1',
    type: 'car',
    fuelType: 'petrol',
    make: null,
    model: null,
    year: null,
    plate: null,
    initialOdometerM: 0,
    tankCapacityBase: null,
    isArchived: false,
    sortOrder: 0,
    createdAt: TS,
    updatedAt: TS,
  });
  return new DrizzleReminderRepository(db);
}

describe('DrizzleReminderRepository', () => {
  it('round-trips every field incl. a person-level licence', async () => {
    const repo = await setup();
    const full = reminder('r1', {
      dueDate: '2026-12-01',
      repeatMonths: 6,
      repeatDistanceM: 3_000_000,
      lastDoneDate: '2026-06-01',
      lastDoneOdometerM: 12_000_000,
    });
    const licence = reminder('lic', {
      vehicleId: null,
      kind: 'document',
      typeKey: 'licence',
      dueDate: '2030-05-01',
      dueOdometerM: null,
    });
    await repo.insert(full);
    await repo.insert(licence);
    expect(await repo.getById('r1')).toEqual(full);
    expect(await repo.getById('lic')).toEqual(licence);
  });

  it('lists active ones only, per vehicle or all', async () => {
    const repo = await setup();
    await repo.insert(reminder('a'));
    await repo.insert(reminder('done', { status: 'done' }));
    await repo.insert(
      reminder('lic', {
        vehicleId: null,
        typeKey: 'licence',
        kind: 'document',
        dueDate: '2030-01-01',
        dueOdometerM: null,
      }),
    );
    expect((await repo.listActiveForVehicle('v1')).map((r) => r.id)).toEqual(['a']);
    expect((await repo.listActive()).map((r) => r.id).sort()).toEqual(['a', 'lic']);

    await repo.update(reminder('a', { status: 'archived' }));
    expect(await repo.listActiveForVehicle('v1')).toEqual([]);
    await repo.delete('a');
    expect(await repo.getById('a')).toBeNull();
  });
});

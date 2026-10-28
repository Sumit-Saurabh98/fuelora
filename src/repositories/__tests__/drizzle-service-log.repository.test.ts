import { createTestDatabase } from '@/db/testing/node-drizzle';
import type { ServiceEntry } from '@/domain/service-entry';

import { DrizzleServiceLogRepository } from '../drizzle-service-log.repository';
import { DrizzleVehicleRepository } from '../drizzle-vehicle.repository';

const TS = '2026-10-28T10:00:00.000Z';

function service(id: string, change: Partial<ServiceEntry> = {}): ServiceEntry {
  return {
    id,
    vehicleId: 'v1',
    servicedDate: '2026-10-20',
    odometerM: null,
    typeKey: 'general_service',
    title: null,
    costMinor: null,
    currency: null,
    note: null,
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
  return new DrizzleServiceLogRepository(db);
}

describe('DrizzleServiceLogRepository', () => {
  it('round-trips every field incl. nulls', async () => {
    const repo = await setup();
    const full = service('s1', {
      odometerM: 12_500_000,
      typeKey: 'custom',
      title: 'Horn',
      costMinor: 45_000,
      currency: 'INR',
      note: 'Left side',
    });
    await repo.insert(full);
    await repo.insert(service('s2'));
    expect(await repo.getById('s1')).toEqual(full);
    expect(await repo.getById('s2')).toEqual(service('s2'));
  });

  it('lists a vehicle newest date first; updates and deletes', async () => {
    const repo = await setup();
    await repo.insert(service('old', { servicedDate: '2026-08-01' }));
    await repo.insert(service('new', { servicedDate: '2026-10-01' }));
    expect((await repo.listByVehicle('v1')).map((s) => s.id)).toEqual(['new', 'old']);

    await repo.update(service('old', { note: 'fixed' }));
    expect((await repo.getById('old'))?.note).toBe('fixed');
    await repo.delete('old');
    expect(await repo.getById('old')).toBeNull();
  });
});

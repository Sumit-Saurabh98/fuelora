import { createTestDatabase } from '@/db/testing/node-drizzle';
import type { FillUp } from '@/domain/fill-up';

import { DrizzleFillUpRepository } from '../drizzle-fill-up.repository';
import { DrizzleVehicleRepository } from '../drizzle-vehicle.repository';

const TS = '2026-10-28T10:00:00.000Z';

function fillUp(id: string, overrides: Partial<FillUp> = {}): FillUp {
  return {
    id,
    vehicleId: 'v1',
    filledAt: TS,
    localDate: '2026-10-28',
    odometerM: 1000,
    quantityBase: 5000,
    totalMinor: 52_250,
    currency: 'INR',
    isFull: true,
    missedPrevious: false,
    entryMode: 'qty_total',
    station: null,
    note: null,
    createdAt: TS,
    updatedAt: TS,
    ...overrides,
  };
}

async function setup() {
  const { db } = createTestDatabase();
  const vehicles = new DrizzleVehicleRepository(db);
  for (const id of ['v1', 'v2']) {
    await vehicles.insert({
      id,
      name: id,
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
  }
  return new DrizzleFillUpRepository(db);
}

describe('DrizzleFillUpRepository', () => {
  it('stores and reads back every field, including booleans and nulls', async () => {
    const repo = await setup();
    const row = fillUp('f1', {
      isFull: false,
      missedPrevious: true,
      entryMode: 'amount_only',
      station: 'HP',
      note: 'Highway',
    });
    await repo.insert(row);
    expect(await repo.getById('f1')).toEqual(row);
    expect(await repo.getById('missing')).toBeNull();
  });

  it('lists one vehicle ordered by odometer', async () => {
    const repo = await setup();
    await repo.insert(fillUp('late', { odometerM: 3000 }));
    await repo.insert(fillUp('early', { odometerM: 1000 }));
    await repo.insert(fillUp('other', { vehicleId: 'v2', odometerM: 2000 }));
    expect((await repo.listByVehicle('v1')).map((f) => f.id)).toEqual(['early', 'late']);
  });

  it('enforces one reading per odometer per vehicle (unique index)', async () => {
    const repo = await setup();
    await repo.insert(fillUp('a'));
    await expect(repo.insert(fillUp('b'))).rejects.toThrow();
    await repo.insert(fillUp('c', { vehicleId: 'v2' }));
  });

  it('updates and deletes', async () => {
    const repo = await setup();
    await repo.insert(fillUp('a'));
    await repo.update(fillUp('a', { odometerM: 1500, note: 'fixed' }));
    expect(await repo.getById('a')).toMatchObject({ odometerM: 1500, note: 'fixed' });
    await repo.delete('a');
    expect(await repo.getById('a')).toBeNull();
  });
});

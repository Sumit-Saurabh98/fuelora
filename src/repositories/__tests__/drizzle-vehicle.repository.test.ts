import { createTestDatabase } from '@/db/testing/node-drizzle';
import type { Vehicle } from '@/domain/vehicle';

import { DrizzleVehicleRepository } from '../drizzle-vehicle.repository';

function vehicle(id: string, overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id,
    name: `Vehicle ${id}`,
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
    createdAt: '2026-10-28T10:00:00.000Z',
    updatedAt: '2026-10-28T10:00:00.000Z',
    ...overrides,
  };
}

describe('DrizzleVehicleRepository', () => {
  it('stores and reads back every field, including booleans and nulls', async () => {
    const repo = new DrizzleVehicleRepository(createTestDatabase().db);
    const activa = vehicle('a', {
      name: 'My Activa',
      type: 'scooter',
      make: 'Honda',
      model: 'Activa 6G',
      year: 2023,
      plate: 'KA01AB1234',
      initialOdometerM: 12_345_000,
      tankCapacityBase: 5300,
    });

    await repo.insert(activa);

    expect(await repo.getById('a')).toEqual(activa);
    expect(await repo.getById('missing')).toBeNull();
  });

  it('lists by sort order then creation time, hiding archived unless asked', async () => {
    const repo = new DrizzleVehicleRepository(createTestDatabase().db);
    await repo.insert(vehicle('late', { sortOrder: 1, createdAt: '2026-10-28T12:00:00.000Z' }));
    await repo.insert(vehicle('first', { sortOrder: 0 }));
    await repo.insert(vehicle('early', { sortOrder: 1, createdAt: '2026-10-28T11:00:00.000Z' }));
    await repo.insert(vehicle('old', { sortOrder: 2, isArchived: true }));

    expect((await repo.list()).map((v) => v.id)).toEqual(['first', 'early', 'late']);
    expect((await repo.list({ includeArchived: true })).map((v) => v.id)).toEqual([
      'first',
      'early',
      'late',
      'old',
    ]);
    expect(await repo.count()).toBe(4);
  });

  it('rejects a duplicate id', async () => {
    const repo = new DrizzleVehicleRepository(createTestDatabase().db);
    await repo.insert(vehicle('a'));
    await expect(repo.insert(vehicle('a'))).rejects.toThrow();
  });

  it('updates every field of an existing row', async () => {
    const repo = new DrizzleVehicleRepository(createTestDatabase().db);
    await repo.insert(vehicle('a'));
    const edited = vehicle('a', {
      name: 'Renamed',
      plate: 'MH12AB0001',
      tankCapacityBase: 37_000,
      isArchived: true,
      updatedAt: '2026-10-29T10:00:00.000Z',
    });

    await repo.update(edited);

    expect(await repo.getById('a')).toEqual(edited);
  });

  it('delete removes the vehicle and its fill-ups (cascade), nothing else', async () => {
    const { db, sqlite } = createTestDatabase();
    const repo = new DrizzleVehicleRepository(db);
    await repo.insert(vehicle('a'));
    await repo.insert(vehicle('b'));
    const fill = sqlite.prepare(
      `insert into fill_ups (id, vehicle_id, filled_at, local_date, odometer_m, quantity_base,
        total_minor, currency, entry_mode, created_at, updated_at)
       values (?, ?, '2026-10-28T10:00:00.000Z', '2026-10-28', 1000, 5000, 50000, 'INR',
        'qty_total', '2026-10-28T10:00:00.000Z', '2026-10-28T10:00:00.000Z')`,
    );
    fill.run('f1', 'a');
    fill.run('f2', 'b');

    await repo.delete('a');

    expect(await repo.getById('a')).toBeNull();
    expect(await repo.getById('b')).not.toBeNull();
    const left = sqlite.prepare('select id from fill_ups').all() as { id: string }[];
    expect(left.map((r) => r.id)).toEqual(['f2']);
  });
});

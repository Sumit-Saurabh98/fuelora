import { FixedClock } from '@/domain/clock';
import { AppError } from '@/domain/errors';
import type { IdGenerator } from '@/domain/id-generator';
import type { NewVehicleInput } from '@/domain/vehicle';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { InMemoryVehicleRepository } from '@/repositories/in-memory-vehicle.repository';

import { SettingsService } from '../settings.service';
import { VehicleService } from '../vehicle.service';

const NOW = new Date('2026-10-28T10:00:00.000Z');

function setup() {
  let n = 0;
  const ids: IdGenerator = { next: () => `v${++n}` };
  const clock = new FixedClock(NOW);
  const vehicles = new InMemoryVehicleRepository();
  const settings = new SettingsService(new InMemorySettingsRepository(), clock);
  return { vehicles, settings, service: new VehicleService(vehicles, settings, clock, ids) };
}

const activa: NewVehicleInput = {
  name: ' My Activa ',
  type: 'scooter',
  fuelType: 'petrol',
  initialOdometerM: 12_345_000,
};
const swift: NewVehicleInput = {
  name: 'Swift',
  type: 'car',
  fuelType: 'petrol',
  initialOdometerM: 0,
};

describe('VehicleService', () => {
  it('creates a normalized vehicle with id, timestamps and order', async () => {
    const { service } = setup();
    const vehicle = await service.create(activa);
    expect(vehicle).toEqual({
      id: 'v1',
      name: 'My Activa',
      type: 'scooter',
      fuelType: 'petrol',
      make: null,
      model: null,
      year: null,
      plate: null,
      initialOdometerM: 12_345_000,
      tankCapacityBase: null,
      isArchived: false,
      sortOrder: 0,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
    expect(await service.list()).toEqual([vehicle]);
  });

  it('makes the first vehicle current; later ones do not take over (FR-4)', async () => {
    const { service, settings } = setup();
    await service.create(activa);
    const second = await service.create(swift);

    expect(second.sortOrder).toBe(1);
    expect(await settings.getCurrentVehicleId()).toBe('v1');
    expect((await service.getCurrent())?.id).toBe('v1');
  });

  it('switches the current vehicle', async () => {
    const { service } = setup();
    await service.create(activa);
    await service.create(swift);

    await service.setCurrent('v2');

    expect((await service.getCurrent())?.name).toBe('Swift');
  });

  it('refuses to switch to a missing or archived vehicle', async () => {
    const { service, vehicles } = setup();
    await service.create(activa);
    await vehicles.insert({ ...(await vehicles.getById('v1'))!, id: 'old', isArchived: true });

    await expect(service.setCurrent('nope')).rejects.toMatchObject({ code: 'VEHICLE_NOT_FOUND' });
    await expect(service.setCurrent('old')).rejects.toMatchObject({ code: 'VEHICLE_NOT_FOUND' });
  });

  it('falls back to the first active vehicle when the saved one is gone', async () => {
    const { service, settings } = setup();
    await service.create(activa);
    await settings.setCurrentVehicleId('deleted-id');

    expect((await service.getCurrent())?.id).toBe('v1');
  });

  it('a new vehicle becomes current if the saved current one is gone', async () => {
    const { service, settings } = setup();
    await settings.setCurrentVehicleId('deleted-id');
    await service.create(activa);
    expect(await settings.getCurrentVehicleId()).toBe('v1');
  });

  it('has no current vehicle before any are added', async () => {
    const { service } = setup();
    expect(await service.getCurrent()).toBeNull();
    expect(await service.count()).toBe(0);
  });

  it('rejects invalid input with field issues and saves nothing', async () => {
    const { service, vehicles } = setup();
    const attempt = service.create({ ...activa, name: '', initialOdometerM: -5 });

    await expect(attempt).rejects.toBeInstanceOf(AppError);
    await expect(attempt).rejects.toMatchObject({
      code: 'INVALID_VEHICLE',
      details: { issues: { name: 'required', initialOdometerM: 'out_of_range' } },
    });
    expect(vehicles.rows.size).toBe(0);
  });

  it('never puts user text into error details (AGENTS.md rule 2)', async () => {
    const { service } = setup();
    const error: unknown = await service
      .create({ ...activa, plate: 'SECRET-PLATE-123456789' })
      .catch((e: unknown) => e);
    expect(JSON.stringify((error as AppError).details)).not.toContain('SECRET');
  });
});

import { FixedClock } from '@/domain/clock';
import type { IdGenerator } from '@/domain/id-generator';
import type { NewServiceInput } from '@/domain/service-entry';
import { InMemoryServiceLogRepository } from '@/repositories/in-memory-service-log.repository';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { InMemoryVehicleRepository } from '@/repositories/in-memory-vehicle.repository';

import { ServiceLogService } from '../service-log.service';
import { SettingsService } from '../settings.service';
import { VehicleService } from '../vehicle.service';

const NOW = new Date('2026-10-28T10:00:00.000Z');

async function setup() {
  let n = 0;
  const ids: IdGenerator = { next: () => `id${++n}` };
  const clock = new FixedClock(NOW);
  const settings = new SettingsService(new InMemorySettingsRepository(), clock);
  const vehicles = new VehicleService(new InMemoryVehicleRepository(), settings, clock, ids);
  const repo = new InMemoryServiceLogRepository();
  const service = new ServiceLogService(repo, vehicles, clock, ids);
  const activa = await vehicles.create({
    name: 'My Activa',
    type: 'scooter',
    fuelType: 'petrol',
    initialOdometerM: 12_000_000,
  });
  return { service, vehicles, repo, activa };
}

const entry = (vehicleId: string, change: Partial<NewServiceInput> = {}): NewServiceInput => ({
  vehicleId,
  servicedDate: '2026-10-20',
  typeKey: 'general_service',
  odometerM: 12_500_000,
  costMinor: 85_000,
  currency: 'INR',
  ...change,
});

describe('ServiceLogService', () => {
  it('stores a service with timestamps', async () => {
    const { service, activa } = await setup();
    const saved = await service.add(entry(activa.id, { note: ' Oil + filter ' }));
    expect(saved).toEqual({
      id: 'id2',
      vehicleId: activa.id,
      servicedDate: '2026-10-20',
      odometerM: 12_500_000,
      typeKey: 'general_service',
      title: null,
      costMinor: 85_000,
      currency: 'INR',
      note: 'Oil + filter',
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });

  it('lists newest first', async () => {
    const { service, activa } = await setup();
    await service.add(entry(activa.id, { servicedDate: '2026-08-01' }));
    await service.add(entry(activa.id, { servicedDate: '2026-10-01', typeKey: 'engine_oil' }));
    expect((await service.listByVehicle(activa.id)).map((s) => s.servicedDate)).toEqual([
      '2026-10-01',
      '2026-08-01',
    ]);
  });

  it('rejects invalid input, future dates and readings below the vehicle start', async () => {
    const { service, repo, activa } = await setup();
    await expect(
      service.add(entry(activa.id, { servicedDate: '2026-10-29' })),
    ).rejects.toMatchObject({
      code: 'INVALID_SERVICE',
      details: { issues: { servicedDate: 'in_future' } },
    });
    await expect(service.add(entry(activa.id, { odometerM: 11_000_000 }))).rejects.toMatchObject({
      code: 'ODOMETER_BELOW_START',
    });
    expect(repo.rows.size).toBe(0);
  });

  it('refuses archived vehicles', async () => {
    const { service, vehicles, activa } = await setup();
    await vehicles.archive(activa.id);
    await expect(service.add(entry(activa.id))).rejects.toMatchObject({
      code: 'VEHICLE_NOT_FOUND',
    });
  });

  it('updates and deletes', async () => {
    const { service, activa } = await setup();
    const saved = await service.add(entry(activa.id));
    const edited = await service.update(saved.id, {
      ...entry(activa.id),
      typeKey: 'custom',
      title: 'Horn',
      costMinor: null,
    });
    expect(edited).toMatchObject({
      typeKey: 'custom',
      title: 'Horn',
      costMinor: null,
      currency: null,
    });
    expect(edited.createdAt).toBe(saved.createdAt);

    await service.delete(saved.id);
    expect(await service.get(saved.id)).toBeNull();
    await expect(service.delete(saved.id)).rejects.toMatchObject({ code: 'SERVICE_NOT_FOUND' });
  });
});

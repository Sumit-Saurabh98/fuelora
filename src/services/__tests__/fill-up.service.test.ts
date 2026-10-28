import { FixedClock } from '@/domain/clock';
import type { NewFillUpInput } from '@/domain/fill-up';
import type { IdGenerator } from '@/domain/id-generator';
import { InMemoryFillUpRepository } from '@/repositories/in-memory-fill-up.repository';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { InMemoryVehicleRepository } from '@/repositories/in-memory-vehicle.repository';

import { FillUpService } from '../fill-up.service';
import { SettingsService } from '../settings.service';
import { VehicleService } from '../vehicle.service';

const NOW = new Date('2026-10-28T10:00:00.000Z');

async function setup() {
  let n = 0;
  const ids: IdGenerator = { next: () => `id${++n}` };
  const clock = new FixedClock(NOW);
  const settings = new SettingsService(new InMemorySettingsRepository(), clock);
  const repo = new InMemoryFillUpRepository();
  const vehicles: VehicleService = new VehicleService(
    new InMemoryVehicleRepository(),
    settings,
    clock,
    ids,
    { firstOdometerM: (id) => service.firstOdometerM(id) },
  );
  const service: FillUpService = new FillUpService(repo, vehicles, clock, ids);
  const activa = await vehicles.create({
    name: 'My Activa',
    type: 'scooter',
    fuelType: 'petrol',
    initialOdometerM: 12_000_000,
  });
  return { service, vehicles, repo, activa };
}

const fill = (vehicleId: string, change: Partial<NewFillUpInput> = {}): NewFillUpInput => ({
  vehicleId,
  filledAt: new Date('2026-10-20T09:00:00.000Z'),
  odometerM: 12_300_000,
  quantityBase: 5000,
  totalMinor: 52_250,
  currency: 'INR',
  isFull: true,
  missedPrevious: false,
  entryMode: 'qty_total',
  ...change,
});

describe('FillUpService', () => {
  it('stores a fill-up with UTC instant, local date and timestamps', async () => {
    const { service, activa } = await setup();
    const saved = await service.add(fill(activa.id, { station: ' HP ' }));
    expect(saved).toEqual({
      id: 'id2',
      vehicleId: activa.id,
      filledAt: '2026-10-20T09:00:00.000Z',
      localDate: expect.stringMatching(/^2026-10-2[01]$/),
      odometerM: 12_300_000,
      quantityBase: 5000,
      totalMinor: 52_250,
      currency: 'INR',
      isFull: true,
      missedPrevious: false,
      entryMode: 'qty_total',
      station: 'HP',
      note: null,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
    expect(await service.listByVehicle(activa.id)).toEqual([saved]);
  });

  it('rejects invalid fields with issues and saves nothing', async () => {
    const { service, repo, activa } = await setup();
    await expect(service.add(fill(activa.id, { quantityBase: 0 }))).rejects.toMatchObject({
      code: 'INVALID_FILL_UP',
      details: { issues: { quantityBase: 'out_of_range' } },
    });
    expect(repo.rows.size).toBe(0);
  });

  it('rejects an odometer out of order without putting readings in the error (rule 2)', async () => {
    const { service, activa } = await setup();
    await service.add(fill(activa.id));
    const error: unknown = await service
      .add(
        fill(activa.id, { filledAt: new Date('2026-10-25T09:00:00.000Z'), odometerM: 12_200_000 }),
      )
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'ODOMETER_NOT_INCREASING' });
    expect(JSON.stringify(error)).not.toContain('12300000');
  });

  it('rejects a reading below the vehicle start and a duplicate odometer', async () => {
    const { service, activa } = await setup();
    await expect(service.add(fill(activa.id, { odometerM: 11_000_000 }))).rejects.toMatchObject({
      code: 'ODOMETER_BELOW_START',
    });
    await service.add(fill(activa.id));
    await expect(
      service.add(fill(activa.id, { filledAt: new Date('2026-10-25T09:00:00.000Z') })),
    ).rejects.toMatchObject({ code: 'DUPLICATE_ODOMETER' });
  });

  it('explains the reading to beat for the form', async () => {
    const { service, activa } = await setup();
    await service.add(fill(activa.id));
    expect(
      await service.odometerProblem(
        activa.id,
        { filledAt: new Date('2026-10-25T09:00:00.000Z'), odometerM: 12_100_000 },
        null,
      ),
    ).toEqual({ code: 'ODOMETER_NOT_INCREASING', limitM: 12_300_000 });
  });

  it('refuses fill-ups on missing or archived vehicles', async () => {
    const { service, vehicles, activa } = await setup();
    await expect(service.add(fill('nope'))).rejects.toMatchObject({ code: 'VEHICLE_NOT_FOUND' });
    await vehicles.archive(activa.id);
    await expect(service.add(fill(activa.id))).rejects.toMatchObject({
      code: 'VEHICLE_NOT_FOUND',
    });
  });

  it('updates a fill-up; its own old odometer does not block the edit (FR-11)', async () => {
    const { service, activa } = await setup();
    const first = await service.add(fill(activa.id));
    await service.add(
      fill(activa.id, { filledAt: new Date('2026-10-26T09:00:00.000Z'), odometerM: 12_600_000 }),
    );

    const edited = await service.update(first.id, {
      ...fill(activa.id),
      odometerM: 12_350_000,
      isFull: false,
    });

    expect(edited).toMatchObject({ id: first.id, odometerM: 12_350_000, isFull: false });
    expect(edited.createdAt).toBe(first.createdAt);
    await expect(
      service.update(first.id, { ...fill(activa.id), odometerM: 12_700_000 }),
    ).rejects.toMatchObject({ code: 'ODOMETER_AFTER_NEXT' });
  });

  it('deletes a fill-up', async () => {
    const { service, activa } = await setup();
    const saved = await service.add(fill(activa.id));
    await service.delete(saved.id);
    expect(await service.get(saved.id)).toBeNull();
    await expect(service.delete(saved.id)).rejects.toMatchObject({ code: 'FILL_UP_NOT_FOUND' });
  });

  it('latest is the newest by date, not the highest odometer', async () => {
    const { service, activa } = await setup();
    await service.add(
      fill(activa.id, { filledAt: new Date('2026-10-26T09:00:00.000Z'), odometerM: 12_600_000 }),
    );
    const backDated = await service.add(
      fill(activa.id, { filledAt: new Date('2026-10-10T09:00:00.000Z'), odometerM: 12_100_000 }),
    );
    expect((await service.latest(activa.id))?.odometerM).toBe(12_600_000);
    expect(await service.firstOdometerM(activa.id)).toBe(backDated.odometerM);
  });

  describe('vehicle edits once fill-ups exist (KB #24)', () => {
    const edit = (change: object) => ({
      name: 'My Activa',
      type: 'scooter' as const,
      fuelType: 'petrol' as const,
      initialOdometerM: 12_000_000,
      ...change,
    });

    it('blocks changing to electric and a start above the first fill-up', async () => {
      const { service, vehicles, activa } = await setup();
      await service.add(fill(activa.id));

      await expect(
        vehicles.update(activa.id, edit({ fuelType: 'electric', initialOdometerM: 12_500_000 })),
      ).rejects.toMatchObject({
        code: 'INVALID_VEHICLE',
        details: { issues: { fuelType: 'fuel_locked', initialOdometerM: 'above_first_fill_up' } },
      });
    });

    it('allows petrol → diesel and a lower start', async () => {
      const { service, vehicles, activa } = await setup();
      await service.add(fill(activa.id));
      const edited = await vehicles.update(
        activa.id,
        edit({ fuelType: 'diesel', initialOdometerM: 11_000_000 }),
      );
      expect(edited).toMatchObject({ fuelType: 'diesel', initialOdometerM: 11_000_000 });
    });

    it('allows any change while there are no fill-ups', async () => {
      const { vehicles, activa } = await setup();
      const edited = await vehicles.update(activa.id, edit({ fuelType: 'electric' }));
      expect(edited.fuelType).toBe('electric');
    });
  });

  describe('warnings (FR-8, LLD §4.2)', () => {
    it('none for a believable scooter tank (45 km/L)', async () => {
      const { service, activa } = await setup();
      await service.add(fill(activa.id));
      expect(
        await service.warnings(
          fill(activa.id, {
            filledAt: new Date('2026-10-26T09:00:00.000Z'),
            odometerM: 12_525_000, // 225 km on 5 L
          }),
          null,
        ),
      ).toEqual([]);
    });

    it('too high when the odometer looks mistyped (scooter, 2,000 km on 5 L)', async () => {
      const { service, activa } = await setup();
      await service.add(fill(activa.id));
      expect(
        await service.warnings(
          fill(activa.id, {
            filledAt: new Date('2026-10-26T09:00:00.000Z'),
            odometerM: 14_300_000,
          }),
          null,
        ),
      ).toEqual([{ kind: 'efficiency', level: 'too_high' }]);
    });

    it('too low (scooter, 20 km on 5 L)', async () => {
      const { service, activa } = await setup();
      await service.add(fill(activa.id));
      expect(
        await service.warnings(
          fill(activa.id, {
            filledAt: new Date('2026-10-26T09:00:00.000Z'),
            odometerM: 12_320_000,
          }),
          null,
        ),
      ).toEqual([{ kind: 'efficiency', level: 'too_low' }]);
    });

    it('nothing to judge for the first entry or a partial', async () => {
      const { service, activa } = await setup();
      expect(await service.warnings(fill(activa.id), null)).toEqual([]);
      await service.add(fill(activa.id));
      expect(
        await service.warnings(
          fill(activa.id, {
            filledAt: new Date('2026-10-26T09:00:00.000Z'),
            odometerM: 14_300_000,
            isFull: false,
          }),
          null,
        ),
      ).toEqual([]);
    });

    it('more than 110% of the tank', async () => {
      const { service, vehicles, activa } = await setup();
      await vehicles.update(activa.id, {
        name: 'My Activa',
        type: 'scooter',
        fuelType: 'petrol',
        initialOdometerM: 12_000_000,
        tankCapacityBase: 5300,
      });
      expect(await service.warnings(fill(activa.id, { quantityBase: 5900 }), null)).toEqual([
        { kind: 'tank' },
      ]);
      expect(await service.warnings(fill(activa.id, { quantityBase: 5800 }), null)).toEqual([]);
    });

    it('an edit is judged without its own old values', async () => {
      const { service, activa } = await setup();
      await service.add(fill(activa.id));
      const second = await service.add(
        fill(activa.id, { filledAt: new Date('2026-10-26T09:00:00.000Z'), odometerM: 14_300_000 }),
      );
      expect(
        await service.warnings(
          fill(activa.id, {
            filledAt: new Date('2026-10-26T09:00:00.000Z'),
            odometerM: 12_525_000,
          }),
          second.id,
        ),
      ).toEqual([]);
    });
  });
});

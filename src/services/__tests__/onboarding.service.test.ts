import { FixedClock } from '@/domain/clock';
import type { IdGenerator } from '@/domain/id-generator';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { InMemoryVehicleRepository } from '@/repositories/in-memory-vehicle.repository';

import { OnboardingService } from '../onboarding.service';
import { SettingsService } from '../settings.service';
import { VehicleService } from '../vehicle.service';

function setup() {
  const clock = new FixedClock(new Date('2026-10-28T10:00:00.000Z'));
  const ids: IdGenerator = { next: () => 'v1' };
  const settings = new SettingsService(new InMemorySettingsRepository(), clock);
  const vehicles = new VehicleService(new InMemoryVehicleRepository(), settings, clock, ids);
  return { settings, vehicles, onboarding: new OnboardingService(settings, vehicles) };
}

describe('OnboardingService (KB #21)', () => {
  it('is not complete on a fresh install', async () => {
    expect(await setup().onboarding.isComplete()).toBe(false);
  });

  it('is complete once marked (e.g. after "Skip for now")', async () => {
    const { onboarding, settings } = setup();
    await onboarding.complete();
    expect(await settings.isOnboardingDone()).toBe(true);
    expect(await onboarding.isComplete()).toBe(true);
  });

  it('is complete when a vehicle exists even without the flag (interrupted save, restore)', async () => {
    const { onboarding, vehicles } = setup();
    await vehicles.create({
      name: 'Activa',
      type: 'scooter',
      fuelType: 'petrol',
      initialOdometerM: 0,
    });
    expect(await onboarding.isComplete()).toBe(true);
  });
});

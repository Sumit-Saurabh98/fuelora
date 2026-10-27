import type { SettingsService } from './settings.service';
import type { VehicleService } from './vehicle.service';

/**
 * Onboarding is done when its flag is set OR any vehicle exists (KB #21), so an interrupted
 * save or a restored backup without the flag never sends a user back through onboarding.
 */
export class OnboardingService {
  constructor(
    private readonly settings: SettingsService,
    private readonly vehicles: VehicleService,
  ) {}

  async isComplete(): Promise<boolean> {
    if (await this.settings.isOnboardingDone()) return true;
    return (await this.vehicles.count()) > 0;
  }

  complete(): Promise<void> {
    return this.settings.markOnboardingDone();
  }
}

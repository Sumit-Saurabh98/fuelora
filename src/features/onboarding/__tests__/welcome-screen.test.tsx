import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FixedClock } from '@/domain/clock';
import type { IdGenerator } from '@/domain/id-generator';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { InMemoryVehicleRepository } from '@/repositories/in-memory-vehicle.repository';
import { OnboardingService } from '@/services/onboarding.service';
import { SettingsService } from '@/services/settings.service';
import { VehicleService } from '@/services/vehicle.service';

import { preferenceWritesSettled, usePreferences } from '../../settings/preferences.store';
import { WelcomeScreen } from '../components/welcome-screen';
import { hydrateOnboarding, useOnboarding } from '../onboarding.store';

const clock = new FixedClock(new Date('2026-10-28T10:00:00.000Z'));
const ids: IdGenerator = { next: () => 'v1' };
const mockSettings = new SettingsService(new InMemorySettingsRepository(), clock);
const mockVehicles = new VehicleService(new InMemoryVehicleRepository(), mockSettings, clock, ids);
const mockOnboarding = new OnboardingService(mockSettings, mockVehicles);
jest.mock('@/container', () => ({
  getContainer: () => ({
    settingsService: mockSettings,
    vehicleService: mockVehicles,
    onboardingService: mockOnboarding,
  }),
}));

function renderWelcome() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 360, height: 640 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <PaperProvider>
        <WelcomeScreen />
      </PaperProvider>
    </SafeAreaProvider>,
  );
}

describe('WelcomeScreen', () => {
  beforeEach(async () => {
    usePreferences.getState().setLanguage('en');
    await preferenceWritesSettled();
    await hydrateOnboarding(mockOnboarding);
  });

  it('starts not onboarded on a fresh install', () => {
    expect(useOnboarding.getState().onboarded).toBe(false);
  });

  it('promises no login and local data (KB §3)', async () => {
    await renderWelcome();
    expect(screen.getByText('No login. Your data stays on this phone.')).toBeTruthy();
    expect(screen.getByText('Real mileage, fuel cost and service reminders.')).toBeTruthy();
  });

  it('switches the whole screen to Hindi and saves the choice', async () => {
    await renderWelcome();

    await fireEvent.press(screen.getByText('हिन्दी'));
    await preferenceWritesSettled();

    expect(screen.getByText('कोई लॉगिन नहीं। आपका डेटा इसी फ़ोन पर रहता है।')).toBeTruthy();
    expect(screen.getByText('आगे बढ़ें')).toBeTruthy();
    expect((await mockSettings.getPreferences()).language).toBe('hi');
  });

  it('Continue saves the onboarding flag before switching to the app', async () => {
    await renderWelcome();

    await fireEvent.press(screen.getByText('Continue'));

    expect(await mockSettings.isOnboardingDone()).toBe(true);
    expect(useOnboarding.getState().onboarded).toBe(true);
  });
});

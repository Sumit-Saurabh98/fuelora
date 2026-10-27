import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

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
import { renderScreen } from '@/testing/render-screen';

const clock = new FixedClock(new Date('2026-10-28T10:00:00.000Z'));
const ids: IdGenerator = { next: () => 'v1' };
const mockSettings = new SettingsService(new InMemorySettingsRepository(), clock);
const mockVehicles = new VehicleService(new InMemoryVehicleRepository(), mockSettings, clock, ids);
const mockOnboarding = new OnboardingService(mockSettings, mockVehicles);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/container', () => ({
  getContainer: () => ({
    settingsService: mockSettings,
    vehicleService: mockVehicles,
    onboardingService: mockOnboarding,
  }),
}));

const renderWelcome = () => renderScreen(<WelcomeScreen />);

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

  it('shows step 1 of 3 with no back arrow (nothing to go back to)', async () => {
    await renderWelcome();
    expect(screen.getByLabelText('Step 1 of 3')).toBeTruthy();
    expect(screen.queryByLabelText('Back')).toBeNull();
  });

  it('Continue goes to the region step without finishing onboarding', async () => {
    await renderWelcome();

    await fireEvent.press(screen.getByText('Continue'));

    expect(router.push).toHaveBeenCalledWith('/onboarding/region');
    expect(useOnboarding.getState().onboarded).toBe(false);
    expect(await mockSettings.isOnboardingDone()).toBe(false);
  });
});

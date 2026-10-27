import { fireEvent, screen } from '@testing-library/react-native';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';

import { FixedClock } from '@/domain/clock';
import type { IdGenerator } from '@/domain/id-generator';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { InMemoryVehicleRepository } from '@/repositories/in-memory-vehicle.repository';
import { OnboardingService } from '@/services/onboarding.service';
import { SettingsService } from '@/services/settings.service';
import { VehicleService } from '@/services/vehicle.service';

import { preferenceWritesSettled, usePreferences } from '../../settings/preferences.store';
import { RegionStep } from '../components/region-step';
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

// Some locales use non-breaking spaces in currency output; match on plain spaces.
const normalizer = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

describe('RegionStep', () => {
  beforeEach(async () => {
    jest.spyOn(Localization, 'getLocales').mockReturnValue([
      {
        languageTag: 'en-IN',
        languageCode: 'en',
        regionCode: 'IN',
        currencyCode: 'INR',
      } as unknown as Localization.Locale,
    ]);
    // A fresh install: region comes from the phone (India).
    usePreferences.setState({ region: 'IN', language: 'en', unitOverrides: {} });
    await hydrateOnboarding(mockOnboarding);
  });

  afterEach(() => jest.restoreAllMocks());

  it('shows step 2 with the phone region pre-selected and its units', async () => {
    await renderScreen(<RegionStep />);
    expect(screen.getByLabelText('Step 2 of 3')).toBeTruthy();
    expect(screen.getByText('Where do you drive?')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'India' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByText('km/L')).toBeTruthy();
    expect(screen.getByText('PUC')).toBeTruthy();
    expect(screen.getByText('100 km · 10 L · ₹1,00,000.00', { normalizer })).toBeTruthy();
  });

  it('changing region updates the preview and saves it', async () => {
    await renderScreen(<RegionStep />);

    await fireEvent.press(screen.getByText('United Kingdom'));
    await preferenceWritesSettled();

    expect(screen.getByText('mpg (UK)')).toBeTruthy();
    expect(screen.getByText('MOT')).toBeTruthy();
    expect(screen.getByText('62.1 mi · 10 L · £100,000.00', { normalizer })).toBeTruthy();
    expect((await mockSettings.getPreferences()).region).toBe('GB');
  });

  it('the back arrow returns to the welcome step', async () => {
    await renderScreen(<RegionStep />);
    await fireEvent.press(screen.getByLabelText('Back'));
    expect(router.back).toHaveBeenCalled();
  });

  it('Continue goes to the vehicle step without finishing onboarding', async () => {
    await renderScreen(<RegionStep />);

    await fireEvent.press(screen.getByText('Continue'));

    expect(router.push).toHaveBeenCalledWith('/onboarding/vehicle');
    expect(useOnboarding.getState().onboarded).toBe(false);
  });

  it('works in Hindi', async () => {
    usePreferences.getState().setLanguage('hi');
    await renderScreen(<RegionStep />);
    expect(screen.getByText('आप कहाँ गाड़ी चलाते हैं?')).toBeTruthy();
    expect(screen.getByText('भारत')).toBeTruthy();
    usePreferences.getState().setLanguage('en');
    await preferenceWritesSettled();
  });
});

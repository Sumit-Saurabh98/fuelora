import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';

import { FixedClock } from '@/domain/clock';
import type { IdGenerator } from '@/domain/id-generator';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { InMemoryVehicleRepository } from '@/repositories/in-memory-vehicle.repository';
import { OnboardingService } from '@/services/onboarding.service';
import { SettingsService } from '@/services/settings.service';
import { VehicleService } from '@/services/vehicle.service';
import { renderScreen } from '@/testing/render-screen';

import { usePreferences } from '../../settings/preferences.store';
import { VehicleStep } from '../components/vehicle-step';
import { useOnboarding } from '../onboarding.store';

const mockClock = new FixedClock(new Date('2026-10-28T10:00:00.000Z'));
const mockRepo = new InMemoryVehicleRepository();
const mockSettings = new SettingsService(new InMemorySettingsRepository(), mockClock);
let n = 0;
const ids: IdGenerator = { next: () => `v${++n}` };
const mockVehicles = new VehicleService(mockRepo, mockSettings, mockClock, ids);
const mockOnboarding = new OnboardingService(mockSettings, mockVehicles);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/container', () => ({
  getContainer: () => ({
    clock: mockClock,
    settingsService: mockSettings,
    vehicleService: mockVehicles,
    onboardingService: mockOnboarding,
  }),
}));

const odometerField = () => screen.getByLabelText('Current odometer');

describe('VehicleStep', () => {
  beforeEach(() => {
    jest.spyOn(Localization, 'getLocales').mockReturnValue([
      {
        languageTag: 'en-IN',
        regionCode: 'IN',
        currencyCode: 'INR',
      } as unknown as Localization.Locale,
    ]);
    mockRepo.rows.clear();
    usePreferences.setState({ region: 'IN', language: 'en', unitOverrides: {} });
    useOnboarding.setState({ onboarded: false });
  });

  afterEach(() => jest.restoreAllMocks());

  it('is step 3 of 3 with essentials and a suggested name that follows the type', async () => {
    await renderScreen(<VehicleStep />);
    expect(screen.getByLabelText('Step 3 of 3')).toBeTruthy();
    expect(screen.getByLabelText('Name').props.value).toBe('My scooter');

    await fireEvent.press(screen.getByLabelText('Car'));

    expect(screen.getByLabelText('Name').props.value).toBe('My car');
  });

  it('keeps a name the user typed when the type changes', async () => {
    await renderScreen(<VehicleStep />);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Activa 6G');
    await fireEvent.press(screen.getByLabelText('Bike'));
    expect(screen.getByLabelText('Name').props.value).toBe('Activa 6G');
  });

  it('saves the vehicle in metres, makes it current and finishes onboarding', async () => {
    await renderScreen(<VehicleStep />);
    await fireEvent.changeText(odometerField(), '12,345');

    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(useOnboarding.getState().onboarded).toBe(true));
    const [vehicle] = await mockVehicles.list();
    expect(vehicle).toMatchObject({
      name: 'My scooter',
      type: 'scooter',
      fuelType: 'petrol',
      initialOdometerM: 12_345_000,
    });
    expect((await mockVehicles.getCurrent())?.id).toBe(vehicle!.id);
    expect(await mockSettings.isOnboardingDone()).toBe(true);
  });

  it('shows field errors and saves nothing when input is wrong', async () => {
    await renderScreen(<VehicleStep />);
    await fireEvent.changeText(screen.getByLabelText('Name'), ' ');

    await fireEvent.press(screen.getByText('Save'));

    // Both name and odometer are reported at once.
    expect(await screen.findAllByText('Required')).toHaveLength(2);
    await fireEvent.changeText(odometerField(), 'abc');
    expect(await screen.findByText('Enter a number')).toBeTruthy();
    expect(mockRepo.rows.size).toBe(0);
    expect(useOnboarding.getState().onboarded).toBe(false);
  });

  it('saves optional details: uppercase plate and tank size in litres', async () => {
    await renderScreen(<VehicleStep />);
    await fireEvent.changeText(odometerField(), '0');
    await fireEvent.press(screen.getByText('More details (optional)'));
    await fireEvent.changeText(screen.getByLabelText('Number plate'), 'ka01ab1234');
    await fireEvent.changeText(screen.getByLabelText('Tank size'), '5.3');
    await fireEvent.changeText(screen.getByLabelText('Year'), '2023');

    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(mockRepo.rows.size).toBe(1));
    expect((await mockVehicles.list())[0]).toMatchObject({
      plate: 'KA01AB1234',
      tankCapacityBase: 5300,
      year: 2023,
      initialOdometerM: 0,
    });
  });

  it('uses miles and the US fuel name for US users', async () => {
    usePreferences.setState({ region: 'US' });
    await renderScreen(<VehicleStep />);
    expect(screen.getByText('Gas / Gasoline')).toBeTruthy();
    await fireEvent.changeText(odometerField(), '1,000');

    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(mockRepo.rows.size).toBe(1));
    expect((await mockVehicles.list())[0]?.initialOdometerM).toBe(1_609_344);
  });

  it('Skip for now finishes onboarding without a vehicle (F-12)', async () => {
    await renderScreen(<VehicleStep />);

    await fireEvent.press(screen.getByText('Skip for now'));

    await waitFor(() => expect(useOnboarding.getState().onboarded).toBe(true));
    expect(mockRepo.rows.size).toBe(0);
  });

  it('the back arrow returns to the region step', async () => {
    await renderScreen(<VehicleStep />);
    await fireEvent.press(screen.getByLabelText('Back'));
    expect(router.back).toHaveBeenCalled();
  });
});

describe('VehicleStep layout', () => {
  it('has one main action, Skip under it, and a back arrow — no row of buttons', async () => {
    usePreferences.setState({ region: 'IN', language: 'en', unitOverrides: {} });
    await renderScreen(<VehicleStep />);
    expect(screen.getByLabelText('Back')).toBeTruthy();
    expect(screen.queryByText('Back')).toBeNull(); // the arrow has no visible text
    expect(screen.getByText('Save')).toBeTruthy();
    expect(screen.getByText('Skip for now')).toBeTruthy();
  });
});

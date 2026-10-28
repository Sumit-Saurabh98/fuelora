import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';

import { FixedClock } from '@/domain/clock';
import type { IdGenerator } from '@/domain/id-generator';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { InMemoryVehicleRepository } from '@/repositories/in-memory-vehicle.repository';
import { SettingsService } from '@/services/settings.service';
import { VehicleService } from '@/services/vehicle.service';
import { renderScreen } from '@/testing/render-screen';

import { usePreferences } from '../../settings/preferences.store';
import { EditVehicleScreen } from '../components/edit-vehicle-screen';
import { useVehicle } from '../hooks/use-vehicle';

const mockClock = new FixedClock(new Date('2026-10-28T10:00:00.000Z'));
const mockRepo = new InMemoryVehicleRepository();
const mockSettings = new SettingsService(new InMemorySettingsRepository(), mockClock);
const ids: IdGenerator = { next: () => 'v1' };
const mockVehicles = new VehicleService(mockRepo, mockSettings, mockClock, ids);
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('@/container', () => ({
  getContainer: () => ({ clock: mockClock, vehicleService: mockVehicles }),
}));
// The live query needs SQLite; read straight from the in-memory repository instead.
jest.mock('../hooks/use-vehicle', () => ({ useVehicle: jest.fn() }));
const mockUseVehicle = jest.mocked(useVehicle);

function setLocale(languageTag: string, regionCode: string, currencyCode: string) {
  jest
    .spyOn(Localization, 'getLocales')
    .mockReturnValue([{ languageTag, regionCode, currencyCode } as unknown as Localization.Locale]);
}

async function saveActiva() {
  mockRepo.rows.clear();
  const vehicle = await mockVehicles.create({
    name: 'My Activa',
    type: 'scooter',
    fuelType: 'petrol',
    initialOdometerM: 12_345_000,
    tankCapacityBase: 5300,
    plate: 'KA01AB1234',
  });
  mockUseVehicle.mockReturnValue(vehicle);
  return vehicle;
}

describe('EditVehicleScreen', () => {
  beforeEach(() => {
    setLocale('en-IN', 'IN', 'INR');
    jest.mocked(router.back).mockClear();
    usePreferences.setState({ region: 'IN', language: 'en', unitOverrides: {} });
  });

  afterEach(() => jest.restoreAllMocks());

  it('starts from the saved values and keeps the name when the type changes', async () => {
    await saveActiva();
    await renderScreen(<EditVehicleScreen id="v1" />);

    expect(screen.getByLabelText('Name').props.value).toBe('My Activa');
    expect(screen.getByLabelText('Current odometer').props.value).toBe('12,345');
    await fireEvent.press(screen.getByLabelText('Bike'));
    expect(screen.getByLabelText('Name').props.value).toBe('My Activa');
  });

  it('saves edits and goes back', async () => {
    await saveActiva();
    await renderScreen(<EditVehicleScreen id="v1" />);
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Activa 6G');
    await fireEvent.changeText(screen.getByLabelText('Current odometer'), '12,400');

    await fireEvent.press(screen.getByText('Save changes'));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(await mockVehicles.get('v1')).toMatchObject({
      name: 'Activa 6G',
      initialOdometerM: 12_400_000,
      plate: 'KA01AB1234',
    });
  });

  it('a US user renaming the vehicle does not shift the stored odometer or tank', async () => {
    setLocale('en-US', 'US', 'USD');
    usePreferences.setState({ region: 'US' });
    await saveActiva();
    await renderScreen(<EditVehicleScreen id="v1" />);
    expect(screen.getByLabelText('Current odometer').props.value).toBe('7,670.8');
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Scooter');

    await fireEvent.press(screen.getByText('Save changes'));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(await mockVehicles.get('v1')).toMatchObject({
      name: 'Scooter',
      initialOdometerM: 12_345_000,
      tankCapacityBase: 5300,
    });
  });

  it('shows field errors and keeps the stored vehicle', async () => {
    const before = await saveActiva();
    await renderScreen(<EditVehicleScreen id="v1" />);
    await fireEvent.changeText(screen.getByLabelText('Name'), '');

    await fireEvent.press(screen.getByText('Save changes'));

    expect(await screen.findByText('Required')).toBeTruthy();
    expect(await mockVehicles.get('v1')).toEqual(before);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('explains when the vehicle no longer exists', async () => {
    mockUseVehicle.mockReturnValue(null);
    await renderScreen(<EditVehicleScreen id="gone" />);
    expect(screen.getByText('Vehicle not found')).toBeTruthy();
  });
});

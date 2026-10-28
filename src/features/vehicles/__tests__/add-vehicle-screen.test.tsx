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
import { AddVehicleScreen } from '../components/add-vehicle-screen';

const mockClock = new FixedClock(new Date('2026-10-28T10:00:00.000Z'));
const mockRepo = new InMemoryVehicleRepository();
const mockSettings = new SettingsService(new InMemorySettingsRepository(), mockClock);
let n = 0;
const ids: IdGenerator = { next: () => `v${++n}` };
const mockVehicles = new VehicleService(mockRepo, mockSettings, mockClock, ids);
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('@/container', () => ({
  getContainer: () => ({
    clock: mockClock,
    settingsService: mockSettings,
    vehicleService: mockVehicles,
  }),
}));

const odometerField = () => screen.getByLabelText('Current odometer');

describe('AddVehicleScreen', () => {
  beforeEach(() => {
    jest.spyOn(Localization, 'getLocales').mockReturnValue([
      {
        languageTag: 'en-IN',
        regionCode: 'IN',
        currencyCode: 'INR',
      } as unknown as Localization.Locale,
    ]);
    mockRepo.rows.clear();
    jest.mocked(router.back).mockClear();
    usePreferences.setState({ region: 'IN', language: 'en', unitOverrides: {} });
  });

  afterEach(() => jest.restoreAllMocks());

  it('saves the vehicle, makes the first one current and goes back to Home', async () => {
    await renderScreen(<AddVehicleScreen />);
    await fireEvent.press(screen.getByLabelText('Bike'));
    await fireEvent.changeText(odometerField(), '8,200');

    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    const [vehicle] = await mockVehicles.list();
    expect(vehicle).toMatchObject({ name: 'My bike', type: 'bike', initialOdometerM: 8_200_000 });
    expect((await mockVehicles.getCurrent())?.id).toBe(vehicle!.id);
  });

  it('shows field errors, saves nothing and stays on the screen', async () => {
    await renderScreen(<AddVehicleScreen />);

    await fireEvent.press(screen.getByText('Save'));

    expect(await screen.findByText('Required')).toBeTruthy();
    expect(mockRepo.rows.size).toBe(0);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('shows a retry message when storing fails', async () => {
    jest.spyOn(mockVehicles, 'create').mockRejectedValueOnce(new Error('disk full'));
    await renderScreen(<AddVehicleScreen />);
    await fireEvent.changeText(odometerField(), '0');

    await fireEvent.press(screen.getByText('Save'));

    expect(await screen.findByText("Couldn't save. Please try again.")).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });
});

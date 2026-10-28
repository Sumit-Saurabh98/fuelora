import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';

import type { Vehicle } from '@/domain/vehicle';
import { renderScreen } from '@/testing/render-screen';

import { usePreferences } from '../../settings/preferences.store';
import { useVehicles, type VehicleLists } from '../../vehicles/hooks/use-vehicles';
import { HomeScreen } from '../components/home-screen';

const mockSetCurrent = jest.fn(async (_id: string) => {});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/container', () => ({
  getContainer: () => ({ vehicleService: { setCurrent: mockSetCurrent } }),
}));
jest.mock('../../vehicles/hooks/use-vehicles', () => ({ useVehicles: jest.fn() }));
const mockVehicles = jest.mocked(useVehicles);

const activa: Vehicle = {
  id: 'v1',
  name: 'My Activa',
  type: 'scooter',
  fuelType: 'petrol',
  make: 'Honda',
  model: 'Activa 6G',
  year: 2023,
  plate: null,
  initialOdometerM: 12_345_000,
  tankCapacityBase: null,
  isArchived: false,
  sortOrder: 0,
  createdAt: '2026-10-28T10:00:00.000Z',
  updatedAt: '2026-10-28T10:00:00.000Z',
};
const swift: Vehicle = {
  ...activa,
  id: 'v2',
  name: 'Swift',
  type: 'car',
  make: null,
  sortOrder: 1,
};

const lists = (change: Partial<VehicleLists> = {}): VehicleLists => ({
  active: [activa],
  archived: [],
  currentId: 'v1',
  ...change,
});

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.spyOn(Localization, 'getLocales').mockReturnValue([
      {
        languageTag: 'en-IN',
        regionCode: 'IN',
        currencyCode: 'INR',
      } as unknown as Localization.Locale,
    ]);
    usePreferences.setState({ region: 'IN', language: 'en', unitOverrides: {} });
    jest.mocked(router.push).mockClear();
    mockSetCurrent.mockClear();
  });

  afterEach(() => jest.restoreAllMocks());

  it('shows the current vehicle with its odometer in the user units', async () => {
    mockVehicles.mockReturnValue(lists());
    await renderScreen(<HomeScreen />);
    expect(screen.getByLabelText('Current vehicle: My Activa')).toBeTruthy();
    expect(screen.getByText('Honda · Activa 6G · 2023')).toBeTruthy();
    expect(screen.getByText('Odometer: 12,345 km')).toBeTruthy();
  });

  it('shows miles for US users', async () => {
    mockVehicles.mockReturnValue(lists());
    usePreferences.setState({ region: 'US' });
    await renderScreen(<HomeScreen />);
    expect(screen.getByText('Odometer: 7,671 mi')).toBeTruthy();
  });

  it('shows the empty state when there is no vehicle (after Skip)', async () => {
    mockVehicles.mockReturnValue(lists({ active: [], currentId: null }));
    await renderScreen(<HomeScreen />);
    expect(screen.getByText('No vehicles yet')).toBeTruthy();
  });

  it('opens the add-vehicle screen from the empty state', async () => {
    mockVehicles.mockReturnValue(lists({ active: [], currentId: null }));
    await renderScreen(<HomeScreen />);
    await fireEvent.press(screen.getByText('Add your first vehicle'));
    expect(router.push).toHaveBeenCalledWith('/vehicles/new');
  });

  it('has no add-first button once a vehicle exists', async () => {
    mockVehicles.mockReturnValue(lists());
    await renderScreen(<HomeScreen />);
    expect(screen.queryByText('Add your first vehicle')).toBeNull();
  });

  it('says vehicles are archived (not "none") when no active one is left', async () => {
    mockVehicles.mockReturnValue(
      lists({ active: [], archived: [{ ...activa, isArchived: true }], currentId: null }),
    );
    await renderScreen(<HomeScreen />);
    expect(screen.getByText('All vehicles are archived')).toBeTruthy();
    expect(screen.queryByText('No vehicles yet')).toBeNull();
    await fireEvent.press(screen.getByText('Manage vehicles'));
    expect(router.push).toHaveBeenCalledWith('/vehicles');
  });

  it('Add fill-up opens the entry for the current vehicle', async () => {
    mockVehicles.mockReturnValue(lists());
    await renderScreen(<HomeScreen />);
    await fireEvent.press(screen.getByText('Add fill-up'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/fill-up/new',
      params: { vehicleId: 'v1' },
    });
  });

  it('EVs get Add charge', async () => {
    mockVehicles.mockReturnValue(lists({ active: [{ ...activa, fuelType: 'electric' }] }));
    await renderScreen(<HomeScreen />);
    expect(screen.getByText('Add charge')).toBeTruthy();
  });

  describe('vehicle switcher', () => {
    it('lists active vehicles and switches the current one', async () => {
      mockVehicles.mockReturnValue(lists({ active: [activa, swift] }));
      await renderScreen(<HomeScreen />);

      await fireEvent.press(screen.getByLabelText('Current vehicle: My Activa'));
      expect(screen.getByText('Your vehicles')).toBeTruthy();
      await fireEvent.press(screen.getByText('Swift'));

      await waitFor(() => expect(mockSetCurrent).toHaveBeenCalledWith('v2'));
    });

    it('choosing the current vehicle again changes nothing', async () => {
      mockVehicles.mockReturnValue(lists({ active: [activa, swift] }));
      await renderScreen(<HomeScreen />);
      await fireEvent.press(screen.getByLabelText('Current vehicle: My Activa'));

      await fireEvent.press(screen.getAllByText('My Activa').at(-1)!);

      expect(mockSetCurrent).not.toHaveBeenCalled();
    });

    it('offers Add vehicle and Manage vehicles', async () => {
      mockVehicles.mockReturnValue(lists());
      await renderScreen(<HomeScreen />);

      await fireEvent.press(screen.getByLabelText('Current vehicle: My Activa'));
      await fireEvent.press(screen.getByText('Add vehicle'));
      expect(router.push).toHaveBeenCalledWith('/vehicles/new');

      await fireEvent.press(screen.getByLabelText('Current vehicle: My Activa'));
      await fireEvent.press(screen.getByText('Manage vehicles'));
      expect(router.push).toHaveBeenCalledWith('/vehicles');
    });
  });
});

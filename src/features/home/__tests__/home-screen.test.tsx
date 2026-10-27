import { screen } from '@testing-library/react-native';
import * as Localization from 'expo-localization';

import type { Vehicle } from '@/domain/vehicle';
import { renderScreen } from '@/testing/render-screen';

import { usePreferences } from '../../settings/preferences.store';
import { useCurrentVehicle } from '../../vehicles/hooks/use-current-vehicle';
import { HomeScreen } from '../components/home-screen';

jest.mock('../../vehicles/hooks/use-current-vehicle', () => ({ useCurrentVehicle: jest.fn() }));
const mockCurrent = jest.mocked(useCurrentVehicle);

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
  });

  afterEach(() => jest.restoreAllMocks());

  it('shows the current vehicle with its odometer in the user units', async () => {
    mockCurrent.mockReturnValue(activa);
    await renderScreen(<HomeScreen />);
    expect(screen.getByText('My Activa')).toBeTruthy();
    expect(screen.getByText('Honda · Activa 6G · 2023')).toBeTruthy();
    expect(screen.getByText('Odometer: 12,345 km')).toBeTruthy();
  });

  it('shows miles for US users', async () => {
    mockCurrent.mockReturnValue(activa);
    usePreferences.setState({ region: 'US' });
    await renderScreen(<HomeScreen />);
    expect(screen.getByText('Odometer: 7,671 mi')).toBeTruthy();
  });

  it('shows the empty state when there is no vehicle (after Skip)', async () => {
    mockCurrent.mockReturnValue(null);
    await renderScreen(<HomeScreen />);
    expect(screen.getByText('No vehicles yet')).toBeTruthy();
  });
});

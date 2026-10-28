import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { Vehicle } from '@/domain/vehicle';
import { renderScreen } from '@/testing/render-screen';

import { usePreferences } from '../../settings/preferences.store';
import { VehiclesScreen } from '../components/vehicles-screen';
import { useVehicles } from '../hooks/use-vehicles';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../hooks/use-vehicles', () => ({ useVehicles: jest.fn() }));
const mockVehicles = jest.mocked(useVehicles);

function vehicle(id: string, overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id,
    name: `Vehicle ${id}`,
    type: 'car',
    fuelType: 'petrol',
    make: null,
    model: null,
    year: null,
    plate: null,
    initialOdometerM: 0,
    tankCapacityBase: null,
    isArchived: false,
    sortOrder: 0,
    createdAt: '2026-10-28T10:00:00.000Z',
    updatedAt: '2026-10-28T10:00:00.000Z',
    ...overrides,
  };
}

describe('VehiclesScreen', () => {
  beforeEach(() => {
    usePreferences.setState({ region: 'IN', language: 'en', unitOverrides: {} });
  });

  it('lists active vehicles with type, fuel and details, marking the current one', async () => {
    mockVehicles.mockReturnValue({
      active: [
        vehicle('a', { name: 'My Activa', type: 'scooter', make: 'Honda', model: 'Activa 6G' }),
        vehicle('b', { name: 'Nexon EV', fuelType: 'electric' }),
      ],
      archived: [],
      currentId: 'a',
    });
    await renderScreen(<VehiclesScreen />);

    expect(screen.getByText('My Activa')).toBeTruthy();
    expect(screen.getByText('Scooter · Petrol\nHonda · Activa 6G')).toBeTruthy();
    expect(screen.getByText('Car · Electric')).toBeTruthy();
    expect(screen.getAllByText('Current')).toHaveLength(1);
    expect(screen.getByLabelText('My Activa, Current')).toBeTruthy();
    expect(screen.queryByText('Archived')).toBeNull();
  });

  it('shows archived vehicles in their own section', async () => {
    mockVehicles.mockReturnValue({
      active: [vehicle('a')],
      archived: [vehicle('old', { name: 'Old Pulsar', type: 'bike', isArchived: true })],
      currentId: 'a',
    });
    await renderScreen(<VehiclesScreen />);
    expect(screen.getByText('Archived')).toBeTruthy();
    expect(screen.getByText('Old Pulsar')).toBeTruthy();
  });

  it('explains when every vehicle is archived', async () => {
    mockVehicles.mockReturnValue({
      active: [],
      archived: [vehicle('old', { isArchived: true })],
      currentId: null,
    });
    await renderScreen(<VehiclesScreen />);
    expect(
      screen.getByText('No active vehicles. Add one, or restore an archived one.'),
    ).toBeTruthy();
  });

  it('uses the region fuel name', async () => {
    usePreferences.setState({ region: 'US' });
    mockVehicles.mockReturnValue({ active: [vehicle('a')], archived: [], currentId: 'a' });
    await renderScreen(<VehiclesScreen />);
    expect(screen.getByText('Car · Gas / Gasoline')).toBeTruthy();
  });

  it('Add vehicle opens the add screen', async () => {
    mockVehicles.mockReturnValue({ active: [vehicle('a')], archived: [], currentId: 'a' });
    await renderScreen(<VehiclesScreen />);
    await fireEvent.press(screen.getByText('Add vehicle'));
    expect(router.push).toHaveBeenCalledWith('/vehicles/new');
  });
});

import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderScreen } from '@/testing/render-screen';

import { useVehicles } from '../../vehicles/hooks/use-vehicles';
import { VehiclesSettings } from '../components/vehicles-settings';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../../vehicles/hooks/use-vehicles', () => ({ useVehicles: jest.fn() }));

describe('VehiclesSettings', () => {
  it('counts active and archived vehicles and opens the vehicles screen', async () => {
    jest.mocked(useVehicles).mockReturnValue({
      active: [{ id: 'a' }, { id: 'b' }],
      archived: [{ id: 'c' }],
      currentId: 'a',
    } as unknown as ReturnType<typeof useVehicles>);
    await renderScreen(<VehiclesSettings />);

    expect(screen.getByText('Vehicles saved: 3')).toBeTruthy();
    await fireEvent.press(screen.getByText('Manage vehicles'));
    expect(router.push).toHaveBeenCalledWith('/vehicles');
  });
});

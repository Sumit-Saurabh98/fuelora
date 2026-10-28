import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderScreen } from '@/testing/render-screen';

import { MoreScreen } from '../components/more-screen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('MoreScreen (LLD §6)', () => {
  it.each([
    ['Stats', '/stats'],
    ['Calculators', '/tools'],
    ['Vehicles', '/vehicles'],
    ['Settings', '/settings'],
  ])('%s opens %s', async (title, path) => {
    await renderScreen(<MoreScreen />);
    await fireEvent.press(screen.getByText(title));
    expect(router.push).toHaveBeenCalledWith(path);
  });
});

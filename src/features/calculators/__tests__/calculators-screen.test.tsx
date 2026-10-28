import { fireEvent, screen } from '@testing-library/react-native';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';

import { renderScreen } from '@/testing/render-screen';

import { usePreferences } from '../../settings/preferences.store';
import { CalculatorsScreen } from '../components/calculators-screen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const type = (label: string, text: string) =>
  fireEvent.changeText(screen.getByLabelText(label), text);

describe('CalculatorsScreen (F-12)', () => {
  beforeEach(() => {
    jest
      .spyOn(Localization, 'getLocales')
      .mockReturnValue([
        {
          languageTag: 'en-IN',
          regionCode: 'IN',
          currencyCode: 'INR',
        } as unknown as Localization.Locale,
      ]);
    usePreferences.setState({ region: 'IN', language: 'en', unitOverrides: {} });
  });

  afterEach(() => jest.restoreAllMocks());

  it('trip cost: fuel needed, total and each share (FR-19)', async () => {
    await renderScreen(<CalculatorsScreen />);
    expect(
      screen.getByText('Fill in the fields to see the result. Nothing is saved.'),
    ).toBeTruthy();
    await type('Distance', '300');
    await type('Your mileage', '40');
    await type('Price per L', '104.50');
    await type('People sharing', '3');

    expect(screen.getByText('7.5 L needed')).toBeTruthy();
    expect(screen.getByText('Costs ₹783.75')).toBeTruthy();
    expect(screen.getByText('₹261.25 each')).toBeTruthy();
  });

  it('mileage in every format (FR-20)', async () => {
    await renderScreen(<CalculatorsScreen />);
    await fireEvent.press(screen.getByLabelText('Mileage'));
    await type('Distance', '320');
    await type('Fuel', '8');
    expect(screen.getByText('40.0 km/L')).toBeTruthy();
    expect(screen.getByText('2.5 L/100 km')).toBeTruthy();
    expect(screen.getByText('94.1 mpg (US)')).toBeTruthy();
  });

  it('EV mileage in kWh', async () => {
    await renderScreen(<CalculatorsScreen />);
    await fireEvent.press(screen.getByLabelText('Mileage'));
    await fireEvent.press(screen.getByText('Electric'));
    await type('Distance', '120');
    await type('Energy', '20');
    expect(screen.getByText('6.0 km/kWh')).toBeTruthy();
  });

  it('split cost shows the exact shares', async () => {
    await renderScreen(<CalculatorsScreen />);
    await fireEvent.press(screen.getByLabelText('Split cost'));
    await type('Total cost', '100');
    await type('People sharing', '3');
    expect(screen.getByText('₹33.33–₹33.34 each')).toBeTruthy();
  });

  it('Track this vehicle opens add vehicle; nothing is saved before', async () => {
    await renderScreen(<CalculatorsScreen />);
    await fireEvent.press(screen.getByText('Track this vehicle'));
    expect(router.push).toHaveBeenCalledWith('/vehicles/new');
  });
});

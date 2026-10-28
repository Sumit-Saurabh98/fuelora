import { fireEvent, screen } from '@testing-library/react-native';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';

import type { FillUp } from '@/domain/fill-up';
import type { Vehicle } from '@/domain/vehicle';
import { renderScreen } from '@/testing/render-screen';

import { usePreferences } from '../../settings/preferences.store';
import { useVehicle } from '../../vehicles/hooks/use-vehicle';
import { FillUpResultScreen } from '../components/fill-up-result-screen';
import { useVehicleFillUps } from '../hooks/use-vehicle-fill-ups';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('../../vehicles/hooks/use-vehicle', () => ({ useVehicle: jest.fn() }));
jest.mock('../hooks/use-vehicle-fill-ups', () => ({ useVehicleFillUps: jest.fn() }));

const scooter: Vehicle = {
  id: 'v1',
  name: 'My Activa',
  type: 'scooter',
  fuelType: 'petrol',
  make: null,
  model: null,
  year: null,
  plate: null,
  initialOdometerM: 0,
  tankCapacityBase: null,
  isArchived: false,
  sortOrder: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

function f(
  id: string,
  km: number,
  litres: number,
  rupees: number,
  change: Partial<FillUp> = {},
): FillUp {
  return {
    id,
    vehicleId: 'v1',
    filledAt: '2026-10-10T09:00:00.000Z',
    localDate: '2026-10-10',
    odometerM: km * 1000,
    quantityBase: litres * 1000,
    totalMinor: rupees * 100,
    currency: 'INR',
    isFull: true,
    missedPrevious: false,
    entryMode: 'qty_total',
    station: null,
    note: null,
    createdAt: '2026-10-10T09:00:00.000Z',
    updatedAt: '2026-10-10T09:00:00.000Z',
    ...change,
  };
}

async function show(fillUps: FillUp[], id: string, vehicle: Vehicle = scooter) {
  jest.mocked(useVehicle).mockReturnValue(vehicle);
  jest.mocked(useVehicleFillUps).mockReturnValue(fillUps);
  await renderScreen(<FillUpResultScreen fillUpId={id} vehicleId="v1" />);
}

describe('FillUpResultScreen (FR-10)', () => {
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

  it('a full tank closing a segment shows mileage, distance on fuel and cost per km', async () => {
    await show(
      [f('a', 10_000, 5, 500), f('b', 10_150, 3, 300, { isFull: false }), f('c', 10_320, 5, 500)],
      'c',
    );
    expect(screen.getByText('This tank')).toBeTruthy();
    expect(screen.getByText('40.0 km/L')).toBeTruthy();
    expect(screen.getByText('320 km on 8 L')).toBeTruthy();
    expect(screen.getByText('₹2.50 per km')).toBeTruthy();
  });

  it('first full tank explains when mileage appears', async () => {
    await show([f('a', 10_000, 5, 500)], 'a');
    expect(screen.getByText('First full tank saved')).toBeTruthy();
    expect(screen.getByText('Your mileage shows after your next full tank.')).toBeTruthy();
  });

  it('a partial fill waits for the next full tank', async () => {
    await show([f('a', 10_000, 5, 500), f('b', 10_150, 3, 300, { isFull: false })], 'b');
    expect(screen.getByText('Partial fill saved')).toBeTruthy();
  });

  it('a missed fill-up skips the number instead of showing a wrong one', async () => {
    await show([f('a', 10_000, 5, 500), f('b', 10_320, 8, 800, { missedPrevious: true })], 'b');
    expect(screen.queryByText(/km\/L/)).toBeNull();
    expect(screen.getByText(/so this tank's mileage is skipped/)).toBeTruthy();
  });

  it('US EV: mi/kWh and per mi', async () => {
    jest
      .spyOn(Localization, 'getLocales')
      .mockReturnValue([
        {
          languageTag: 'en-US',
          regionCode: 'US',
          currencyCode: 'USD',
        } as unknown as Localization.Locale,
      ]);
    usePreferences.setState({ region: 'US' });
    await show(
      [
        f('a', 0, 10, 0, { currency: 'USD' }),
        // 120 km on 40 kWh, $6
        f('b', 120, 40, 6, { currency: 'USD' }),
      ],
      'b',
      { ...scooter, fuelType: 'electric' },
    );
    expect(screen.getByText('This charge')).toBeTruthy();
    expect(screen.getByText('1.9 mi/kWh')).toBeTruthy();
    expect(screen.getByText('75 mi on 40 kWh')).toBeTruthy();
    expect(screen.getByText('$0.08 per mi')).toBeTruthy();
  });

  it('Done goes back', async () => {
    await show([f('a', 10_000, 5, 500)], 'a');
    await fireEvent.press(screen.getByText('Done'));
    expect(router.back).toHaveBeenCalled();
  });
});

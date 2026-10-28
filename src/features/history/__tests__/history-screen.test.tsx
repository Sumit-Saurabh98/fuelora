import { fireEvent, screen } from '@testing-library/react-native';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';

import type { FillUp } from '@/domain/fill-up';
import type { Vehicle } from '@/domain/vehicle';
import { renderScreen } from '@/testing/render-screen';

import { useVehicleFillUps } from '../../fill-up/hooks/use-vehicle-fill-ups';
import { useVehicleServices } from '../../services/hooks/use-vehicle-services';
import { usePreferences } from '../../settings/preferences.store';
import { useVehicles } from '../../vehicles/hooks/use-vehicles';
import { HistoryScreen } from '../components/history-screen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../../vehicles/hooks/use-vehicles', () => ({ useVehicles: jest.fn() }));
jest.mock('../../fill-up/hooks/use-vehicle-fill-ups', () => ({ useVehicleFillUps: jest.fn() }));
jest.mock('../../services/hooks/use-vehicle-services', () => ({ useVehicleServices: jest.fn() }));

const activa: Vehicle = {
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
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
};

function f(
  id: string,
  km: number,
  litres: number,
  rupees: number,
  localDate: string,
  change: Partial<FillUp> = {},
): FillUp {
  return {
    id,
    vehicleId: 'v1',
    filledAt: `${localDate}T09:00:00.000Z`,
    localDate,
    odometerM: km * 1000,
    quantityBase: litres * 1000,
    totalMinor: rupees * 100,
    currency: 'INR',
    isFull: true,
    missedPrevious: false,
    entryMode: 'qty_total',
    station: null,
    note: null,
    createdAt: `${localDate}T09:00:00.000Z`,
    updatedAt: `${localDate}T09:00:00.000Z`,
    ...change,
  };
}

describe('HistoryScreen (F-07)', () => {
  beforeEach(() => {
    jest.spyOn(Localization, 'getLocales').mockReturnValue([
      {
        languageTag: 'en-IN',
        regionCode: 'IN',
        currencyCode: 'INR',
      } as unknown as Localization.Locale,
    ]);
    usePreferences.setState({ region: 'IN', language: 'en', unitOverrides: {} });
    jest.mocked(useVehicles).mockReturnValue({ active: [activa], archived: [], currentId: 'v1' });
    jest.mocked(useVehicleServices).mockReturnValue([]);
  });

  afterEach(() => jest.restoreAllMocks());

  it('empty without a vehicle or without fill-ups', async () => {
    jest.mocked(useVehicleFillUps).mockReturnValue([]);
    await renderScreen(<HistoryScreen />);
    expect(screen.getByText('No entries yet')).toBeTruthy();
  });

  it('groups by month newest first with month spend and marks on each entry', async () => {
    jest
      .mocked(useVehicleFillUps)
      .mockReturnValue([
        f('a', 10_000, 5, 500, '2026-09-25'),
        f('b', 10_150, 3, 300, '2026-10-05', { isFull: false, station: 'HP' }),
        f('c', 10_320, 5, 500, '2026-10-20'),
        f('d', 10_600, 7, 700, '2026-10-27', { missedPrevious: true }),
      ]);
    await renderScreen(<HistoryScreen />);

    const headers = screen.getAllByRole('header').map((h) => h.props.children);
    expect(headers).toEqual(['October 2026', 'September 2026']);
    expect(screen.getByText('₹1,500.00')).toBeTruthy(); // October: 300 + 500 + 700
    expect(screen.getByText('40.0 km/L')).toBeTruthy(); // c closes 320 km on 8 L
    expect(screen.getByText('Partial')).toBeTruthy();
    expect(screen.getByText('Missed fill')).toBeTruthy();
    expect(screen.getByText('First full')).toBeTruthy();
    expect(screen.getByText('10,150 km · 3 L · HP')).toBeTruthy();
  });

  it('tapping an entry opens it for editing', async () => {
    jest.mocked(useVehicleFillUps).mockReturnValue([f('a', 10_000, 5, 500, '2026-10-05')]);
    await renderScreen(<HistoryScreen />);
    await fireEvent.press(screen.getByText('10,000 km · 5 L'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/fill-up/[id]', params: { id: 'a' } });
  });

  it('services appear with fill-ups, count in the month spend and open for editing', async () => {
    jest.mocked(useVehicleFillUps).mockReturnValue([f('a', 10_000, 5, 500, '2026-10-05')]);
    jest.mocked(useVehicleServices).mockReturnValue([
      {
        id: 's1',
        vehicleId: 'v1',
        servicedDate: '2026-10-12',
        odometerM: 10_200_000,
        typeKey: 'engine_oil',
        title: null,
        costMinor: 45_000,
        currency: 'INR',
        note: 'Castrol',
        createdAt: '2026-10-12T09:00:00.000Z',
        updatedAt: '2026-10-12T09:00:00.000Z',
      },
    ]);
    await renderScreen(<HistoryScreen />);

    expect(screen.getByText('Engine oil change · 10,200 km · Castrol')).toBeTruthy();
    expect(screen.getByText('₹950.00')).toBeTruthy(); // ₹500 fuel + ₹450 service
    await fireEvent.press(screen.getByText('Engine oil change · 10,200 km · Castrol'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/service/[id]', params: { id: 's1' } });
  });

  it('only services is not empty', async () => {
    jest.mocked(useVehicleFillUps).mockReturnValue([]);
    jest.mocked(useVehicleServices).mockReturnValue([
      {
        id: 's1',
        vehicleId: 'v1',
        servicedDate: '2026-10-12',
        odometerM: null,
        typeKey: 'custom',
        title: 'Horn',
        costMinor: null,
        currency: null,
        note: null,
        createdAt: '2026-10-12T09:00:00.000Z',
        updatedAt: '2026-10-12T09:00:00.000Z',
      },
    ]);
    await renderScreen(<HistoryScreen />);
    expect(screen.getByText('Horn')).toBeTruthy();
    expect(screen.queryByText('No entries yet')).toBeNull();
  });
});

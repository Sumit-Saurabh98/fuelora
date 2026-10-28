import { fireEvent, screen } from '@testing-library/react-native';
import * as Localization from 'expo-localization';

import type { FillUp } from '@/domain/fill-up';
import type { Vehicle } from '@/domain/vehicle';
import { renderScreen } from '@/testing/render-screen';

import { useVehicleFillUps } from '../../fill-up/hooks/use-vehicle-fill-ups';
import { usePreferences } from '../../settings/preferences.store';
import { useVehicles } from '../../vehicles/hooks/use-vehicles';
import { StatsScreen } from '../components/stats-screen';

// SVG charts don't render under Jest; record what they were given instead.
const mockCharts: { line?: unknown[]; bar?: { value: number }[] } = {};
jest.mock('react-native-gifted-charts', () => ({
  LineChart: ({ data }: { data: unknown[] }) => {
    mockCharts.line = data;
    return null;
  },
  BarChart: ({ data }: { data: { value: number }[] }) => {
    mockCharts.bar = data;
    return null;
  },
}));
jest.mock('@/container', () => ({
  getContainer: () => ({ clock: { now: () => new Date('2026-10-28T10:00:00.000Z') } }),
}));
jest.mock('../../vehicles/hooks/use-vehicles', () => ({ useVehicles: jest.fn() }));
jest.mock('../../fill-up/hooks/use-vehicle-fill-ups', () => ({ useVehicleFillUps: jest.fn() }));

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
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
};

function f(id: string, km: number, litres: number, rupees: number, localDate: string): FillUp {
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
  };
}

describe('StatsScreen (F-08)', () => {
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
    jest.mocked(useVehicles).mockReturnValue({ active: [activa], archived: [], currentId: 'v1' });
    mockCharts.line = undefined;
    mockCharts.bar = undefined;
  });

  afterEach(() => jest.restoreAllMocks());

  it('6 months by default: tiles, a mileage point per tank, bars per month', async () => {
    jest
      .mocked(useVehicleFillUps)
      .mockReturnValue([
        f('a', 10_000, 5, 500, '2026-03-10'),
        f('b', 10_400, 10, 1000, '2026-05-10'),
        f('c', 10_500, 5, 500, '2026-09-05'),
        f('d', 10_800, 6, 600, '2026-10-20'),
      ]);
    await renderScreen(<StatsScreen />);

    expect(screen.getByText('38.1 km/L')).toBeTruthy(); // 800 / 21, distance-weighted
    expect(screen.getByText('50.0 km/L')).toBeTruthy();
    expect(screen.getByText('20.0 km/L')).toBeTruthy();
    expect(mockCharts.line).toHaveLength(3);
    // 28 Apr → Oct: 7 months; ₹1,000 in May, ₹500 Sep, ₹600 Oct
    expect(mockCharts.bar?.map((b) => b.value)).toEqual([0, 1000, 0, 0, 0, 500, 600]);
    expect(
      screen.getByLabelText(/Mileage from 10 May 2026 to 20 Oct 2026, average 38.1 km\/L/),
    ).toBeTruthy();
  });

  it('a shorter range keeps only what closed in it', async () => {
    jest
      .mocked(useVehicleFillUps)
      .mockReturnValue([
        f('a', 10_000, 5, 500, '2026-03-10'),
        f('b', 10_400, 10, 1000, '2026-05-10'),
        f('c', 10_500, 5, 500, '2026-09-05'),
      ]);
    await renderScreen(<StatsScreen />);
    await fireEvent.press(screen.getByLabelText('3M'));
    expect(screen.getByText('Mileage shows here after two full tanks in this range.')).toBeTruthy();
    expect(screen.getAllByText('20.0 km/L').length).toBeGreaterThan(0);
  });

  it('nothing logged yet', async () => {
    jest.mocked(useVehicleFillUps).mockReturnValue([]);
    await renderScreen(<StatsScreen />);
    expect(screen.getByText('No fill-ups in this range.')).toBeTruthy();
  });
});

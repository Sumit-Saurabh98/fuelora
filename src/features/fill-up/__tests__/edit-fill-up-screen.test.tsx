import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';

import { FixedClock } from '@/domain/clock';
import type { FillUp } from '@/domain/fill-up';
import type { IdGenerator } from '@/domain/id-generator';
import type { Vehicle } from '@/domain/vehicle';
import { InMemoryFillUpRepository } from '@/repositories/in-memory-fill-up.repository';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { InMemoryVehicleRepository } from '@/repositories/in-memory-vehicle.repository';
import { FillUpService } from '@/services/fill-up.service';
import { SettingsService } from '@/services/settings.service';
import { VehicleService } from '@/services/vehicle.service';
import { renderScreen } from '@/testing/render-screen';

import { usePreferences } from '../../settings/preferences.store';
import { useVehicle } from '../../vehicles/hooks/use-vehicle';
import { EditFillUpScreen } from '../components/edit-fill-up-screen';
import { useFillUp } from '../hooks/use-fill-up';

const mockClock = new FixedClock(new Date('2026-10-28T10:00:00.000Z'));
let n = 0;
const ids: IdGenerator = { next: () => `id${++n}` };
const mockSettings = new SettingsService(new InMemorySettingsRepository(), mockClock);
const mockRepo = new InMemoryFillUpRepository();
const mockVehicles = new VehicleService(
  new InMemoryVehicleRepository(),
  mockSettings,
  mockClock,
  ids,
);
const mockFillUps = new FillUpService(mockRepo, mockVehicles, mockClock, ids);
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn() },
  Stack: { Screen: () => null },
}));
jest.mock('@/container', () => ({
  getContainer: () => ({
    clock: mockClock,
    vehicleService: mockVehicles,
    fillUpService: mockFillUps,
  }),
}));
jest.mock('../../vehicles/hooks/use-vehicle', () => ({ useVehicle: jest.fn() }));
jest.mock('../hooks/use-fill-up', () => ({ useFillUp: jest.fn() }));

let vehicle: Vehicle;
let entry: FillUp;

async function setup(change: Partial<FillUp> = {}) {
  mockRepo.rows.clear();
  vehicle = await mockVehicles.create({
    name: 'My Activa',
    type: 'scooter',
    fuelType: 'petrol',
    initialOdometerM: 12_000_000,
  });
  entry = await mockFillUps.add({
    vehicleId: vehicle.id,
    filledAt: new Date('2026-10-20T09:00:00.000Z'),
    odometerM: 12_345_678,
    quantityBase: 1914,
    totalMinor: 20_000,
    currency: 'INR',
    isFull: true,
    missedPrevious: false,
    entryMode: 'amount_only',
    station: 'HP',
  });
  if (Object.keys(change).length) {
    entry = { ...entry, ...change };
    mockRepo.rows.set(entry.id, entry);
  }
  jest.mocked(useVehicle).mockReturnValue(vehicle);
  jest.mocked(useFillUp).mockReturnValue(entry);
  await renderScreen(<EditFillUpScreen id={entry.id} />);
}

const stored = () => mockRepo.rows.get(entry.id);

describe('EditFillUpScreen (FR-11)', () => {
  beforeEach(() => {
    jest.spyOn(Localization, 'getLocales').mockReturnValue([
      {
        languageTag: 'en-IN',
        regionCode: 'IN',
        currencyCode: 'INR',
      } as unknown as Localization.Locale,
    ]);
    usePreferences.setState({ region: 'IN', language: 'en', unitOverrides: {} });
    jest.mocked(router.back).mockClear();
  });

  afterEach(() => jest.restoreAllMocks());

  it('opens with the saved values in the full form', async () => {
    await setup();
    expect(screen.getByLabelText('Odometer').props.value).toBe('12,345.7');
    expect(screen.getByLabelText('Total paid').props.value).toBe('200');
    expect(screen.getByLabelText('Fuel').props.value).toBe('1.91');
    expect(screen.getByLabelText('Station (optional)').props.value).toBe('HP');
  });

  it('changing only the station keeps the exact odometer, litres and mode', async () => {
    await setup();
    await fireEvent.changeText(screen.getByLabelText('Station (optional)'), 'Shell');

    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(stored()).toMatchObject({
      station: 'Shell',
      odometerM: 12_345_678,
      quantityBase: 1914,
      totalMinor: 20_000,
      entryMode: 'amount_only',
    });
    expect(router.replace).not.toHaveBeenCalled(); // no result card for an edit
  });

  it('saves a changed amount and recomputes the third value', async () => {
    await setup();
    await fireEvent.changeText(screen.getByLabelText('Total paid'), '250');

    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(stored()).toMatchObject({ totalMinor: 25_000, entryMode: 'price_total' });
  });

  it('an old entry in another currency stays in that currency', async () => {
    await setup({ currency: 'USD', totalMinor: 2500 });
    usePreferences.setState({ region: 'IN' });
    await fireEvent.changeText(screen.getByLabelText('Total paid'), '30');

    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(stored()).toMatchObject({ currency: 'USD', totalMinor: 3000 });
  });

  it('delete asks first, then removes the entry', async () => {
    await setup();
    await fireEvent.press(screen.getByText('Delete fill-up'));
    expect(screen.getByText('Delete this entry?')).toBeTruthy();

    await fireEvent.press(screen.getByText('Cancel'));
    expect(stored()).toBeDefined();

    await fireEvent.press(screen.getByText('Delete fill-up'));
    await fireEvent.press(screen.getByText('Delete'));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(stored()).toBeUndefined();
  });

  it('explains when the entry no longer exists', async () => {
    jest.mocked(useFillUp).mockReturnValue(null);
    jest.mocked(useVehicle).mockReturnValue(null);
    await renderScreen(<EditFillUpScreen id="gone" />);
    expect(screen.getByText('Entry not found')).toBeTruthy();
  });
});

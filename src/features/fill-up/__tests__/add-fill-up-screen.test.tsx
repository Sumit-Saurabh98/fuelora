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
import { AddFillUpScreen } from '../components/add-fill-up-screen';
import { useLatestFillUp } from '../hooks/use-latest-fill-up';

const mockClock = new FixedClock(new Date('2026-10-28T10:00:00.000Z'));
let n = 0;
const ids: IdGenerator = { next: () => `id${++n}` };
const mockSettings = new SettingsService(new InMemorySettingsRepository(), mockClock);
const mockFillUpRepo = new InMemoryFillUpRepository();
const mockVehicles = new VehicleService(
  new InMemoryVehicleRepository(),
  mockSettings,
  mockClock,
  ids,
);
const mockFillUps = new FillUpService(mockFillUpRepo, mockVehicles, mockClock, ids);
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
// Live queries need SQLite; serve the vehicle and last entry directly.
jest.mock('../../vehicles/hooks/use-vehicle', () => ({ useVehicle: jest.fn() }));
jest.mock('../hooks/use-latest-fill-up', () => ({ useLatestFillUp: jest.fn() }));

let vehicle: Vehicle;

async function setup(fuelType: Vehicle['fuelType'] = 'petrol', last: FillUp | null = null) {
  mockFillUpRepo.rows.clear();
  vehicle = await mockVehicles.create({
    name: 'My Activa',
    type: 'scooter',
    fuelType,
    initialOdometerM: 12_000_000,
  });
  jest.mocked(useVehicle).mockReturnValue(vehicle);
  jest.mocked(useLatestFillUp).mockReturnValue(last);
  await renderScreen(<AddFillUpScreen vehicleId={vehicle.id} />);
}

const type = (label: string, text: string) =>
  fireEvent.changeText(screen.getByLabelText(label), text);
const saved = () => [...mockFillUpRepo.rows.values()];

describe('AddFillUpScreen', () => {
  beforeEach(() => {
    jest.spyOn(Localization, 'getLocales').mockReturnValue([
      {
        languageTag: 'en-IN',
        regionCode: 'IN',
        currencyCode: 'INR',
      } as unknown as Localization.Locale,
    ]);
    usePreferences.setState({ region: 'IN', language: 'en', unitOverrides: {} });
    jest.mocked(router.replace).mockClear();
  });

  afterEach(() => jest.restoreAllMocks());

  it('price + total: shows the litres live and saves canonical values', async () => {
    await setup();
    await type('Odometer', '12,300');
    await type('Price per L', '104.50');
    await type('Total paid', '200');

    expect(screen.getByLabelText('Fuel').props.value).toBe('1.91');
    expect(screen.getByText('Calculated')).toBeTruthy();

    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(router.replace).toHaveBeenCalled());
    // Opens the result card for the saved entry (FR-10).
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/fill-up/result',
      params: { id: saved()[0]!.id, vehicleId: vehicle.id },
    });
    expect(saved()).toEqual([
      expect.objectContaining({
        odometerM: 12_300_000,
        quantityBase: 1914,
        totalMinor: 20_000,
        currency: 'INR',
        entryMode: 'price_total',
        isFull: true,
        missedPrevious: false,
        filledAt: '2026-10-28T10:00:00.000Z',
      }),
    ]);
  });

  it('typing into the calculated field makes it an input; the oldest becomes calculated', async () => {
    await setup();
    await type('Price per L', '100');
    await type('Total paid', '500');
    await type('Fuel', '4');
    expect(screen.getByLabelText('Price per L').props.value).toBe('125');
  });

  const last: FillUp = {
    id: 'old',
    vehicleId: 'x',
    filledAt: '2026-10-20T09:00:00.000Z',
    localDate: '2026-10-20',
    odometerM: 12_100_000,
    quantityBase: 5000,
    totalMinor: 52_250,
    currency: 'INR',
    isFull: true,
    missedPrevious: false,
    entryMode: 'qty_total',
    station: 'HP Indiranagar',
    note: null,
    createdAt: '2026-10-20T09:00:00.000Z',
    updatedAt: '2026-10-20T09:00:00.000Z',
  };

  it('scooter with a last price: amount only, fuel from the price (F-04, KB #25)', async () => {
    await setup('petrol', last);
    expect(screen.queryByLabelText('Fuel')).toBeNull();
    expect(screen.getByLabelText('Price per L').props.value).toBe('104.5');
    expect(screen.getByLabelText('Station (optional)').props.value).toBe('HP Indiranagar');

    await type('Odometer', '12,300');
    await type('Amount paid', '200');
    expect(screen.getByText('≈ 1.91 L at this price')).toBeTruthy();

    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(saved()).toHaveLength(1));
    expect(saved()[0]).toMatchObject({
      entryMode: 'amount_only',
      quantityBase: 1914,
      totalMinor: 20_000,
      station: 'HP Indiranagar',
    });
  });

  it('switching to the full form keeps the typed amount and shows the calculated litres', async () => {
    await setup('petrol', last);
    await type('Amount paid', '200');

    await fireEvent.press(screen.getByLabelText('Fuel + amount'));

    expect(screen.getByLabelText('Total paid').props.value).toBe('200');
    expect(screen.getByLabelText('Fuel').props.value).toBe('1.91');
  });

  it('partial fill and missed flag are saved', async () => {
    await setup();
    await type('Odometer', '12,300');
    await type('Fuel', '3');
    await type('Total paid', '313.50');
    await fireEvent(screen.getByLabelText('Full tank'), 'valueChange', false);
    await fireEvent(screen.getByLabelText('Missed a fill-up before this'), 'valueChange', true);

    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(saved()).toHaveLength(1));
    expect(saved()[0]).toMatchObject({
      isFull: false,
      missedPrevious: true,
      entryMode: 'qty_total',
    });
  });

  it('asks for the odometer and two amounts', async () => {
    await setup();
    await type('Total paid', '200');
    await fireEvent.press(screen.getByText('Save'));

    expect(await screen.findByText('Required')).toBeTruthy();
    expect(screen.getAllByText('Enter any two of these')).toHaveLength(2);
    expect(saved()).toHaveLength(0);
  });

  it('shows the reading to beat when the odometer is out of order (FR-7)', async () => {
    await setup();
    await type('Odometer', '11,500');
    await type('Fuel', '3');
    await type('Total paid', '300');

    await fireEvent.press(screen.getByText('Save'));

    expect(
      await screen.findByText("Must be at least 12,000 km (the vehicle's starting odometer)"),
    ).toBeTruthy();
    expect(saved()).toHaveLength(0);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('EV: says charge and energy in kWh', async () => {
    await setup('electric');
    expect(screen.getByText('Full charge')).toBeTruthy();
    await type('Odometer', '12,100');
    await type('Energy', '20');
    await type('Price per kWh', '18');
    expect(screen.getByLabelText('Total paid').props.value).toBe('360');
  });

  it('US users get miles, gallons and $', async () => {
    jest.spyOn(Localization, 'getLocales').mockReturnValue([
      {
        languageTag: 'en-US',
        regionCode: 'US',
        currencyCode: 'USD',
      } as unknown as Localization.Locale,
    ]);
    usePreferences.setState({ region: 'US' });
    await setup();
    await type('Odometer', '7,700');
    await type('Fuel', '1.2'); // 4,542.49 mL
    await type('Price per US gal', '3.459');

    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(saved()).toHaveLength(1));
    expect(saved()[0]).toMatchObject({ currency: 'USD', quantityBase: 4542, totalMinor: 415 });
  });

  it('warns about an unbelievable mileage but still lets the user save (FR-8)', async () => {
    await setup();
    await mockFillUps.add({
      vehicleId: vehicle.id,
      filledAt: new Date('2026-10-20T09:00:00.000Z'),
      odometerM: 12_100_000,
      quantityBase: 5000,
      totalMinor: 52_250,
      currency: 'INR',
      isFull: true,
      missedPrevious: false,
      entryMode: 'qty_total',
    });
    await type('Odometer', '14,100'); // 2,000 km on 5 L
    await type('Fuel', '5');
    await type('Total paid', '522.50');

    await fireEvent.press(screen.getByText('Save'));

    expect(
      await screen.findByText(
        "That's unusually high mileage for this vehicle. Check the odometer and the fuel amount.",
      ),
    ).toBeTruthy();
    expect(saved()).toHaveLength(1);

    await fireEvent.press(screen.getByText('Check again'));
    expect(saved()).toHaveLength(1);

    await fireEvent.press(screen.getByText('Save'));
    await fireEvent.press(await screen.findByText('Save anyway'));

    await waitFor(() => expect(saved()).toHaveLength(2));
    expect(router.replace).toHaveBeenCalled();
  });
});

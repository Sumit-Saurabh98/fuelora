import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';

import { FixedClock } from '@/domain/clock';
import type { IdGenerator } from '@/domain/id-generator';
import type { Vehicle } from '@/domain/vehicle';
import { InMemoryServiceLogRepository } from '@/repositories/in-memory-service-log.repository';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { InMemoryVehicleRepository } from '@/repositories/in-memory-vehicle.repository';
import { ServiceLogService } from '@/services/service-log.service';
import { SettingsService } from '@/services/settings.service';
import { VehicleService } from '@/services/vehicle.service';
import { renderScreen } from '@/testing/render-screen';

import { usePreferences } from '../../settings/preferences.store';
import { useVehicle } from '../../vehicles/hooks/use-vehicle';
import { AddServiceScreen } from '../components/add-service-screen';

const mockClock = new FixedClock(new Date('2026-10-28T10:00:00.000Z'));
let n = 0;
const ids: IdGenerator = { next: () => `id${++n}` };
const mockSettings = new SettingsService(new InMemorySettingsRepository(), mockClock);
const mockRepo = new InMemoryServiceLogRepository();
const mockVehicles = new VehicleService(
  new InMemoryVehicleRepository(),
  mockSettings,
  mockClock,
  ids,
);
const mockServices = new ServiceLogService(mockRepo, mockVehicles, mockClock, ids);
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, Stack: { Screen: () => null } }));
jest.mock('@/container', () => ({
  getContainer: () => ({
    clock: mockClock,
    vehicleService: mockVehicles,
    serviceLogService: mockServices,
  }),
}));
jest.mock('../../vehicles/hooks/use-vehicle', () => ({ useVehicle: jest.fn() }));

async function setup(type: Vehicle['type'] = 'bike', fuelType: Vehicle['fuelType'] = 'petrol') {
  mockRepo.rows.clear();
  const vehicle = await mockVehicles.create({
    name: 'Pulsar',
    type,
    fuelType,
    initialOdometerM: 12_000_000,
  });
  jest.mocked(useVehicle).mockReturnValue(vehicle);
  await renderScreen(<AddServiceScreen vehicleId={vehicle.id} />);
  return vehicle;
}

const saved = () => [...mockRepo.rows.values()];

describe('AddServiceScreen (F-09)', () => {
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
    jest.mocked(router.back).mockClear();
  });

  afterEach(() => jest.restoreAllMocks());

  it('shows the presets for the vehicle type', async () => {
    await setup('bike');
    expect(screen.getByText('Chain lube')).toBeTruthy();
    expect(screen.queryByText('CVT belt')).toBeNull();
    expect(screen.queryByText('AC service')).toBeNull();
  });

  it('EVs get no engine oil', async () => {
    await setup('car', 'electric');
    expect(screen.queryByText('Engine oil change')).toBeNull();
    expect(screen.getByText('AC service')).toBeTruthy();
  });

  it('saves a preset service with odometer and cost', async () => {
    const vehicle = await setup();
    await fireEvent.press(screen.getByText('Engine oil change'));
    await fireEvent.changeText(screen.getByLabelText('Odometer (optional)'), '12,500');
    await fireEvent.changeText(screen.getByLabelText('Cost (optional)'), '450');

    await fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(saved()).toEqual([
      expect.objectContaining({
        vehicleId: vehicle.id,
        servicedDate: '2026-10-28',
        typeKey: 'engine_oil',
        odometerM: 12_500_000,
        costMinor: 45_000,
        currency: 'INR',
        title: null,
      }),
    ]);
  });

  it('"Other" asks for a name', async () => {
    await setup();
    await fireEvent.press(screen.getByText('Other'));
    await fireEvent.press(screen.getByText('Save'));
    expect(await screen.findByText('Required')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Name it'), 'Horn');
    await fireEvent.press(screen.getByText('Save'));
    await waitFor(() => expect(saved()).toHaveLength(1));
    expect(saved()[0]).toMatchObject({ typeKey: 'custom', title: 'Horn', costMinor: null });
  });

  it('an odometer below the vehicle start is shown on the field', async () => {
    await setup();
    await fireEvent.changeText(screen.getByLabelText('Odometer (optional)'), '9,000');
    await fireEvent.press(screen.getByText('Save'));
    expect(await screen.findByText("Can't be below the vehicle's starting odometer")).toBeTruthy();
    expect(saved()).toHaveLength(0);
  });
});

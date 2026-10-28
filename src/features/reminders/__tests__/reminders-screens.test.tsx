import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';

import { FixedClock } from '@/domain/clock';
import type { IdGenerator } from '@/domain/id-generator';
import type { Reminder } from '@/domain/reminder';
import type { Vehicle } from '@/domain/vehicle';
import { InMemoryReminderRepository } from '@/repositories/in-memory-reminder.repository';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { InMemoryVehicleRepository } from '@/repositories/in-memory-vehicle.repository';
import { ReminderService } from '@/services/reminder.service';
import { SettingsService } from '@/services/settings.service';
import { VehicleService } from '@/services/vehicle.service';
import { renderScreen } from '@/testing/render-screen';

import { usePreferences } from '../../settings/preferences.store';
import { useCurrentOdometer } from '../../vehicles/hooks/use-current-odometer';
import { useVehicle } from '../../vehicles/hooks/use-vehicle';
import { useVehicles } from '../../vehicles/hooks/use-vehicles';
import { AddReminderScreen } from '../components/reminder-screens';
import { RemindersScreen } from '../components/reminders-screen';
import { useActiveReminders } from '../hooks/use-active-reminders';

const mockClock = new FixedClock(new Date('2026-10-28T10:00:00.000Z'));
let n = 0;
const ids: IdGenerator = { next: () => `id${++n}` };
const mockSettings = new SettingsService(new InMemorySettingsRepository(), mockClock);
const mockVehicles = new VehicleService(
  new InMemoryVehicleRepository(),
  mockSettings,
  mockClock,
  ids,
);
const mockRepo = new InMemoryReminderRepository();
const mockReminders = new ReminderService(
  mockRepo,
  mockVehicles,
  { currentOdometerM: async () => 12_400_000 },
  mockClock,
  ids,
);
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  Stack: { Screen: () => null },
}));
jest.mock('@/container', () => ({
  getContainer: () => ({
    clock: mockClock,
    vehicleService: mockVehicles,
    reminderService: mockReminders,
  }),
}));
jest.mock('../../vehicles/hooks/use-vehicle', () => ({ useVehicle: jest.fn() }));
jest.mock('../../vehicles/hooks/use-vehicles', () => ({ useVehicles: jest.fn() }));
jest.mock('../../vehicles/hooks/use-current-odometer', () => ({ useCurrentOdometer: jest.fn() }));
jest.mock('../hooks/use-active-reminders', () => ({ useActiveReminders: jest.fn() }));

let vehicle: Vehicle;

function reminder(change: Partial<Reminder>): Reminder {
  return {
    id: 'r',
    vehicleId: vehicle.id,
    kind: 'service',
    typeKey: 'engine_oil',
    title: null,
    dueDate: null,
    dueOdometerM: null,
    repeatMonths: null,
    repeatDistanceM: null,
    leadDays: 7,
    leadDistanceM: 300_000,
    status: 'active',
    lastDoneDate: null,
    lastDoneOdometerM: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...change,
  };
}

describe('Reminders', () => {
  beforeEach(async () => {
    jest.spyOn(Localization, 'getLocales').mockReturnValue([
      {
        languageTag: 'en-IN',
        regionCode: 'IN',
        currencyCode: 'INR',
      } as unknown as Localization.Locale,
    ]);
    usePreferences.setState({ region: 'IN', language: 'en', unitOverrides: {} });
    mockRepo.rows.clear();
    vehicle = await mockVehicles.create({
      name: 'My Activa',
      type: 'scooter',
      fuelType: 'petrol',
      initialOdometerM: 12_000_000,
    });
    jest.mocked(useVehicle).mockReturnValue(vehicle);
    jest
      .mocked(useVehicles)
      .mockReturnValue({ active: [vehicle], archived: [], currentId: vehicle.id });
    jest.mocked(useCurrentOdometer).mockReturnValue(12_400_000);
    jest.mocked(router.back).mockClear();
  });

  afterEach(() => jest.restoreAllMocks());

  describe('list (F-10)', () => {
    it('most urgent first with region names and due text', async () => {
      jest.mocked(useActiveReminders).mockReturnValue([
        reminder({ id: 'oil', dueOdometerM: 15_000_000 }),
        reminder({
          id: 'puc',
          kind: 'document',
          typeKey: 'emission_test',
          dueDate: '2026-10-20',
        }),
        reminder({ id: 'ins', kind: 'document', typeKey: 'insurance', dueDate: '2026-11-02' }),
      ]);
      await renderScreen(<RemindersScreen />);

      const titles = ['PUC', 'Insurance', 'Engine oil change'].map(
        (t) => screen.getByText(t).props.children,
      );
      expect(titles).toEqual(['PUC', 'Insurance', 'Engine oil change']);
      expect(screen.getByText('Overdue since 20 Oct 2026')).toBeTruthy();
      expect(screen.getByText('Due 2 Nov 2026 · in 5 days')).toBeTruthy();
      expect(screen.getByText('2,600 km to go')).toBeTruthy();
      expect(screen.getByText('Overdue')).toBeTruthy();
      expect(screen.getByText('Soon')).toBeTruthy();
    });

    it('Done asks, then marks it done today', async () => {
      const saved = await mockReminders.create({
        vehicleId: vehicle.id,
        kind: 'document',
        typeKey: 'insurance',
        dueDate: '2026-11-02',
        repeatMonths: 12,
      });
      jest.mocked(useActiveReminders).mockReturnValue([saved]);
      await renderScreen(<RemindersScreen />);

      await fireEvent.press(screen.getByText('Done'));
      expect(
        screen.getByText('Marks it done today at your current odometer and sets the next one.'),
      ).toBeTruthy();
      await fireEvent.press(screen.getByText('Done today'));

      await waitFor(async () =>
        expect((await mockReminders.get(saved.id))?.dueDate).toBe('2027-10-28'),
      );
    });

    it('empty state and the add button', async () => {
      jest.mocked(useActiveReminders).mockReturnValue([]);
      await renderScreen(<RemindersScreen />);
      expect(screen.getByText('No reminders yet')).toBeTruthy();
      await fireEvent.press(screen.getByText('Add reminder'));
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/reminder/new',
        params: { vehicleId: vehicle.id },
      });
    });
  });

  describe('form (FR-12)', () => {
    const saved = () => [...mockRepo.rows.values()];

    it('a new reminder starts as a general service one interval ahead (KB §5)', async () => {
      await renderScreen(<AddReminderScreen vehicleId={vehicle.id} />);
      // Scooter general service: 3,000 km / 3 months from 12,400 km.
      expect(screen.getByLabelText('Due at odometer').props.value).toBe('15,400');
      expect(screen.getByLabelText('Every (months)').props.value).toBe('3');

      await fireEvent.press(screen.getByText('Save'));

      await waitFor(() => expect(router.back).toHaveBeenCalled());
      expect(saved()[0]).toMatchObject({
        typeKey: 'general_service',
        dueOdometerM: 15_400_000,
        dueDate: '2027-01-28',
        repeatMonths: 3,
        repeatDistanceM: 3_000_000,
        leadDays: 7,
        leadDistanceM: 300_000,
      });
    });

    it('choosing a preset applies its suggested interval', async () => {
      await renderScreen(<AddReminderScreen vehicleId={vehicle.id} />);
      await fireEvent.press(screen.getByText('CVT belt'));
      expect(screen.getByLabelText('Due at odometer').props.value).toBe('32,400');
      expect(screen.getByLabelText('Every (months)').props.value).toBe('');
    });

    it('documents use region names; a licence is person-level and date only', async () => {
      await renderScreen(<AddReminderScreen vehicleId={vehicle.id} />);
      await fireEvent.press(screen.getByLabelText('Document'));
      expect(screen.getByText('PUC')).toBeTruthy();
      expect(screen.getByText('RC renewal')).toBeTruthy();

      await fireEvent.press(screen.getByText('Driving licence'));
      expect(screen.queryByLabelText('Due at odometer')).toBeNull();
      await fireEvent.press(screen.getByText('Save'));

      await waitFor(() => expect(saved()).toHaveLength(1));
      expect(saved()[0]).toMatchObject({
        vehicleId: null,
        typeKey: 'licence',
        dueDate: '2026-10-28',
        repeatMonths: 12,
      });
    });

    it('Other needs a name; no due at all is explained', async () => {
      await renderScreen(<AddReminderScreen vehicleId={vehicle.id} />);
      await fireEvent.press(screen.getByLabelText('Other'));
      await fireEvent(screen.getByLabelText('By date'), 'valueChange', false);
      await fireEvent.press(screen.getByText('Save'));

      expect(await screen.findByText('Required')).toBeTruthy();
      expect(screen.getByText('Set a date, an odometer reading, or both')).toBeTruthy();
      expect(saved()).toHaveLength(0);
    });
  });
});

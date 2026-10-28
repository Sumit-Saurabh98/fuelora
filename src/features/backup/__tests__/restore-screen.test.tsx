/// <reference types="node" />
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { FixedClock } from '@/domain/clock';
import type { IdGenerator } from '@/domain/id-generator';
import { InMemoryBackupFiles } from '@/platform/backup-files';
import { InMemoryDeviceState } from '@/platform/device-state';
import { InMemoryBackupRepository } from '@/repositories/in-memory-backup.repository';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { InMemoryVehicleRepository } from '@/repositories/in-memory-vehicle.repository';
import { BackupService } from '@/services/backup.service';
import { OnboardingService } from '@/services/onboarding.service';
import { SettingsService } from '@/services/settings.service';
import { VehicleService } from '@/services/vehicle.service';
import { i18n } from '@/i18n/i18n';
import { renderScreen } from '@/testing/render-screen';

import { useOnboarding } from '../../onboarding/onboarding.store';
import { usePreferences } from '../../settings/preferences.store';
import { RestoreScreen } from '../components/restore-screen';

const v1 = readFileSync(
  path.join(__dirname, '..', '..', '..', 'services', '__tests__', 'fixtures', 'backup-v1.fuelora'),
  'utf8',
);

const mockClock = new FixedClock(new Date('2026-10-28T10:00:00.000Z'));
const ids: IdGenerator = { next: () => 'x' };
const mockBackupRepo = new InMemoryBackupRepository();
const mockPicked = new InMemoryBackupFiles();
const mockSettingsRepo = new InMemorySettingsRepository();
const mockSettings = new SettingsService(mockSettingsRepo, mockClock);
const mockVehicles = new VehicleService(
  new InMemoryVehicleRepository(),
  mockSettings,
  mockClock,
  ids,
);
const mockOnboarding = new OnboardingService(mockSettings, mockVehicles);
const mockBackups = new BackupService(
  mockBackupRepo,
  { share: async () => {} },
  mockPicked,
  new InMemoryDeviceState(),
  mockClock,
  '0.1.0',
);
const mockPermission = { state: 'undetermined' as 'granted' | 'denied' | 'undetermined', asked: 0 };
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('@/container', () => ({
  getContainer: () => ({
    clock: mockClock,
    backupService: mockBackups,
    settingsService: mockSettings,
    onboardingService: mockOnboarding,
    reminderNotifications: {
      ensurePermission: async () => {
        mockPermission.asked += 1;
        mockPermission.state = 'denied';
        return mockPermission.state;
      },
    },
  }),
}));

describe('RestoreScreen (FR-17, FR-24)', () => {
  beforeEach(() => {
    jest.spyOn(Localization, 'getLocales').mockReturnValue([
      {
        languageTag: 'en-IN',
        regionCode: 'IN',
        currencyCode: 'INR',
      } as unknown as Localization.Locale,
    ]);
    usePreferences.setState({ region: 'IN', language: 'en', unitOverrides: {} });
    mockBackupRepo.data = { vehicles: [], fillUps: [], services: [], reminders: [], settings: [] };
    mockPicked.safety.clear();
    mockPermission.asked = 0;
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await i18n.changeLanguage('en');
  });

  it('choose → summary → confirm → safety copy, replaced, settings reloaded, permission asked', async () => {
    mockPicked.next = { name: 'fuelora-backup-2026-10-28.fuelora', text: v1 };
    await renderScreen(<RestoreScreen />);

    await fireEvent.press(screen.getByText('Choose backup file'));

    expect(await screen.findByText('Backup from 28 Oct 2026')).toBeTruthy();
    expect(screen.getByText('Vehicles: 1')).toBeTruthy();
    expect(screen.getByText('Fill-ups: 2')).toBeTruthy();
    expect(screen.getByText('Active reminders: 2')).toBeTruthy();
    expect(screen.getByText('Entries from 1 Oct 2026 to 20 Oct 2026')).toBeTruthy();
    expect(mockBackupRepo.data.vehicles).toEqual([]); // nothing changed yet

    await fireEvent.press(screen.getByText('Replace all data'));
    expect(screen.getByText('Replace all data?')).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Replace all data').at(-1)!);

    expect(await screen.findByText('Restored')).toBeTruthy();
    expect(mockPicked.safety.size).toBe(1);
    expect(mockBackupRepo.data.vehicles.map((v) => v.name)).toEqual(['My Activa']);
    expect(mockPermission.asked).toBe(1);
    expect(
      screen.getByText('Notifications are off, so reminders will only show in the app.'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Go to Home'));
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('a wrong file changes nothing and says so', async () => {
    mockPicked.next = { name: 'photo.jpg', text: 'not json' };
    await renderScreen(<RestoreScreen />);
    await fireEvent.press(screen.getByText('Choose backup file'));
    expect(
      await screen.findByText(
        "That file isn't a Fuelora backup, or it's damaged. Nothing was changed.",
      ),
    ).toBeTruthy();
  });

  it('opened from another app with a file, it goes straight to the summary (FR-23)', async () => {
    mockPicked.files.set('content://whatsapp/backup.fuelora', v1);
    await renderScreen(<RestoreScreen uri="content://whatsapp/backup.fuelora" />);
    await waitFor(() => expect(screen.getByText('Vehicles: 1')).toBeTruthy());
  });

  it('cancel in the confirm dialog keeps everything', async () => {
    mockPicked.next = { name: 'b.fuelora', text: v1 };
    await renderScreen(<RestoreScreen />);
    await fireEvent.press(screen.getByText('Choose backup file'));
    await fireEvent.press(await screen.findByText('Replace all data'));
    await fireEvent.press(screen.getByText('Cancel'));
    expect(mockBackupRepo.data.vehicles).toEqual([]);
    expect(useOnboarding.getState()).toBeDefined();
  });
});

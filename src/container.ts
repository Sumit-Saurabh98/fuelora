// Composition root: the only place that picks concrete implementations (AGENTS.md code style).
import Constants from 'expo-constants';

import { getDatabase } from '@/db/client';
import type { Clock } from '@/domain/clock';
import { currentOdometerM } from '@/domain/vehicle-stats';
import { UuidV7Generator, type IdGenerator, type RandomSource } from '@/domain/id-generator';
import { DrizzleFillUpRepository } from '@/repositories/drizzle-fill-up.repository';
import { DrizzleReminderRepository } from '@/repositories/drizzle-reminder.repository';
import { DrizzleServiceLogRepository } from '@/repositories/drizzle-service-log.repository';
import { DrizzleSettingsRepository } from '@/repositories/drizzle-settings.repository';
import { DrizzleVehicleRepository } from '@/repositories/drizzle-vehicle.repository';
import { FillUpService } from '@/services/fill-up.service';
import { OnboardingService } from '@/services/onboarding.service';
import { ExpoBackupFiles } from '@/platform/expo-backup-files';
import { ExpoShareFiles } from '@/platform/expo-share-files';
import { MmkvDeviceState } from '@/platform/mmkv-device-state';
import { DrizzleBackupRepository } from '@/repositories/drizzle-backup.repository';
import { BackupService } from '@/services/backup.service';
import { ExpoNotificationGateway } from '@/notifications/expo-notification-gateway';
import { NotificationScheduler } from '@/notifications/notification-scheduler';
import { ReminderNotificationService } from '@/services/reminder-notification.service';
import { ReminderService } from '@/services/reminder.service';
import { ServiceLogService } from '@/services/service-log.service';
import { SettingsService } from '@/services/settings.service';
import { VehicleService } from '@/services/vehicle.service';

const systemClock: Clock = { now: () => new Date() };

type CryptoLike = { getRandomValues?: (bytes: Uint8Array) => Uint8Array };

// Hermes has no built-in crypto.getRandomValues. IDs only need to be unique on this device
// (behind a ms timestamp + counter), so Math.random is an acceptable fallback; swap in
// expo-crypto here if IDs ever need to be unguessable.
const randomSource: RandomSource = (bytes) => {
  const crypto = (globalThis as { crypto?: CryptoLike }).crypto;
  if (crypto?.getRandomValues) {
    crypto.getRandomValues(bytes);
    return;
  }
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
};

export type Container = {
  clock: Clock;
  idGenerator: IdGenerator;
  settingsService: SettingsService;
  vehicleService: VehicleService;
  fillUpService: FillUpService;
  serviceLogService: ServiceLogService;
  reminderService: ReminderService;
  reminderNotifications: ReminderNotificationService;
  notificationGateway: ExpoNotificationGateway;
  backupService: BackupService;
  onboardingService: OnboardingService;
};

let container: Container | null = null;

// Built on first use, after startup has run migrations.
export function getContainer(): Container {
  if (container) return container;
  const { db } = getDatabase();
  const idGenerator = new UuidV7Generator(systemClock, randomSource);
  const settingsService = new SettingsService(new DrizzleSettingsRepository(db), systemClock);
  // The two services know each other: fill-ups need their vehicle, vehicle edits check logged
  // fill-ups (KB #24). The history port is resolved lazily so neither constructs the other.
  const vehicleService: VehicleService = new VehicleService(
    new DrizzleVehicleRepository(db),
    settingsService,
    systemClock,
    idGenerator,
    {
      firstOdometerM: (vehicleId): Promise<number | null> =>
        fillUpService.firstOdometerM(vehicleId),
    },
  );
  const fillUpService: FillUpService = new FillUpService(
    new DrizzleFillUpRepository(db),
    vehicleService,
    systemClock,
    idGenerator,
  );
  // Current odometer for reminders (LLD §5.1); lazy for the same reason as the history port.
  const reminderService: ReminderService = new ReminderService(
    new DrizzleReminderRepository(db),
    vehicleService,
    {
      currentOdometerM: async (vehicleId): Promise<number | null> => {
        const vehicle = await vehicleService.get(vehicleId);
        if (!vehicle) return null;
        const [fills, logged] = await Promise.all([
          fillUpService.listByVehicle(vehicleId),
          serviceLogService.listByVehicle(vehicleId),
        ]);
        return currentOdometerM([...fills, ...logged], vehicle.initialOdometerM);
      },
    },
    systemClock,
    idGenerator,
  );
  const serviceLogService: ServiceLogService = new ServiceLogService(
    new DrizzleServiceLogRepository(db),
    vehicleService,
    systemClock,
    idGenerator,
    reminderService,
  );
  const notificationGateway = new ExpoNotificationGateway();
  container = {
    clock: systemClock,
    idGenerator,
    settingsService,
    vehicleService,
    fillUpService,
    serviceLogService,
    reminderService,
    reminderNotifications: new ReminderNotificationService(
      reminderService,
      vehicleService,
      fillUpService,
      serviceLogService,
      new NotificationScheduler(notificationGateway),
      systemClock,
      settingsService,
    ),
    notificationGateway,
    backupService: new BackupService(
      new DrizzleBackupRepository(db),
      new ExpoShareFiles(),
      new ExpoBackupFiles(),
      new MmkvDeviceState(),
      systemClock,
      Constants.expoConfig?.version ?? '0.0.0',
    ),
    onboardingService: new OnboardingService(settingsService, vehicleService),
  };
  return container;
}

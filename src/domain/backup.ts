import { z } from 'zod';

import { CURRENT_BACKUP_VERSION, migrateBackupData } from './backup-migrations';
import { ENTRY_MODES, type FillUp } from './fill-up';
import { isServiceTypeKey } from './presets';
import { isDocumentKey, REMINDER_KINDS, REMINDER_STATUSES, type Reminder } from './reminder';
import type { ServiceEntry } from './service-entry';
import { FUEL_TYPES, VEHICLE_TYPES, type Vehicle } from './vehicle';

// The backup file (LLD §7, F-13, FR-16/22): canonical values only, so it restores on any phone,
// Android or iOS. Parsing is strict: a file that doesn't validate is refused, never half-loaded.

export type SettingRow = { key: string; value: string; updatedAt: string };

export type BackupData = {
  vehicles: Vehicle[];
  fillUps: FillUp[];
  services: ServiceEntry[];
  reminders: Reminder[];
  settings: SettingRow[];
};

export type BackupFile = {
  app: 'fuelora';
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  data: BackupData & { odometerReadings: never[] };
};

const int = z.number().int();
const nullableInt = int.nullable();
const iso = z.string().min(1);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const id = z.string().min(1);

const vehicleSchema = z.strictObject({
  id,
  name: z.string().min(1),
  type: z.enum(VEHICLE_TYPES),
  fuelType: z.enum(FUEL_TYPES),
  make: z.string().nullable(),
  model: z.string().nullable(),
  year: nullableInt,
  plate: z.string().nullable(),
  initialOdometerM: int.min(0),
  tankCapacityBase: nullableInt,
  isArchived: z.boolean(),
  sortOrder: int,
  createdAt: iso,
  updatedAt: iso,
});

const fillUpSchema = z.strictObject({
  id,
  vehicleId: id,
  filledAt: iso,
  localDate: day,
  odometerM: int.min(0),
  quantityBase: int.positive(),
  totalMinor: int.min(0),
  currency: z.string().regex(/^[A-Z]{3}$/),
  isFull: z.boolean(),
  missedPrevious: z.boolean(),
  entryMode: z.enum(ENTRY_MODES),
  station: z.string().nullable(),
  note: z.string().nullable(),
  createdAt: iso,
  updatedAt: iso,
});

const serviceSchema = z.strictObject({
  id,
  vehicleId: id,
  servicedDate: day,
  odometerM: nullableInt,
  typeKey: z.string().refine(isServiceTypeKey),
  title: z.string().nullable(),
  costMinor: nullableInt,
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
  note: z.string().nullable(),
  createdAt: iso,
  updatedAt: iso,
});

const reminderSchema = z
  .strictObject({
    id,
    vehicleId: id.nullable(),
    kind: z.enum(REMINDER_KINDS),
    typeKey: z.string().refine((k) => isServiceTypeKey(k) || isDocumentKey(k)),
    title: z.string().nullable(),
    dueDate: day.nullable(),
    dueOdometerM: nullableInt,
    repeatMonths: nullableInt,
    repeatDistanceM: nullableInt,
    leadDays: int.min(0),
    leadDistanceM: int.min(0),
    status: z.enum(REMINDER_STATUSES),
    lastDoneDate: day.nullable(),
    lastDoneOdometerM: nullableInt,
    createdAt: iso,
    updatedAt: iso,
  })
  // Same rule as the table's CHECK (LLD §2).
  .refine((r) => r.dueDate !== null || r.dueOdometerM !== null);

const settingSchema = z.strictObject({ key: z.string().min(1), value: z.string(), updatedAt: iso });

const dataSchema = z.object({
  vehicles: z.array(vehicleSchema),
  fillUps: z.array(fillUpSchema),
  services: z.array(serviceSchema),
  reminders: z.array(reminderSchema),
  // Reserved in LLD §7 for manual readings; always empty until that table exists.
  odometerReadings: z.array(z.unknown()).max(0).optional(),
  settings: z.array(settingSchema),
});

const envelopeSchema = z.object({
  app: z.literal('fuelora'),
  schemaVersion: int.min(1),
  exportedAt: iso,
  appVersion: z.string(),
  data: z.record(z.string(), z.unknown()),
});

export function buildBackup(
  data: BackupData,
  meta: { exportedAt: string; appVersion: string },
): BackupFile {
  return {
    app: 'fuelora',
    schemaVersion: CURRENT_BACKUP_VERSION,
    exportedAt: meta.exportedAt,
    appVersion: meta.appVersion,
    data: { ...data, odometerReadings: [] },
  };
}

export type BackupProblem = 'not_a_backup' | 'newer_version' | 'invalid';

export type BackupParse =
  | { ok: true; data: BackupData; exportedAt: string; schemaVersion: number }
  | { ok: false; problem: BackupProblem };

/**
 * Reads a backup file's text: any version ever shipped is migrated to the current one; a newer
 * one (from a later app) is refused rather than guessed at. Checks every row and that every
 * fill-up, service and reminder points at a vehicle in the same file.
 */
export function parseBackup(text: string): BackupParse {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'not_a_backup' };
  }
  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) return { ok: false, problem: 'not_a_backup' };
  const { schemaVersion } = envelope.data;
  if (schemaVersion > CURRENT_BACKUP_VERSION) return { ok: false, problem: 'newer_version' };

  let migrated: Record<string, unknown>;
  try {
    migrated = migrateBackupData(schemaVersion, envelope.data.data);
  } catch {
    return { ok: false, problem: 'invalid' };
  }
  const parsed = dataSchema.safeParse(migrated);
  if (!parsed.success) return { ok: false, problem: 'invalid' };
  const data: BackupData = {
    vehicles: parsed.data.vehicles,
    fillUps: parsed.data.fillUps,
    services: parsed.data.services as ServiceEntry[],
    reminders: parsed.data.reminders as Reminder[],
    settings: parsed.data.settings,
  };
  if (!isConsistent(data)) return { ok: false, problem: 'invalid' };
  return { ok: true, data, exportedAt: envelope.data.exportedAt, schemaVersion };
}

function isConsistent(data: BackupData): boolean {
  const vehicleIds = new Set(data.vehicles.map((v) => v.id));
  if (vehicleIds.size !== data.vehicles.length) return false;
  const unique = (rows: { id: string }[]) => new Set(rows.map((r) => r.id)).size === rows.length;
  if (!unique(data.fillUps) || !unique(data.services) || !unique(data.reminders)) return false;
  if (!data.fillUps.every((f) => vehicleIds.has(f.vehicleId))) return false;
  if (!data.services.every((s) => vehicleIds.has(s.vehicleId))) return false;
  if (!data.reminders.every((r) => r.vehicleId === null || vehicleIds.has(r.vehicleId)))
    return false;
  // The table allows one reading per odometer value per vehicle.
  const readings = new Set(data.fillUps.map((f) => `${f.vehicleId}:${f.odometerM}`));
  return readings.size === data.fillUps.length;
}

export type BackupSummary = {
  vehicles: number;
  fillUps: number;
  services: number;
  reminders: number;
  /** First and last entry day (YYYY-MM-DD); null when there are no entries. */
  from: string | null;
  to: string | null;
};

/** FR-17: what a restore would bring in, shown before anything is replaced. */
export function summarizeBackup(data: BackupData): BackupSummary {
  const days = [
    ...data.fillUps.map((f) => f.localDate),
    ...data.services.map((s) => s.servicedDate),
  ].sort();
  return {
    vehicles: data.vehicles.length,
    fillUps: data.fillUps.length,
    services: data.services.length,
    reminders: data.reminders.filter((r) => r.status === 'active').length,
    from: days[0] ?? null,
    to: days.at(-1) ?? null,
  };
}

/** `fuelora-safety-2026-10-28T10-00-00.fuelora`: sorts by time, safe in every file system. */
export function safetyFileName(instant: Date): string {
  return `fuelora-safety-${instant.toISOString().slice(0, 19).replace(/:/g, '-')}.fuelora`;
}

/** `fuelora-backup-2026-10-28.fuelora` (LLD §7). */
export function backupFileName(today: string): string {
  return `fuelora-backup-${today}.fuelora`;
}

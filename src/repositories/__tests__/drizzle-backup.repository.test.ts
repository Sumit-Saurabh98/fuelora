/// <reference types="node" />
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { createTestDatabase } from '@/db/testing/node-drizzle';
import { parseBackup, type BackupData } from '@/domain/backup';

import { DrizzleBackupRepository } from '../drizzle-backup.repository';

const fixture = (): BackupData => {
  const parsed = parseBackup(
    readFileSync(
      path.join(__dirname, '..', '..', 'services', '__tests__', 'fixtures', 'backup-v1.fuelora'),
      'utf8',
    ),
  );
  if (!parsed.ok) throw new Error('fixture must parse');
  return parsed.data;
};

// Row order is the repository's own (by vehicle, odometer, key…); compare as sets of rows.
const byId = <T extends { id?: string; key?: string }>(rows: T[]) =>
  [...rows].sort((a, b) => (a.id ?? a.key ?? '').localeCompare(b.id ?? b.key ?? ''));
const normalized = (d: BackupData) => ({
  vehicles: byId(d.vehicles),
  fillUps: byId(d.fillUps),
  services: byId(d.services),
  reminders: byId(d.reminders),
  settings: byId(d.settings),
});

describe('DrizzleBackupRepository', () => {
  it('replaceAll then readAll gives back exactly the data (FR-22)', async () => {
    const repo = new DrizzleBackupRepository(createTestDatabase().db);
    await repo.replaceAll(fixture());
    expect(normalized(await repo.readAll())).toEqual(normalized(fixture()));
  });

  it('replaces what was there before', async () => {
    const repo = new DrizzleBackupRepository(createTestDatabase().db);
    await repo.replaceAll(fixture());
    const empty: BackupData = {
      vehicles: [],
      fillUps: [],
      services: [],
      reminders: [],
      settings: [],
    };
    await repo.replaceAll(empty);
    expect(await repo.readAll()).toEqual(empty);
  });

  it('all or nothing: a failing row leaves the old data untouched', async () => {
    const { db, sqlite } = createTestDatabase();
    const repo = new DrizzleBackupRepository(db);
    await repo.replaceAll(fixture());
    const broken = fixture();
    // Same odometer twice breaks the unique index halfway through the inserts.
    broken.fillUps[1] = { ...broken.fillUps[1]!, odometerM: broken.fillUps[0]!.odometerM };

    await expect(repo.replaceAll(broken)).rejects.toThrow();

    expect(normalized(await repo.readAll())).toEqual(normalized(fixture()));
    // And the connection is usable again (no transaction left open).
    expect(() => sqlite.exec('BEGIN; COMMIT;')).not.toThrow();
  });
});

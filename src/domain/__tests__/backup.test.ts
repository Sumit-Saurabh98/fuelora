/// <reference types="node" />
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  backupFileName,
  backupStatus,
  buildBackup,
  parseBackup,
  shouldNudgeBackup,
  summarizeBackup,
} from '../backup';
import { CURRENT_BACKUP_VERSION } from '../backup-migrations';

// AGENTS.md: one fixture per schemaVersion ever shipped; every one must keep importing.
const FIXTURES = path.join(__dirname, '..', '..', 'services', '__tests__', 'fixtures');
const fixture = (version: number) =>
  readFileSync(path.join(FIXTURES, `backup-v${version}.fuelora`), 'utf8');

describe('backup file (LLD §7)', () => {
  it.each(Array.from({ length: CURRENT_BACKUP_VERSION }, (_, i) => i + 1))(
    'imports the v%i fixture',
    (version) => {
      const parsed = parseBackup(fixture(version));
      expect(parsed).toMatchObject({ ok: true, schemaVersion: version });
    },
  );

  it('round-trips: what is exported parses back identical', () => {
    const parsed = parseBackup(fixture(1));
    if (!parsed.ok) throw new Error('fixture must parse');
    const file = buildBackup(parsed.data, {
      exportedAt: '2026-10-29T10:00:00.000Z',
      appVersion: '0.2.0',
    });
    const again = parseBackup(JSON.stringify(file));
    expect(again).toEqual({
      ok: true,
      data: parsed.data,
      exportedAt: '2026-10-29T10:00:00.000Z',
      schemaVersion: 1,
    });
  });

  it('summarizes what a restore brings in (FR-17)', () => {
    const parsed = parseBackup(fixture(1));
    if (!parsed.ok) throw new Error('fixture must parse');
    expect(summarizeBackup(parsed.data)).toEqual({
      vehicles: 1,
      fillUps: 2,
      services: 1,
      reminders: 2,
      from: '2026-10-01',
      to: '2026-10-20',
    });
  });

  it('refuses what is not a Fuelora backup', () => {
    expect(parseBackup('not json')).toEqual({ ok: false, problem: 'not_a_backup' });
    expect(parseBackup('{"app":"other","schemaVersion":1}')).toEqual({
      ok: false,
      problem: 'not_a_backup',
    });
  });

  it('refuses a backup from a newer app instead of guessing', () => {
    const newer = JSON.parse(fixture(1)) as { schemaVersion: number };
    newer.schemaVersion = CURRENT_BACKUP_VERSION + 1;
    expect(parseBackup(JSON.stringify(newer))).toEqual({ ok: false, problem: 'newer_version' });
  });

  // Fixture rows as plain records, so a test can break any field.
  type Rows = Record<string, Record<string, unknown>[]>;
  const first = (d: Rows, table: string, i = 0) => d[table]![i]!;

  it.each<[string, (d: Rows) => void]>([
    ['a float in a canonical integer', (d) => (first(d, 'fillUps').quantityBase = 5.5)],
    ['an unknown fuel', (d) => (first(d, 'vehicles').fuelType = 'hydrogen')],
    ['a fill-up for a missing vehicle', (d) => (first(d, 'fillUps').vehicleId = 'nope')],
    [
      'two readings at one odometer',
      (d) => (first(d, 'fillUps', 1).odometerM = first(d, 'fillUps').odometerM),
    ],
    [
      'a reminder with no due',
      (d) => Object.assign(first(d, 'reminders'), { dueDate: null, dueOdometerM: null }),
    ],
    ['an unexpected field', (d) => (first(d, 'vehicles').colour = 'red')],
  ])('refuses %s, never half-loads', (_, change) => {
    const file = JSON.parse(fixture(1)) as { data: Rows };
    change(file.data);
    expect(parseBackup(JSON.stringify(file))).toEqual({ ok: false, problem: 'invalid' });
  });

  it('file name', () => {
    expect(backupFileName('2026-10-28')).toBe('fuelora-backup-2026-10-28.fuelora');
  });
});

describe('backupStatus (FR-26)', () => {
  const now = new Date('2026-10-28T10:00:00.000Z');
  it('days since the last export; warns after 30 days only when there is data', () => {
    expect(backupStatus('2026-10-27T09:00:00.000Z', now, true)).toEqual({
      daysAgo: 1,
      warn: false,
    });
    expect(backupStatus('2026-09-28T10:00:00.000Z', now, true)).toEqual({
      daysAgo: 30,
      warn: false,
    });
    expect(backupStatus('2026-09-27T10:00:00.000Z', now, true)).toEqual({
      daysAgo: 31,
      warn: true,
    });
    expect(backupStatus('2026-09-01T10:00:00.000Z', now, false)).toEqual({
      daysAgo: 57,
      warn: false,
    });
  });

  it('never backed up warns once there are entries', () => {
    expect(backupStatus(null, now, true)).toEqual({ daysAgo: null, warn: true });
    expect(backupStatus(null, now, false)).toEqual({ daysAgo: null, warn: false });
  });
});

describe('shouldNudgeBackup (FR-27)', () => {
  const now = new Date('2026-10-28T10:00:00.000Z');
  const base = { lastExportAt: null, lastNudgeAt: null, entries: 0, entriesSinceExport: 0, now };

  it('never backed up: after 5 entries', () => {
    expect(shouldNudgeBackup({ ...base, entries: 4, entriesSinceExport: 4 })).toBe(false);
    expect(shouldNudgeBackup({ ...base, entries: 5, entriesSinceExport: 5 })).toBe(true);
  });

  it('a recent backup: only after 20 new entries', () => {
    const recent = { ...base, lastExportAt: '2026-10-20T10:00:00.000Z', entries: 40 };
    expect(shouldNudgeBackup({ ...recent, entriesSinceExport: 19 })).toBe(false);
    expect(shouldNudgeBackup({ ...recent, entriesSinceExport: 20 })).toBe(true);
  });

  it('an old backup with a few entries', () => {
    expect(
      shouldNudgeBackup({
        ...base,
        lastExportAt: '2026-09-20T10:00:00.000Z',
        entries: 6,
        entriesSinceExport: 1,
      }),
    ).toBe(true);
  });

  it('at most once per 7 days', () => {
    const due = { ...base, entries: 30, entriesSinceExport: 30 };
    expect(shouldNudgeBackup({ ...due, lastNudgeAt: '2026-10-25T10:00:00.000Z' })).toBe(false);
    expect(shouldNudgeBackup({ ...due, lastNudgeAt: '2026-10-21T10:00:00.000Z' })).toBe(true);
  });
});

/// <reference types="node" />
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { parseBackup } from '@/domain/backup';
import { FixedClock } from '@/domain/clock';
import { InMemoryBackupFiles } from '@/platform/backup-files';
import { InMemoryDeviceState } from '@/platform/device-state';
import type { ShareFiles } from '@/platform/share-files';
import { InMemoryBackupRepository } from '@/repositories/in-memory-backup.repository';

import { BackupService } from '../backup.service';

const NOW = new Date('2026-10-28T10:00:00.000Z');

function setup() {
  const shared: { fileName: string; text: string; mimeType: string }[] = [];
  const files: ShareFiles = {
    share: async (fileName, text, kind) =>
      void shared.push({ fileName, text, mimeType: kind.mimeType }),
  };
  const repo = new InMemoryBackupRepository();
  const device = new InMemoryDeviceState();
  const picked = new InMemoryBackupFiles();
  const service = new BackupService(repo, files, picked, device, new FixedClock(NOW), '0.1.0');
  return { service, repo, device, shared, picked };
}

describe('BackupService export (F-13)', () => {
  it('shares a .fuelora JSON file that parses back, and remembers when', async () => {
    const { service, repo, shared } = setup();
    repo.data.settings = [{ key: 'region', value: 'IN', updatedAt: NOW.toISOString() }];
    expect(service.lastExportAt()).toBeNull();

    await service.exportBackup('Save');

    expect(shared).toHaveLength(1);
    expect(shared[0]).toMatchObject({
      fileName: 'fuelora-backup-2026-10-28.fuelora',
      mimeType: 'application/json',
    });
    const parsed = parseBackup(shared[0]!.text);
    expect(parsed).toMatchObject({ ok: true, exportedAt: NOW.toISOString(), schemaVersion: 1 });
    expect(service.lastExportAt()).toBe(NOW.toISOString());
  });

  it('a failed share does not count as a backup', async () => {
    const { repo, device, picked } = setup();
    const failing = new BackupService(
      repo,
      { share: async () => Promise.reject(new Error('no space')) },
      picked,
      device,
      new FixedClock(NOW),
      '0.1.0',
    );
    await expect(failing.exportBackup('Save')).rejects.toThrow();
    expect(failing.lastExportAt()).toBeNull();
  });

  it('CSV goes out as text/csv', async () => {
    const { service, shared } = setup();
    await service.exportCsv('a.csv', 'x', 'Save');
    expect(shared[0]?.mimeType).toBe('text/csv');
  });
});

const v1 = () => readFileSync(path.join(__dirname, 'fixtures', 'backup-v1.fuelora'), 'utf8');

describe('BackupService restore (FR-17)', () => {
  it('reads and summarizes a picked file without changing anything', async () => {
    const { service, repo, picked } = setup();
    picked.next = { name: 'fuelora-backup-2026-10-28.fuelora', text: v1() };
    const candidate = await service.pickBackup();
    expect(candidate?.summary).toMatchObject({
      vehicles: 1,
      fillUps: 2,
      services: 1,
      reminders: 2,
    });
    expect(repo.data.vehicles).toEqual([]);
  });

  it('cancelled picker → nothing', async () => {
    const { service } = setup();
    expect(await service.pickBackup()).toBeNull();
  });

  it('a wrong or newer file is refused with a clear code', async () => {
    const { service, picked } = setup();
    picked.next = { name: 'photo.jpg', text: 'not json' };
    await expect(service.pickBackup()).rejects.toMatchObject({ code: 'BACKUP_INVALID_FILE' });
    const newer = JSON.parse(v1()) as { schemaVersion: number };
    newer.schemaVersion = 99;
    picked.next = { name: 'new.fuelora', text: JSON.stringify(newer) };
    await expect(service.pickBackup()).rejects.toMatchObject({ code: 'BACKUP_NEWER_VERSION' });
  });

  it('saves the current data as a safety copy, then replaces everything', async () => {
    const { service, repo, picked } = setup();
    repo.data.settings = [{ key: 'region', value: 'GB', updatedAt: NOW.toISOString() }];
    picked.next = { name: 'b.fuelora', text: v1() };
    const candidate = (await service.pickBackup())!;

    const safety = await service.restore(candidate);

    expect(safety).toBe('fuelora-safety-2026-10-28T10-00-00.fuelora');
    const saved = parseBackup(picked.safety.get(safety)!);
    expect(saved.ok && saved.data.settings).toEqual([
      { key: 'region', value: 'GB', updatedAt: NOW.toISOString() },
    ]);
    expect(repo.data.vehicles.map((v) => v.name)).toEqual(['My Activa']);
  });

  it('no safety copy, no restore (AGENTS.md rule 12)', async () => {
    const { service, repo, picked } = setup();
    repo.data.settings = [{ key: 'region', value: 'GB', updatedAt: NOW.toISOString() }];
    picked.next = { name: 'b.fuelora', text: v1() };
    const candidate = (await service.pickBackup())!;
    picked.failSafety = true;

    await expect(service.restore(candidate)).rejects.toThrow();
    expect(repo.data.vehicles).toEqual([]);
    expect(repo.data.settings[0]?.value).toBe('GB');
  });

  it('a failed replace leaves the data as it was', async () => {
    const { service, repo, picked } = setup();
    picked.next = { name: 'b.fuelora', text: v1() };
    const candidate = (await service.pickBackup())!;
    repo.failNextReplace = true;
    await expect(service.restore(candidate)).rejects.toThrow();
    expect(repo.data.vehicles).toEqual([]);
  });
});

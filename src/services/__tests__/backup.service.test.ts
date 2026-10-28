import { parseBackup } from '@/domain/backup';
import { FixedClock } from '@/domain/clock';
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
  const service = new BackupService(repo, files, device, new FixedClock(NOW), '0.1.0');
  return { service, repo, device, shared };
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
    const { repo, device } = setup();
    const failing = new BackupService(
      repo,
      { share: async () => Promise.reject(new Error('no space')) },
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

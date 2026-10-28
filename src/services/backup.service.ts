import { backupFileName, buildBackup } from '@/domain/backup';
import type { Clock } from '@/domain/clock';
import { localDateOf } from '@/domain/fill-up';
import { DEVICE_KEYS, type DeviceState } from '@/platform/device-state';
import { SHARE_KINDS, type ShareFiles } from '@/platform/share-files';
import type { BackupRepository } from '@/repositories/backup.repository';

/** Manual backup (F-13, LLD §4.4): export now; restore arrives in 16.3. */
export class BackupService {
  constructor(
    private readonly backups: BackupRepository,
    private readonly files: ShareFiles,
    private readonly device: DeviceState,
    private readonly clock: Clock,
    private readonly appVersion: string,
  ) {}

  /** Builds the backup file and opens the share sheet; remembers when (FR-26). */
  async exportBackup(dialogTitle: string): Promise<void> {
    const now = this.clock.now();
    const file = buildBackup(await this.backups.readAll(), {
      exportedAt: now.toISOString(),
      appVersion: this.appVersion,
    });
    await this.files.share(
      backupFileName(localDateOf(now)),
      JSON.stringify(file),
      SHARE_KINDS.backup,
      dialogTitle,
    );
    this.device.setString(DEVICE_KEYS.lastExportAt, now.toISOString());
  }

  /** A spreadsheet-friendly copy of one vehicle (FR-18); not importable. */
  async exportCsv(fileName: string, csv: string, dialogTitle: string): Promise<void> {
    await this.files.share(fileName, csv, SHARE_KINDS.csv, dialogTitle);
  }

  /** UTC ISO instant of the last export from this phone, or null if never. */
  lastExportAt(): string | null {
    return this.device.getString(DEVICE_KEYS.lastExportAt);
  }
}

import {
  backupFileName,
  buildBackup,
  parseBackup,
  safetyFileName,
  summarizeBackup,
  type BackupData,
  type BackupSummary,
} from '@/domain/backup';
import type { Clock } from '@/domain/clock';
import { AppError } from '@/domain/errors';
import { localDateOf } from '@/domain/fill-up';
import type { BackupFiles } from '@/platform/backup-files';
import { DEVICE_KEYS, type DeviceState } from '@/platform/device-state';
import { SHARE_KINDS, type ShareFiles } from '@/platform/share-files';
import type { BackupRepository } from '@/repositories/backup.repository';

export type RestoreCandidate = {
  data: BackupData;
  summary: BackupSummary;
  exportedAt: string;
};

/** Manual backup and restore (F-13, LLD §4.4). */
export class BackupService {
  constructor(
    private readonly backups: BackupRepository,
    private readonly files: ShareFiles,
    private readonly picked: BackupFiles,
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

  /** When the backup nudge was last put away on this phone (FR-27). */
  lastNudgeAt(): string | null {
    return this.device.getString(DEVICE_KEYS.lastBackupNudgeAt);
  }

  markNudged(): void {
    this.device.setString(DEVICE_KEYS.lastBackupNudgeAt, this.clock.now().toISOString());
  }

  /** UTC ISO instant of the last export from this phone, or null if never. */
  lastExportAt(): string | null {
    return this.device.getString(DEVICE_KEYS.lastExportAt);
  }

  /** Opens the file picker and reads the backup; null when the user cancels. */
  async pickBackup(): Promise<RestoreCandidate | null> {
    const file = await this.picked.pick();
    return file ? this.readBackup(file.uri) : null;
  }

  /**
   * Reads and validates a backup file (any shipped version) without changing anything, so the
   * user sees what it holds first (FR-17).
   */
  async readBackup(uri: string): Promise<RestoreCandidate> {
    const parsed = parseBackup(await this.picked.readText(uri));
    if (!parsed.ok) {
      throw new AppError(
        parsed.problem === 'newer_version' ? 'BACKUP_NEWER_VERSION' : 'BACKUP_INVALID_FILE',
        'Backup file cannot be restored',
      );
    }
    return {
      data: parsed.data,
      summary: summarizeBackup(parsed.data),
      exportedAt: parsed.exportedAt,
    };
  }

  /**
   * Replaces everything with the backup (FR-17), after saving the current data as a safety copy
   * on the phone (AGENTS.md rule 12). No safety copy, no restore. Returns the copy's file name.
   */
  async restore(candidate: RestoreCandidate): Promise<string> {
    const now = this.clock.now();
    const current = buildBackup(await this.backups.readAll(), {
      exportedAt: now.toISOString(),
      appVersion: this.appVersion,
    });
    const safety = await this.picked.saveSafetyCopy(safetyFileName(now), JSON.stringify(current));
    await this.backups.replaceAll(candidate.data);
    return safety;
  }
}

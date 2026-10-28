import type { BackupData } from '@/domain/backup';

import type { BackupRepository } from './backup.repository';

export class InMemoryBackupRepository implements BackupRepository {
  data: BackupData = { vehicles: [], fillUps: [], services: [], reminders: [], settings: [] };
  /** Makes the next replaceAll fail, to test that nothing changes. */
  failNextReplace = false;

  async readAll(): Promise<BackupData> {
    return structuredClone(this.data);
  }

  async replaceAll(data: BackupData): Promise<void> {
    if (this.failNextReplace) {
      this.failNextReplace = false;
      throw new Error('disk full');
    }
    this.data = structuredClone(data);
  }
}

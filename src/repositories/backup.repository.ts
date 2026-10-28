import type { BackupData } from '@/domain/backup';

// Whole-database read and replace for backup / restore (LLD §7). Its own aggregate: it is the only
// code that touches every table at once, always in one transaction.
export interface BackupRepository {
  readAll(): Promise<BackupData>;
  /** Deletes everything and inserts `data`, all or nothing (FR-17, AGENTS.md rule 12). */
  replaceAll(data: BackupData): Promise<void>;
}

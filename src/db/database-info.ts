// Minimal surface of expo-sqlite's SQLiteDatabase, so this is testable without the native module.
export type SqlReader = {
  getFirstSync<T>(source: string): T | null;
};

export type DatabaseInfo = {
  sqliteVersion: string;
  journalMode: string;
  foreignKeys: boolean;
  schemaVersion: number;
};

// Drizzle records one row per applied migration, so the count is the schema version.
function countAppliedMigrations(sqlite: SqlReader): number {
  try {
    return (
      sqlite.getFirstSync<{ n: number }>('SELECT count(*) AS n FROM __drizzle_migrations')?.n ?? 0
    );
  } catch {
    // Table doesn't exist until the first migration runs.
    return 0;
  }
}

export function readDatabaseInfo(sqlite: SqlReader): DatabaseInfo {
  const version = sqlite.getFirstSync<{ v: string }>('SELECT sqlite_version() AS v');
  const journal = sqlite.getFirstSync<{ journal_mode: string }>('PRAGMA journal_mode');
  const fk = sqlite.getFirstSync<{ foreign_keys: number }>('PRAGMA foreign_keys');
  return {
    sqliteVersion: version?.v ?? 'unknown',
    journalMode: journal?.journal_mode ?? 'unknown',
    foreignKeys: fk?.foreign_keys === 1,
    schemaVersion: countAppliedMigrations(sqlite),
  };
}

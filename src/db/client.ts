import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'fuelora.db';

export type AppDatabase = {
  sqlite: SQLiteDatabase;
  db: ExpoSQLiteDatabase;
};

let instance: AppDatabase | null = null;

// One connection for the app's lifetime; opened on first use so a failure surfaces in the UI
// instead of crashing at import time.
export function getDatabase(): AppDatabase {
  if (instance) return instance;
  // Change listener powers Drizzle useLiveQuery (screens refresh after writes).
  const sqlite = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
  // WAL: readers don't block the writer. Foreign keys are off by default in SQLite and
  // vehicle-owned rows rely on ON DELETE CASCADE.
  sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  instance = { sqlite, db: drizzle(sqlite) };
  return instance;
}

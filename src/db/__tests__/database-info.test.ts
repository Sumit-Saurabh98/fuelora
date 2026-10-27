import { readDatabaseInfo, type SqlReader } from '../database-info';

function fakeReader(rows: Record<string, unknown>): SqlReader {
  return {
    getFirstSync<T>(source: string): T | null {
      return (rows[source] ?? null) as T | null;
    },
  };
}

describe('readDatabaseInfo', () => {
  it('reports version, journal mode and foreign keys', () => {
    const info = readDatabaseInfo(
      fakeReader({
        'SELECT sqlite_version() AS v': { v: '3.49.1' },
        'PRAGMA journal_mode': { journal_mode: 'wal' },
        'PRAGMA foreign_keys': { foreign_keys: 1 },
        'SELECT count(*) AS n FROM __drizzle_migrations': { n: 1 },
      }),
    );
    expect(info).toEqual({
      sqliteVersion: '3.49.1',
      journalMode: 'wal',
      foreignKeys: true,
      schemaVersion: 1,
    });
  });

  it('falls back when a pragma returns nothing', () => {
    expect(readDatabaseInfo(fakeReader({}))).toEqual({
      sqliteVersion: 'unknown',
      journalMode: 'unknown',
      foreignKeys: false,
      schemaVersion: 0,
    });
  });

  it('reports schema version 0 before the migrations table exists', () => {
    const reader: SqlReader = {
      getFirstSync<T>(source: string): T | null {
        if (source.includes('__drizzle_migrations')) throw new Error('no such table');
        return null;
      },
    };
    expect(readDatabaseInfo(reader).schemaVersion).toBe(0);
  });
});

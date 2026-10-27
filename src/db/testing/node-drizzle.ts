/// <reference types="node" />
// Test-only: a real Drizzle database on Node's built-in SQLite with the shipped migrations
// applied, so Drizzle repositories are tested against the actual schema.
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import { applyMigrations } from './apply-migrations';

export function createTestDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');
  applyMigrations(sqlite);

  const db = drizzle(async (sql, params, method) => {
    const statement = sqlite.prepare(sql);
    const args = params as SQLInputValue[];
    if (method === 'run') {
      statement.run(...args);
      return { rows: [] };
    }
    // sqlite-proxy expects rows as value arrays in column order.
    statement.setReturnArrays(true);
    if (method === 'get') {
      const row = statement.get(...args) as unknown[] | undefined;
      return { rows: row ?? [] };
    }
    return { rows: statement.all(...args) as unknown[] };
  });

  return { sqlite, db };
}

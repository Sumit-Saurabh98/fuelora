/// <reference types="node" />
// Test-only: applies the generated migration SQL to Node's built-in SQLite, so migration tests
// exercise the exact SQL that ships, without the expo-sqlite native module.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

type Journal = { entries: { idx: number; tag: string }[] };

export function migrationTags(): string[] {
  const journal = JSON.parse(
    readFileSync(path.join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8'),
  ) as Journal;
  return [...journal.entries].sort((a, b) => a.idx - b.idx).map((e) => e.tag);
}

export function readMigrationSql(tag: string): string {
  return readFileSync(path.join(MIGRATIONS_DIR, `${tag}.sql`), 'utf8');
}

/** Applies migrations [0, count) — omit count to apply all. */
export function applyMigrations(db: DatabaseSync, count?: number): void {
  for (const tag of migrationTags().slice(0, count)) {
    for (const statement of readMigrationSql(tag).split('--> statement-breakpoint')) {
      if (statement.trim()) db.exec(statement);
    }
  }
}

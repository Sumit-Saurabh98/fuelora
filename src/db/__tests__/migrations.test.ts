/// <reference types="node" />
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { applyMigrations, migrationTags } from '../testing/apply-migrations';

type Column = { name: string; type: string; notnull: number; pk: number };

describe('migrations', () => {
  it('bundles every journal entry in migrations.js', () => {
    const bundle = readFileSync(path.join(__dirname, '..', 'migrations', 'migrations.js'), 'utf8');
    expect(migrationTags().length).toBeGreaterThan(0);
    for (const tag of migrationTags()) {
      expect(bundle).toContain(`./${tag}.sql`);
    }
  });

  it('creates the settings table on a fresh database', () => {
    const db = new DatabaseSync(':memory:');
    applyMigrations(db);

    const columns = db.prepare('PRAGMA table_info(settings)').all() as Column[];
    expect(columns.map((c) => [c.name, c.type, c.notnull, c.pk])).toEqual([
      ['key', 'TEXT', 1, 1],
      ['value', 'TEXT', 1, 0],
      ['updated_at', 'TEXT', 1, 0],
    ]);
  });

  it('stores and reads a setting', () => {
    const db = new DatabaseSync(':memory:');
    applyMigrations(db);

    db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(
      'theme',
      'dark',
      '2026-10-27T10:00:00Z',
    );
    expect(db.prepare('SELECT value FROM settings WHERE key = ?').get('theme')).toEqual({
      value: 'dark',
    });
  });
});

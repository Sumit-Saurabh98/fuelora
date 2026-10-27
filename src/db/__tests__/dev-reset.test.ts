/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';

import { APP_TABLES, resetAllData } from '../dev-reset';
import { applyMigrations } from '../testing/apply-migrations';

const NOW = '2026-10-28T10:00:00.000Z';

function seeded(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  applyMigrations(db);
  db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(
    'theme',
    'dark',
    NOW,
  );
  db.prepare(
    `INSERT INTO vehicles (id, name, type, fuel_type, created_at, updated_at)
     VALUES ('v1', 'Activa', 'scooter', 'petrol', ?, ?)`,
  ).run(NOW, NOW);
  db.prepare(
    `INSERT INTO fill_ups (id, vehicle_id, filled_at, local_date, odometer_m, quantity_base,
       total_minor, currency, entry_mode, created_at, updated_at)
     VALUES ('f1', 'v1', ?, '2026-10-28', 1000, 1950, 20000, 'INR', 'amount_only', ?, ?)`,
  ).run(NOW, NOW, NOW);
  return db;
}

const countRows = (db: DatabaseSync, table: string) =>
  (db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

describe('resetAllData (dev only)', () => {
  it('empties every app table', () => {
    const db = seeded();
    resetAllData((sql) => db.exec(sql));
    for (const table of APP_TABLES) expect(countRows(db, table)).toBe(0);
  });

  it('covers every table the migrations create, so new tables are not forgotten', () => {
    const db = seeded();
    const tables = (
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'",
        )
        .all() as { name: string }[]
    ).map((r) => r.name);
    expect([...APP_TABLES].sort()).toEqual(tables.sort());
  });
});

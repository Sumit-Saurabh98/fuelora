/// <reference types="node" />
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { applyMigrations, migrationTags } from '../testing/apply-migrations';

type Column = {
  name: string;
  type: string;
  notnull: number;
  pk: number;
  dflt_value: string | null;
};

function freshDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

function columns(db: DatabaseSync, table: string) {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as Column[]).map((c) => [
    c.name,
    c.type,
    c.notnull,
    c.pk,
  ]);
}

const NOW = '2026-10-27T10:00:00.000Z';

function insertVehicle(db: DatabaseSync, id: string) {
  db.prepare(
    `INSERT INTO vehicles (id, name, type, fuel_type, created_at, updated_at)
     VALUES (?, 'My Activa', 'scooter', 'petrol', ?, ?)`,
  ).run(id, NOW, NOW);
}

function insertFillUp(db: DatabaseSync, id: string, vehicleId: string, odometerM: number) {
  db.prepare(
    `INSERT INTO fill_ups (id, vehicle_id, filled_at, local_date, odometer_m, quantity_base,
       total_minor, currency, entry_mode, created_at, updated_at)
     VALUES (?, ?, ?, '2026-10-27', ?, 1950, 20000, 'INR', 'amount_only', ?, ?)`,
  ).run(id, vehicleId, NOW, odometerM, NOW, NOW);
}

describe('migrations', () => {
  it('bundles every journal entry in migrations.js', () => {
    const bundle = readFileSync(path.join(__dirname, '..', 'migrations', 'migrations.js'), 'utf8');
    expect(migrationTags()).toEqual(['0000_init', '0001_vehicles_fill_ups', '0002_services']);
    for (const tag of migrationTags()) {
      expect(bundle).toContain(`./${tag}.sql`);
    }
  });

  describe('0000_init', () => {
    it('creates the settings table', () => {
      const db = freshDb();
      applyMigrations(db, { to: 1 });
      expect(columns(db, 'settings')).toEqual([
        ['key', 'TEXT', 1, 1],
        ['value', 'TEXT', 1, 0],
        ['updated_at', 'TEXT', 1, 0],
      ]);
    });
  });

  describe('0001_vehicles_fill_ups', () => {
    it('creates vehicles and fill_ups as in LLD §2', () => {
      const db = freshDb();
      applyMigrations(db);

      expect(columns(db, 'vehicles').map(([name]) => name)).toEqual([
        'id',
        'name',
        'type',
        'fuel_type',
        'make',
        'model',
        'year',
        'plate',
        'initial_odometer_m',
        'tank_capacity_base',
        'is_archived',
        'sort_order',
        'created_at',
        'updated_at',
      ]);
      expect(columns(db, 'fill_ups').map(([name]) => name)).toEqual([
        'id',
        'vehicle_id',
        'filled_at',
        'local_date',
        'odometer_m',
        'quantity_base',
        'total_minor',
        'currency',
        'is_full',
        'missed_previous',
        'entry_mode',
        'station',
        'note',
        'created_at',
        'updated_at',
      ]);
    });

    it('keeps existing settings when a v1 database is upgraded', () => {
      const db = freshDb();
      applyMigrations(db, { to: 1 });
      const insert = db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
      insert.run('theme', 'dark', NOW);
      insert.run('language', 'hi', NOW);

      applyMigrations(db, { from: 1 });

      expect(db.prepare('SELECT key, value FROM settings ORDER BY key').all()).toEqual([
        { key: 'language', value: 'hi' },
        { key: 'theme', value: 'dark' },
      ]);
    });

    it('applies defaults: full tank, not missed, odometer 0, not archived', () => {
      const db = freshDb();
      applyMigrations(db);
      insertVehicle(db, 'v1');
      insertFillUp(db, 'f1', 'v1', 1_000_000);

      expect(
        db.prepare('SELECT initial_odometer_m, is_archived, sort_order FROM vehicles').get(),
      ).toEqual({ initial_odometer_m: 0, is_archived: 0, sort_order: 0 });
      expect(db.prepare('SELECT is_full, missed_previous FROM fill_ups').get()).toEqual({
        is_full: 1,
        missed_previous: 0,
      });
    });

    it('deletes a vehicle’s fill-ups with it (ON DELETE CASCADE)', () => {
      const db = freshDb();
      applyMigrations(db);
      insertVehicle(db, 'v1');
      insertVehicle(db, 'v2');
      insertFillUp(db, 'f1', 'v1', 1_000_000);
      insertFillUp(db, 'f2', 'v2', 1_000_000);

      db.prepare("DELETE FROM vehicles WHERE id = 'v1'").run();

      expect(db.prepare('SELECT id FROM fill_ups').all()).toEqual([{ id: 'f2' }]);
    });

    it('rejects a fill-up for a vehicle that does not exist', () => {
      const db = freshDb();
      applyMigrations(db);
      expect(() => insertFillUp(db, 'f1', 'missing', 1_000_000)).toThrow(/FOREIGN KEY/);
    });

    it('rejects two fill-ups at the same odometer for one vehicle', () => {
      const db = freshDb();
      applyMigrations(db);
      insertVehicle(db, 'v1');
      insertVehicle(db, 'v2');
      insertFillUp(db, 'f1', 'v1', 1_000_000);

      expect(() => insertFillUp(db, 'f2', 'v1', 1_000_000)).toThrow(/UNIQUE/);
      expect(() => insertFillUp(db, 'f3', 'v2', 1_000_000)).not.toThrow();
    });

    it('indexes fill-ups by vehicle for history queries (NFR-4)', () => {
      const db = freshDb();
      applyMigrations(db);
      const indexes = db.prepare('PRAGMA index_list(fill_ups)').all() as { name: string }[];
      // sqlite_autoindex_* backs the text primary key and always exists.
      const ours = indexes.map((i) => i.name).filter((n) => !n.startsWith('sqlite_autoindex'));
      expect(ours.sort()).toEqual(['fill_ups_vehicle_date', 'fill_ups_vehicle_odo']);
    });
  });

  describe('0002_services', () => {
    it('a v2 database (vehicles + fill-ups) upgrades with every row intact', () => {
      const db = freshDb();
      applyMigrations(db, { to: 2 });
      db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(
        'current_vehicle_id',
        'v1',
        NOW,
      );
      insertVehicle(db, 'v1');
      insertFillUp(db, 'f1', 'v1', 1_000_000);
      insertFillUp(db, 'f2', 'v1', 1_300_000);

      applyMigrations(db, { from: 2 });

      expect(db.prepare('SELECT id, name FROM vehicles').all()).toEqual([
        { id: 'v1', name: 'My Activa' },
      ]);
      expect(db.prepare('SELECT id, odometer_m FROM fill_ups ORDER BY odometer_m').all()).toEqual([
        { id: 'f1', odometer_m: 1_000_000 },
        { id: 'f2', odometer_m: 1_300_000 },
      ]);
      expect(db.prepare('SELECT value FROM settings').get()).toEqual({ value: 'v1' });
      expect(columns(db, 'services').map(([name]) => name)).toEqual([
        'id',
        'vehicle_id',
        'serviced_date',
        'odometer_m',
        'type_key',
        'title',
        'cost_minor',
        'currency',
        'note',
        'created_at',
        'updated_at',
      ]);
    });

    it('optional odometer and cost; deleted with their vehicle; indexed by vehicle + date', () => {
      const db = freshDb();
      applyMigrations(db);
      insertVehicle(db, 'v1');
      db.prepare(
        `INSERT INTO services (id, vehicle_id, serviced_date, type_key, created_at, updated_at)
         VALUES ('s1', 'v1', '2026-10-20', 'general_service', ?, ?)`,
      ).run(NOW, NOW);
      expect(db.prepare('SELECT odometer_m, cost_minor FROM services').get()).toEqual({
        odometer_m: null,
        cost_minor: null,
      });

      db.prepare("DELETE FROM vehicles WHERE id = 'v1'").run();
      expect(db.prepare('SELECT id FROM services').all()).toEqual([]);

      const indexes = db.prepare('PRAGMA index_list(services)').all() as { name: string }[];
      const ours = indexes.map((i) => i.name).filter((n) => !n.startsWith('sqlite_autoindex'));
      expect(ours).toEqual(['services_vehicle_date']);
    });
  });
});

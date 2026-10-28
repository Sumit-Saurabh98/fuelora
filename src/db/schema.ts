import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { ENTRY_MODES } from '@/domain/fill-up';
import type { ServiceTypeKey } from '@/domain/presets';
import { REMINDER_KINDS, REMINDER_STATUSES, type ReminderTypeKey } from '@/domain/reminder';
import { FUEL_TYPES, VEHICLE_TYPES } from '@/domain/vehicle';

// Source of truth for the schema (LLD §2). After editing: `pnpm db:generate`, review the SQL,
// never edit a migration that has shipped (AGENTS.md rule 10).
// Units are canonical (AGENTS.md rules 3–4): …M metres, …Base mL/g/Wh, …Minor currency minor units.

// Key/value settings that travel with backups (language, theme, units, …).
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const vehicles = sqliteTable('vehicles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: VEHICLE_TYPES }).notNull(),
  fuelType: text('fuel_type', { enum: FUEL_TYPES }).notNull(),
  make: text('make'),
  model: text('model'),
  year: integer('year'),
  plate: text('plate'),
  initialOdometerM: integer('initial_odometer_m').notNull().default(0),
  // Optional; enables the "fill larger than tank" warning.
  tankCapacityBase: integer('tank_capacity_base'),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const fillUps = sqliteTable(
  'fill_ups',
  {
    id: text('id').primaryKey(),
    vehicleId: text('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    filledAt: text('filled_at').notNull(), // UTC instant
    localDate: text('local_date').notNull(), // YYYY-MM-DD in the user's zone, for monthly grouping
    odometerM: integer('odometer_m').notNull(),
    quantityBase: integer('quantity_base').notNull(), // mL | g | Wh by the vehicle's fuel type
    totalMinor: integer('total_minor').notNull(),
    currency: text('currency').notNull(), // ISO 4217, from settings at entry time
    isFull: integer('is_full', { mode: 'boolean' }).notNull().default(true),
    missedPrevious: integer('missed_previous', { mode: 'boolean' }).notNull().default(false),
    entryMode: text('entry_mode', { enum: ENTRY_MODES }).notNull(),
    station: text('station'),
    note: text('note'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    // One reading per odometer value per vehicle; full-to-full math relies on a strict order.
    uniqueIndex('fill_ups_vehicle_odo').on(t.vehicleId, t.odometerM),
    index('fill_ups_vehicle_date').on(t.vehicleId, t.localDate),
  ],
);

export const services = sqliteTable(
  'services',
  {
    id: text('id').primaryKey(),
    vehicleId: text('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    servicedDate: text('serviced_date').notNull(), // YYYY-MM-DD
    odometerM: integer('odometer_m'), // optional
    // Preset key (KB §5) or 'custom'; plain text so new presets need no migration.
    typeKey: text('type_key').$type<ServiceTypeKey>().notNull(),
    title: text('title'), // required when type_key = 'custom'
    costMinor: integer('cost_minor'),
    currency: text('currency'), // ISO 4217, set whenever cost_minor is
    note: text('note'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [index('services_vehicle_date').on(t.vehicleId, t.servicedDate)],
);

export const reminders = sqliteTable(
  'reminders',
  {
    id: text('id').primaryKey(),
    // Null = person-level (driving licence).
    vehicleId: text('vehicle_id').references(() => vehicles.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: REMINDER_KINDS }).notNull(),
    typeKey: text('type_key').$type<ReminderTypeKey>().notNull(),
    title: text('title'),
    dueDate: text('due_date'), // YYYY-MM-DD; either or both of due_date / due_odometer_m
    dueOdometerM: integer('due_odometer_m'),
    repeatMonths: integer('repeat_months'),
    repeatDistanceM: integer('repeat_distance_m'),
    leadDays: integer('lead_days').notNull().default(7),
    leadDistanceM: integer('lead_distance_m').notNull().default(300000),
    status: text('status', { enum: REMINDER_STATUSES }).notNull().default('active'),
    lastDoneDate: text('last_done_date'),
    lastDoneOdometerM: integer('last_done_odometer_m'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    index('reminders_vehicle_status').on(t.vehicleId, t.status),
    check('reminders_due', sql`${t.dueDate} is not null or ${t.dueOdometerM} is not null`),
  ],
);

import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Source of truth for the schema (LLD §2). After editing: `pnpm db:generate`, review the SQL,
// never edit a migration that has shipped (AGENTS.md rule 10).

// Key/value settings that travel with backups (language, theme, units, …).
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

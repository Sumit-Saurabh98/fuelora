import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { getDatabase } from './client';
import migrations from './migrations/migrations';

// Drizzle applies pending migrations in order and records them in __drizzle_migrations,
// so an app update opens every older database (AGENTS.md rule 10).
export async function runMigrations(): Promise<void> {
  await migrate(getDatabase().db, migrations);
}

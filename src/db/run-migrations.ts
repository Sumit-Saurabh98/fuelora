import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { AppError } from '@/domain/errors';

import { getDatabase } from './client';
import migrations from './migrations/migrations';

// Drizzle applies pending migrations in order and records them in __drizzle_migrations,
// so an app update opens every older database (AGENTS.md rule 10).
export async function runMigrations(): Promise<void> {
  try {
    await migrate(getDatabase().db, migrations);
  } catch (cause: unknown) {
    throw new AppError('MIGRATION_FAILED', 'Database migration failed', {
      cause: cause instanceof Error ? cause.message : String(cause),
    });
  }
}

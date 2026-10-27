// Composition root: the only place that picks concrete implementations (AGENTS.md code style).
import { getDatabase } from '@/db/client';
import type { Clock } from '@/domain/clock';
import { DrizzleSettingsRepository } from '@/repositories/drizzle-settings.repository';
import { SettingsService } from '@/services/settings.service';

const systemClock: Clock = { now: () => new Date() };

export type Container = {
  settingsService: SettingsService;
};

let container: Container | null = null;

// Built on first use, after startup has run migrations.
export function getContainer(): Container {
  if (container) return container;
  const { db } = getDatabase();
  container = {
    settingsService: new SettingsService(new DrizzleSettingsRepository(db), systemClock),
  };
  return container;
}

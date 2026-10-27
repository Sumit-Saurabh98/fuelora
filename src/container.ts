// Composition root: the only place that picks concrete implementations (AGENTS.md code style).
import { getDatabase } from '@/db/client';
import type { Clock } from '@/domain/clock';
import { UuidV7Generator, type IdGenerator, type RandomSource } from '@/domain/id-generator';
import { DrizzleSettingsRepository } from '@/repositories/drizzle-settings.repository';
import { SettingsService } from '@/services/settings.service';

const systemClock: Clock = { now: () => new Date() };

type CryptoLike = { getRandomValues?: (bytes: Uint8Array) => Uint8Array };

// Hermes has no built-in crypto.getRandomValues. IDs only need to be unique on this device
// (behind a ms timestamp + counter), so Math.random is an acceptable fallback; swap in
// expo-crypto here if IDs ever need to be unguessable.
const randomSource: RandomSource = (bytes) => {
  const crypto = (globalThis as { crypto?: CryptoLike }).crypto;
  if (crypto?.getRandomValues) {
    crypto.getRandomValues(bytes);
    return;
  }
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
};

export type Container = {
  clock: Clock;
  idGenerator: IdGenerator;
  settingsService: SettingsService;
};

let container: Container | null = null;

// Built on first use, after startup has run migrations.
export function getContainer(): Container {
  if (container) return container;
  const { db } = getDatabase();
  container = {
    clock: systemClock,
    idGenerator: new UuidV7Generator(systemClock, randomSource),
    settingsService: new SettingsService(new DrizzleSettingsRepository(db), systemClock),
  };
  return container;
}

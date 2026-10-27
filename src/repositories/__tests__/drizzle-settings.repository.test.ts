import { createTestDatabase } from '@/db/testing/node-drizzle';

import { DrizzleSettingsRepository } from '../drizzle-settings.repository';

describe('DrizzleSettingsRepository', () => {
  it('returns an empty map on a fresh database', async () => {
    const repo = new DrizzleSettingsRepository(createTestDatabase().db);
    expect(await repo.getAll()).toEqual(new Map());
  });

  it('inserts, then overwrites the same key', async () => {
    const { db, sqlite } = createTestDatabase();
    const repo = new DrizzleSettingsRepository(db);

    await repo.set('theme', 'dark', '2026-10-27T10:00:00.000Z');
    await repo.set('language', 'hi', '2026-10-27T10:00:00.000Z');
    await repo.set('theme', 'light', '2026-10-27T11:00:00.000Z');

    expect(await repo.getAll()).toEqual(
      new Map([
        ['theme', 'light'],
        ['language', 'hi'],
      ]),
    );
    expect(sqlite.prepare("SELECT updated_at FROM settings WHERE key = 'theme'").get()).toEqual({
      updated_at: '2026-10-27T11:00:00.000Z',
    });
  });

  it('removes only the given keys', async () => {
    const repo = new DrizzleSettingsRepository(createTestDatabase().db);
    await repo.set('theme', 'dark', '2026-10-27T10:00:00.000Z');
    await repo.set('distance_unit', 'mi', '2026-10-27T10:00:00.000Z');
    await repo.set('currency', 'EUR', '2026-10-27T10:00:00.000Z');

    await repo.remove(['distance_unit', 'currency', 'not_there']);
    await repo.remove([]);

    expect(await repo.getAll()).toEqual(new Map([['theme', 'dark']]));
  });
});

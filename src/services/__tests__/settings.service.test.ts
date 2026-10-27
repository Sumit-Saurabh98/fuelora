import { FixedClock } from '@/domain/clock';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';

import { SettingsService } from '../settings.service';

const NOW = new Date('2026-10-27T10:00:00.000Z');

function setup() {
  const repo = new InMemorySettingsRepository();
  const service = new SettingsService(repo, new FixedClock(NOW));
  return { repo, service };
}

describe('SettingsService', () => {
  it('defaults to system theme and no chosen language', async () => {
    expect(await setup().service.getAppearance()).toEqual({ themeMode: 'system', language: null });
  });

  it('saves theme and language with the clock time', async () => {
    const { repo, service } = setup();

    await service.setThemeMode('dark');
    await service.setLanguage('hi');

    expect(await service.getAppearance()).toEqual({ themeMode: 'dark', language: 'hi' });
    expect(repo.rows.get('theme')).toEqual({ value: 'dark', updatedAt: NOW.toISOString() });
  });

  it('ignores unknown stored values instead of failing', async () => {
    const { repo, service } = setup();
    await repo.set('theme', 'neon', NOW.toISOString());
    await repo.set('language', 'xx', NOW.toISOString());

    expect(await service.getAppearance()).toEqual({ themeMode: 'system', language: null });
  });
});

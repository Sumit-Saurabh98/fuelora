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
  it('defaults to system theme and nothing chosen', async () => {
    expect(await setup().service.getPreferences()).toEqual({
      themeMode: 'system',
      language: null,
      region: null,
      unitOverrides: {},
    });
  });

  it('saves theme, language and region with the clock time', async () => {
    const { repo, service } = setup();

    await service.setThemeMode('dark');
    await service.setLanguage('hi');
    await service.changeRegion('GB');

    expect(await service.getPreferences()).toMatchObject({
      themeMode: 'dark',
      language: 'hi',
      region: 'GB',
    });
    expect(repo.rows.get('theme')).toEqual({ value: 'dark', updatedAt: NOW.toISOString() });
  });

  it('stores unit overrides under the LLD §2 keys', async () => {
    const { repo, service } = setup();

    await service.setUnit('distanceUnit', 'mi');
    await service.setUnit('volumeUnit', 'gal_uk');
    await service.setUnit('efficiencyLiquid', 'l_per_100km');
    await service.setUnit('efficiencyEv', 'kwh_per_100km');
    await service.setUnit('currency', 'EUR');

    expect([...repo.rows.keys()].sort()).toEqual([
      'currency',
      'distance_unit',
      'efficiency_format_ev',
      'efficiency_format_liquid',
      'volume_unit',
    ]);
    expect((await service.getPreferences()).unitOverrides).toEqual({
      currency: 'EUR',
      distanceUnit: 'mi',
      volumeUnit: 'gal_uk',
      efficiencyLiquid: 'l_per_100km',
      efficiencyEv: 'kwh_per_100km',
    });
  });

  it('changing region clears unit overrides but keeps theme and language', async () => {
    const { service } = setup();
    await service.setThemeMode('dark');
    await service.setUnit('distanceUnit', 'mi');
    await service.setUnit('currency', 'EUR');

    await service.changeRegion('IN');

    expect(await service.getPreferences()).toEqual({
      themeMode: 'dark',
      language: null,
      region: 'IN',
      unitOverrides: {},
    });
  });

  it('can clear unit overrides on their own', async () => {
    const { service } = setup();
    await service.changeRegion('US');
    await service.setUnit('volumeUnit', 'L');

    await service.clearUnitOverrides();

    expect(await service.getPreferences()).toMatchObject({ region: 'US', unitOverrides: {} });
  });

  it('ignores unknown stored values instead of failing', async () => {
    const { repo, service } = setup();
    for (const [key, value] of [
      ['theme', 'neon'],
      ['language', 'xx'],
      ['region', 'FR'],
      ['distance_unit', 'furlong'],
      ['currency', 'rupees'],
      ['efficiency_format_liquid', 'km_per_kg'], // CNG format is not a liquid format
    ]) {
      await repo.set(key!, value!, NOW.toISOString());
    }

    expect(await service.getPreferences()).toEqual({
      themeMode: 'system',
      language: null,
      region: null,
      unitOverrides: {},
    });
  });

  it('weekly nudge is on until turned off, stored under notify_weekly_nudge (F-11)', async () => {
    const { repo, service } = setup();
    expect(await service.isWeeklyNudgeOn()).toBe(true);
    await service.setWeeklyNudge(false);
    expect(await service.isWeeklyNudgeOn()).toBe(false);
    expect((await repo.getAll()).get('notify_weekly_nudge')).toBe('false');
  });
});

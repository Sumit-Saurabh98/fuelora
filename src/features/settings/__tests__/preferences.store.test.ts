import { FixedClock } from '@/domain/clock';
import { i18n } from '@/i18n/i18n';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { SettingsService } from '@/services/settings.service';

import { hydratePreferences, usePreferences } from '../preferences.store';

const mockService = new SettingsService(
  new InMemorySettingsRepository(),
  new FixedClock(new Date('2026-10-27T10:00:00.000Z')),
);
jest.mock('@/container', () => ({ getContainer: () => ({ settingsService: mockService }) }));

describe('preferences store', () => {
  afterEach(() => {
    usePreferences.getState().setLanguage('en');
    usePreferences.getState().setThemeMode('system');
  });

  it('persists changes through SettingsService', async () => {
    usePreferences.getState().setThemeMode('dark');
    usePreferences.getState().setLanguage('hi');
    await Promise.resolve();

    expect(await mockService.getAppearance()).toEqual({ themeMode: 'dark', language: 'hi' });
  });

  it('restores saved preferences on startup (survives an app restart)', async () => {
    await mockService.setThemeMode('light');
    await mockService.setLanguage('hi');
    usePreferences.setState({ themeMode: 'system', language: 'en' });

    await hydratePreferences(mockService);

    expect(usePreferences.getState()).toMatchObject({ themeMode: 'light', language: 'hi' });
    expect(i18n.language).toBe('hi');
  });
});

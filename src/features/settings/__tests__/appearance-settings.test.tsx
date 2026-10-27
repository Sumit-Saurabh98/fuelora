import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';

import { FixedClock } from '@/domain/clock';
import { InMemorySettingsRepository } from '@/repositories/in-memory-settings.repository';
import { SettingsService } from '@/services/settings.service';

import { AppearanceSettings } from '../components/appearance-settings';
import { usePreferences } from '../preferences.store';

const mockService = new SettingsService(
  new InMemorySettingsRepository(),
  new FixedClock(new Date('2026-10-27T10:00:00.000Z')),
);
jest.mock('@/container', () => ({ getContainer: () => ({ settingsService: mockService }) }));

function renderSettings() {
  return render(
    <PaperProvider>
      <AppearanceSettings />
    </PaperProvider>,
  );
}

describe('AppearanceSettings', () => {
  afterEach(() => {
    usePreferences.getState().setLanguage('en');
    usePreferences.getState().setThemeMode('system');
  });

  it('switches the UI language to Hindi', async () => {
    await renderSettings();
    expect(screen.getByText('Language')).toBeTruthy();

    await fireEvent.press(screen.getByText('हिन्दी'));

    expect(await screen.findByText('भाषा')).toBeTruthy();
    expect(usePreferences.getState().language).toBe('hi');
  });

  it('switches the theme mode', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByText('Dark'));

    expect(usePreferences.getState().themeMode).toBe('dark');
  });
});

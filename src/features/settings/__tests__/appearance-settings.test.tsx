import { fireEvent, render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';

import { AppearanceSettings } from '../components/appearance-settings';
import { usePreferences } from '../preferences.store';

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

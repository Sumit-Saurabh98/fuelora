import { render, screen } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';

import { AboutSettings } from '../components/about-settings';
import { useAppInfo, type AppInfo } from '../hooks/use-app-info';

jest.mock('../hooks/use-app-info', () => ({ useAppInfo: jest.fn() }));
const mockUseAppInfo = jest.mocked(useAppInfo);

function renderAbout(info: AppInfo) {
  mockUseAppInfo.mockReturnValue(info);
  return render(
    <PaperProvider>
      <AboutSettings />
    </PaperProvider>,
  );
}

describe('AboutSettings', () => {
  it('shows version and a ready database', async () => {
    await renderAbout({
      appVersion: '0.1.0',
      database: {
        ok: true,
        info: { sqliteVersion: '3.49.1', journalMode: 'wal', foreignKeys: true },
      },
    });
    expect(screen.getByText('0.1.0')).toBeTruthy();
    expect(screen.getByText('Ready · SQLite 3.49.1 · WAL')).toBeTruthy();
  });

  it('shows an error when the database cannot open', async () => {
    await renderAbout({ appVersion: '0.1.0', database: { ok: false } });
    expect(screen.getByText('Could not open the database')).toBeTruthy();
  });
});

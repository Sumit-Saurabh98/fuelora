import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/testing/render-screen';

import { useVehicles } from '../../vehicles/hooks/use-vehicles';
import { BackupSettings } from '../components/backup-settings';
import { useBackupActions } from '../hooks/use-backup-actions';
import { useBackupStatus } from '../hooks/use-backup-status';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../hooks/use-backup-status', () => ({ useBackupStatus: jest.fn() }));
jest.mock('../hooks/use-backup-actions', () => ({ useBackupActions: jest.fn() }));
jest.mock('../../vehicles/hooks/use-vehicles', () => ({ useVehicles: jest.fn() }));

describe('BackupSettings (FR-26)', () => {
  const refresh = jest.fn();
  const exportBackup = jest.fn(async () => {});

  beforeEach(() => {
    jest.mocked(useVehicles).mockReturnValue({ active: [], archived: [], currentId: null });
    jest.mocked(useBackupActions).mockReturnValue({ exportBackup, exportCsv: jest.fn() });
  });

  it('never backed up with entries: warning; tapping backs up and refreshes', async () => {
    jest.mocked(useBackupStatus).mockReturnValue({ daysAgo: null, warn: true, refresh });
    await renderScreen(<BackupSettings />);
    expect(screen.getByText('Never backed up')).toBeTruthy();
    expect(
      screen.getByText("Back up now so a lost or new phone doesn't mean lost data."),
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Never backed up'));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(exportBackup).toHaveBeenCalled();
  });

  it('recent backup: days ago, no warning', async () => {
    jest.mocked(useBackupStatus).mockReturnValue({ daysAgo: 3, warn: false, refresh });
    await renderScreen(<BackupSettings />);
    expect(screen.getByText('Last backup: 3 days ago')).toBeTruthy();
    expect(
      screen.queryByText("Back up now so a lost or new phone doesn't mean lost data."),
    ).toBeNull();
  });
});

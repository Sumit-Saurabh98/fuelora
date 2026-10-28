import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/testing/render-screen';

import { useBackupActions } from '../../backup/hooks/use-backup-actions';
import { useBackupNudge } from '../../backup/hooks/use-backup-nudge';
import { BackupNudge } from '../components/backup-nudge';

jest.mock('../../backup/hooks/use-backup-nudge', () => ({ useBackupNudge: jest.fn() }));
jest.mock('../../backup/hooks/use-backup-actions', () => ({ useBackupActions: jest.fn() }));

describe('BackupNudge (FR-27)', () => {
  const later = jest.fn();
  const exported = jest.fn();
  const exportBackup = jest.fn(async () => {});

  beforeEach(() => {
    jest.mocked(useBackupActions).mockReturnValue({ exportBackup, exportCsv: jest.fn() });
    later.mockClear();
    exported.mockClear();
  });

  it('hidden when not due', async () => {
    jest.mocked(useBackupNudge).mockReturnValue({ show: false, later, exported });
    await renderScreen(<BackupNudge />);
    expect(screen.queryByText('Back up your data')).toBeNull();
  });

  it('Back up now exports; Later puts it away for a week', async () => {
    jest.mocked(useBackupNudge).mockReturnValue({ show: true, later, exported });
    await renderScreen(<BackupNudge />);

    await fireEvent.press(screen.getByText('Back up now'));
    await waitFor(() => expect(exported).toHaveBeenCalled());
    expect(exportBackup).toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Later'));
    expect(later).toHaveBeenCalled();
  });
});

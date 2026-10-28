import { fireEvent, screen } from '@testing-library/react-native';

import { renderScreen } from '@/testing/render-screen';

import { useNotificationPermission } from '../../reminders/hooks/use-notification-permission';
import { NotificationSettings } from '../components/notification-settings';
import { useWeeklyNudge } from '../hooks/use-weekly-nudge';

jest.mock('../hooks/use-weekly-nudge', () => ({ useWeeklyNudge: jest.fn() }));
jest.mock('../../reminders/hooks/use-notification-permission', () => ({
  useNotificationPermission: jest.fn(),
}));

describe('NotificationSettings (F-11)', () => {
  const setOn = jest.fn(async () => {});

  it('one tap turns the weekly nudge off', async () => {
    jest.mocked(useWeeklyNudge).mockReturnValue({ on: true, setOn });
    jest.mocked(useNotificationPermission).mockReturnValue('granted');
    await renderScreen(<NotificationSettings />);

    expect(screen.getByLabelText('Weekly reminder to log').props.value).toBe(true);
    await fireEvent.press(screen.getByText('Weekly reminder to log'));
    expect(setOn).toHaveBeenCalledWith(false);
    expect(screen.queryByText('Notifications are off')).toBeNull();
  });

  it('says when notifications are off at the system level', async () => {
    jest.mocked(useWeeklyNudge).mockReturnValue({ on: false, setOn });
    jest.mocked(useNotificationPermission).mockReturnValue('denied');
    await renderScreen(<NotificationSettings />);
    expect(screen.getByText('Notifications are off')).toBeTruthy();
  });
});

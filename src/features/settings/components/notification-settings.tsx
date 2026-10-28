import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';
import { List, Switch, useTheme } from 'react-native-paper';

import { useNotificationPermission } from '../../reminders/hooks/use-notification-permission';
import { useWeeklyNudge } from '../hooks/use-weekly-nudge';

export function NotificationSettings() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { on, setOn } = useWeeklyNudge();
  const permission = useNotificationPermission();

  return (
    <List.Section title={t('settings.notifications')}>
      <List.Item
        title={t('settings.weeklyNudge')}
        description={t('settings.weeklyNudgeDescription')}
        descriptionNumberOfLines={2}
        left={(props) => <List.Icon {...props} icon="calendar-week" />}
        right={() => (
          <Switch
            value={on}
            onValueChange={(value) => void setOn(value)}
            accessibilityLabel={t('settings.weeklyNudge')}
          />
        )}
        onPress={() => void setOn(!on)}
      />
      {permission === 'denied' ? (
        <List.Item
          title={t('settings.notificationsOff')}
          description={t('settings.notificationsOffDescription')}
          descriptionNumberOfLines={2}
          titleStyle={{ color: theme.colors.error }}
          left={(props) => (
            <List.Icon {...props} icon="bell-off-outline" color={theme.colors.error} />
          )}
          onPress={() => void Linking.openSettings()}
        />
      ) : null}
    </List.Section>
  );
}

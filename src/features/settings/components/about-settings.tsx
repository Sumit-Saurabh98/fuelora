import { useTranslation } from 'react-i18next';
import { List, useTheme } from 'react-native-paper';

import { useAppInfo } from '../hooks/use-app-info';

export function AboutSettings() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { appVersion, database } = useAppInfo();

  return (
    <List.Section title={t('settings.about')}>
      <List.Item
        title={t('settings.version')}
        description={appVersion}
        left={(props) => <List.Icon {...props} icon="information-outline" />}
      />
      <List.Item
        title={t('settings.database')}
        description={
          database.ok
            ? t('settings.databaseReady', {
                version: database.info.sqliteVersion,
                mode: database.info.journalMode.toUpperCase(),
                schema: database.info.schemaVersion,
              })
            : t('settings.databaseError')
        }
        descriptionStyle={database.ok ? undefined : { color: theme.colors.error }}
        left={(props) => (
          <List.Icon
            {...props}
            icon={database.ok ? 'database-check-outline' : 'database-alert-outline'}
          />
        )}
      />
    </List.Section>
  );
}

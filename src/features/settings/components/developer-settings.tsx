import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, List, Portal, Text, useTheme } from 'react-native-paper';

import { useDevReset } from '../hooks/use-dev-reset';

/** Tools for testing on device; never rendered in release builds. */
export function DeveloperSettings() {
  const { t } = useTranslation();
  const theme = useTheme();
  const reset = useDevReset();
  const [confirming, setConfirming] = useState(false);

  if (!__DEV__) return null;

  return (
    <List.Section title={t('settings.developer')}>
      <List.Item
        title={t('settings.devReset')}
        description={t('settings.devResetDescription')}
        descriptionNumberOfLines={3}
        titleStyle={{ color: theme.colors.error }}
        onPress={() => setConfirming(true)}
        left={(props) => <List.Icon {...props} icon="delete-restore" color={theme.colors.error} />}
      />
      <Portal>
        <Dialog visible={confirming} onDismiss={() => setConfirming(false)}>
          <Dialog.Title>{t('settings.devReset')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('settings.devResetConfirm')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirming(false)}>{t('common.cancel')}</Button>
            <Button textColor={theme.colors.error} onPress={reset}>
              {t('common.delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </List.Section>
  );
}

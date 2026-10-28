import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Text, useTheme } from 'react-native-paper';

import { useBackupActions } from '../../backup/hooks/use-backup-actions';
import { useBackupNudge } from '../../backup/hooks/use-backup-nudge';

/** In-app only (no notification): a gentle ask to back up (FR-27). */
export function BackupNudge() {
  const { t } = useTranslation();
  const theme = useTheme();
  const nudge = useBackupNudge();
  const actions = useBackupActions();
  const [busy, setBusy] = useState(false);
  if (!nudge.show) return null;

  const backUp = async () => {
    setBusy(true);
    try {
      await actions.exportBackup();
      nudge.exported();
    } catch {
      // The share sheet failed; the card stays so the user can try again.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card mode="contained" style={{ backgroundColor: theme.colors.secondaryContainer }}>
      <Card.Title title={t('backup.nudgeTitle')} titleVariant="titleMedium" />
      <Card.Content>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSecondaryContainer }}>
          {t('backup.nudgeBody')}
        </Text>
      </Card.Content>
      <Card.Actions>
        <Button onPress={nudge.later} disabled={busy}>
          {t('backup.later')}
        </Button>
        <Button mode="contained" onPress={() => void backUp()} loading={busy} disabled={busy}>
          {t('backup.exportNow')}
        </Button>
      </Card.Actions>
    </Card>
  );
}

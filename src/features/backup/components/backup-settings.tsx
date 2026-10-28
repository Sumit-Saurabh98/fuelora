import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelperText, List, useTheme } from 'react-native-paper';

import { useVehicles } from '../../vehicles/hooks/use-vehicles';
import { useBackupActions } from '../hooks/use-backup-actions';
import { useBackupStatus } from '../hooks/use-backup-status';

/** Settings → Backup (F-13): the only way data leaves the phone is the user sharing a file. */
export function BackupSettings() {
  const { t } = useTranslation();
  const { active, currentId } = useVehicles();
  const vehicle = active.find((v) => v.id === currentId);
  const theme = useTheme();
  const actions = useBackupActions();
  const status = useBackupStatus();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setFailed(false);
    try {
      await task();
      status.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <List.Section title={t('backup.title')}>
      {/* FR-26: how old the last backup is; warning colour when it's time for a new one. */}
      <List.Item
        title={
          status.daysAgo === null
            ? t('backup.never')
            : status.daysAgo === 0
              ? t('backup.lastToday')
              : status.daysAgo === 1
                ? t('backup.lastYesterday')
                : t('backup.lastDaysAgo', { days: status.daysAgo })
        }
        description={status.warn ? t('backup.staleHint') : undefined}
        titleStyle={status.warn ? { color: theme.colors.error } : undefined}
        left={(props) => (
          <List.Icon
            {...props}
            icon={status.warn ? 'shield-alert-outline' : 'shield-check-outline'}
            color={status.warn ? theme.colors.error : props.color}
          />
        )}
        disabled={busy}
        onPress={() => void run(actions.exportBackup)}
        accessibilityHint={t('backup.exportNow')}
      />
      <List.Item
        title={t('backup.exportNow')}
        description={t('backup.exportDescription')}
        descriptionNumberOfLines={3}
        disabled={busy}
        left={(props) => <List.Icon {...props} icon="cloud-upload-outline" />}
        onPress={() => void run(actions.exportBackup)}
      />
      {vehicle ? (
        <List.Item
          title={t('backup.exportCsv')}
          description={t('backup.exportCsvDescription', { name: vehicle.name })}
          descriptionNumberOfLines={2}
          disabled={busy}
          left={(props) => <List.Icon {...props} icon="file-delimited-outline" />}
          onPress={() => void run(() => actions.exportCsv(vehicle))}
        />
      ) : null}
      <List.Item
        title={t('restore.title')}
        description={t('restore.settingsDescription')}
        descriptionNumberOfLines={2}
        disabled={busy}
        left={(props) => <List.Icon {...props} icon="backup-restore" />}
        onPress={() => router.push('/restore')}
      />
      <HelperText type="error" visible={failed}>
        {t('backup.exportFailed')}
      </HelperText>
    </List.Section>
  );
}

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Dialog, HelperText, Portal, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isAppError } from '@/domain/errors';
import type { RestoreCandidate } from '@/services/backup.service';
import { formatDate, formatDay } from '@/ui/format';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { useRestore, type RestoreResult } from '../hooks/use-restore';

type Step =
  | { kind: 'choose'; error?: 'invalid' | 'newer' | 'failed' }
  | { kind: 'review'; candidate: RestoreCandidate }
  | { kind: 'restoring' }
  | { kind: 'done'; result: RestoreResult };

/**
 * Restore a backup file (FR-17): choose → see what it holds → confirm → safety copy → replace.
 * `uri` comes from "Open in Fuelora" (FR-23) and skips the picker.
 */
export function RestoreScreen({ uri }: { uri?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { locale } = useUnitPreferences();
  const restore = useRestore();
  const [step, setStep] = useState<Step>({ kind: 'choose' });
  const [confirming, setConfirming] = useState(false);
  // Opened with a file: it is being read from the start.
  const [loading, setLoading] = useState(Boolean(uri));

  const settle = (read: Promise<RestoreCandidate | null>) =>
    read
      .then((candidate) => setStep(candidate ? { kind: 'review', candidate } : { kind: 'choose' }))
      .catch((error: unknown) => {
        const newer = isAppError(error) && error.code === 'BACKUP_NEWER_VERSION';
        setStep({ kind: 'choose', error: newer ? 'newer' : 'invalid' });
      })
      .finally(() => setLoading(false));

  const load = (read: () => Promise<RestoreCandidate | null>) => {
    setLoading(true);
    void settle(read());
  };

  useEffect(() => {
    if (uri) void settle(restore.read(uri));
    // Only for the file this screen was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  const replace = async (candidate: RestoreCandidate) => {
    setConfirming(false);
    setStep({ kind: 'restoring' });
    try {
      setStep({ kind: 'done', result: await restore.restore(candidate) });
    } catch {
      setStep({ kind: 'choose', error: 'failed' });
    }
  };

  const footer = (
    label: string,
    onPress: () => void,
    opts: { loading?: boolean; danger?: boolean } = {},
  ) => (
    <View style={styles.footer}>
      <Button
        mode="contained"
        onPress={onPress}
        loading={opts.loading}
        disabled={opts.loading}
        buttonColor={opts.danger ? theme.colors.error : undefined}
        textColor={opts.danger ? theme.colors.onError : undefined}
        contentStyle={styles.button}
      >
        {label}
      </Button>
    </View>
  );

  let body: React.ReactNode;
  let action: React.ReactNode = null;
  if (step.kind === 'choose') {
    body = (
      <>
        <Text variant="bodyLarge">{t('restore.intro')}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('restore.introSafety')}
        </Text>
        {step.error ? (
          <HelperText type="error" visible>
            {t(`restore.errors.${step.error}`)}
          </HelperText>
        ) : null}
      </>
    );
    action = footer(t('restore.choose'), () => load(restore.pick), { loading });
  } else if (step.kind === 'review') {
    const s = step.candidate.summary;
    const rows = [
      t('restore.summary.vehicles', { count: s.vehicles }),
      t('restore.summary.fillUps', { count: s.fillUps }),
      t('restore.summary.services', { count: s.services }),
      t('restore.summary.reminders', { count: s.reminders }),
    ];
    body = (
      <>
        <Card mode="outlined">
          <Card.Title
            title={t('restore.fileFrom', {
              date: formatDate(new Date(step.candidate.exportedAt), locale),
            })}
            titleVariant="titleMedium"
          />
          <Card.Content style={styles.summary}>
            {rows.map((r) => (
              <Text key={r} variant="bodyLarge">
                {r}
              </Text>
            ))}
            {s.from && s.to ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('restore.summary.range', {
                  from: formatDay(s.from, locale),
                  to: formatDay(s.to, locale),
                })}
              </Text>
            ) : null}
          </Card.Content>
        </Card>
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          {t('restore.replaceWarning')}
        </Text>
        <Button mode="text" onPress={() => load(restore.pick)}>
          {t('restore.chooseOther')}
        </Button>
      </>
    );
    action = footer(t('restore.replace'), () => setConfirming(true), { danger: true });
  } else if (step.kind === 'restoring') {
    body = <Text variant="bodyLarge">{t('restore.restoring')}</Text>;
    action = footer(t('restore.replace'), () => undefined, { loading: true, danger: true });
  } else {
    body = (
      <View style={styles.done}>
        <MaterialCommunityIcons
          name="check-circle-outline"
          size={56}
          color={theme.colors.primary}
        />
        <Text variant="titleLarge">{t('restore.done')}</Text>
        <Text
          variant="bodyMedium"
          style={[styles.center, { color: theme.colors.onSurfaceVariant }]}
        >
          {t('restore.doneSafety')}
        </Text>
        {step.result.notifications === 'denied' ? (
          <Text variant="bodyMedium" style={[styles.center, { color: theme.colors.error }]}>
            {t('restore.notificationsOff')}
          </Text>
        ) : null}
      </View>
    );
    action = footer(t('restore.toHome'), () => router.replace('/'));
  }

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>{body}</ScrollView>
      {action}
      <Portal>
        <Dialog visible={confirming} onDismiss={() => setConfirming(false)}>
          <Dialog.Title>{t('restore.confirmTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('restore.confirmBody')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirming(false)}>{t('common.cancel')}</Button>
            <Button
              textColor={theme.colors.error}
              onPress={() => step.kind === 'review' && void replace(step.candidate)}
            >
              {t('restore.replace')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, gap: 16 },
  summary: { gap: 4 },
  done: { alignItems: 'center', gap: 12, paddingTop: 32 },
  center: { textAlign: 'center' },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  button: { minHeight: 52 },
});

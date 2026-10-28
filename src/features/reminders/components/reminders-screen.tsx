import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Dialog, FAB, List, Portal, Text, useTheme } from 'react-native-paper';

import { getContainer } from '@/container';
import { localDateOf } from '@/domain/fill-up';
import type { Reminder, ReminderState } from '@/domain/reminder';
import { EmptyState } from '@/ui/empty-state';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { useCurrentOdometer } from '../../vehicles/hooks/use-current-odometer';
import { useVehicles } from '../../vehicles/hooks/use-vehicles';
import { useActiveReminders } from '../hooks/use-active-reminders';
import { useReminderActions } from '../hooks/use-reminder-actions';
import { dueText, reminderName, sortedByUrgency } from '../reminder-display';

/** The current vehicle's reminders and person-level ones, most urgent first (F-10). */
export function RemindersScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { units, locale, region } = useUnitPreferences();
  const { active, currentId } = useVehicles();
  const vehicle = active.find((v) => v.id === currentId) ?? null;
  const reminders = useActiveReminders(vehicle?.id ?? null);
  const odometerM = useCurrentOdometer(vehicle);
  const actions = useReminderActions();
  const [confirm, setConfirm] = useState<Reminder | null>(null);
  const today = localDateOf(getContainer().clock.now());
  const ctx = { t, units, locale, region };

  const rows = useMemo(
    () => sortedByUrgency(reminders ?? [], { today, currentOdometerM: odometerM ?? null }),
    [reminders, today, odometerM],
  );

  if (reminders === undefined || odometerM === undefined) return null; // one frame while loading

  const stateColor: Record<ReminderState, string> = {
    overdue: theme.colors.error,
    due: theme.colors.error,
    due_soon: theme.colors.tertiary,
    upcoming: theme.colors.onSurfaceVariant,
  };

  const add = () =>
    router.push(
      vehicle ? { pathname: '/reminder/new', params: { vehicleId: vehicle.id } } : '/reminder/new',
    );

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {rows.length === 0 ? (
        <EmptyState
          icon="bell-outline"
          title={t('reminders.emptyTitle')}
          body={t('reminders.emptyBody')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {vehicle ? (
            <Text variant="titleSmall" style={styles.vehicle}>
              {vehicle.name}
            </Text>
          ) : null}
          {rows.map(({ reminder, view }) => (
            <List.Item
              key={reminder.id}
              title={reminderName(reminder, ctx)}
              description={dueText(view, today, ctx)}
              descriptionNumberOfLines={2}
              descriptionStyle={{ color: stateColor[view.state] }}
              onPress={() =>
                router.push({ pathname: '/reminder/[id]', params: { id: reminder.id } })
              }
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={
                    reminder.vehicleId === null
                      ? 'card-account-details-outline'
                      : reminder.kind === 'document'
                        ? 'file-document-outline'
                        : 'wrench-clock'
                  }
                />
              )}
              right={() => (
                <View style={styles.right}>
                  {view.state !== 'upcoming' ? (
                    <Chip compact textStyle={{ color: stateColor[view.state] }}>
                      {t(`reminders.state.${view.state}`)}
                    </Chip>
                  ) : null}
                  <Button compact onPress={() => setConfirm(reminder)}>
                    {t('reminders.markDone')}
                  </Button>
                </View>
              )}
            />
          ))}
        </ScrollView>
      )}
      <FAB icon="plus" label={t('reminders.add')} style={styles.fab} onPress={add} />
      <Portal>
        <Dialog visible={confirm !== null} onDismiss={() => setConfirm(null)}>
          <Dialog.Title>{confirm ? reminderName(confirm, ctx) : ''}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {confirm && (confirm.repeatMonths !== null || confirm.repeatDistanceM !== null)
                ? t('reminders.doneRepeats')
                : t('reminders.doneOnce')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirm(null)}>{t('common.cancel')}</Button>
            <Button
              onPress={() => {
                const id = confirm?.id;
                setConfirm(null);
                if (id) void actions.markDone(id);
              }}
            >
              {t('reminders.doneToday')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 96 },
  vehicle: { paddingHorizontal: 16, paddingTop: 16 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});

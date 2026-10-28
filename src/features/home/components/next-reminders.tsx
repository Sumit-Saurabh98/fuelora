import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { Button, Card, List, useTheme } from 'react-native-paper';

import { getContainer } from '@/container';
import { localDateOf } from '@/domain/fill-up';
import type { Vehicle } from '@/domain/vehicle';

import { useActiveReminders } from '../../reminders/hooks/use-active-reminders';
import { dueText, reminderName, sortedByUrgency } from '../../reminders/reminder-display';
import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { useOdometerForecast } from '../../vehicles/hooks/use-odometer-forecast';

const SHOWN = 3;

/** The few most urgent reminders on Home (F-06); the full list is the Reminders tab. */
export function NextReminders({ vehicle }: { vehicle: Vehicle }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { units, locale, region } = useUnitPreferences();
  const reminders = useActiveReminders(vehicle.id);
  const forecast = useOdometerForecast(vehicle);
  const today = localDateOf(getContainer().clock.now());
  const ctx = { t, units, locale, region };
  const rows = useMemo(
    () =>
      sortedByUrgency(reminders ?? [], {
        today,
        currentOdometerM: forecast?.currentOdometerM ?? null,
        avgDailyM: forecast?.avgDailyM ?? null,
      }),
    [reminders, today, forecast],
  );

  if (!reminders || !forecast) return null;
  return (
    <Card mode="outlined">
      <Card.Title title={t('home.nextReminders')} titleVariant="titleMedium" />
      {rows.length === 0 ? (
        <Card.Content>
          <Button
            mode="text"
            icon="bell-plus-outline"
            onPress={() =>
              router.push({ pathname: '/reminder/new', params: { vehicleId: vehicle.id } })
            }
            style={styles.left}
          >
            {t('home.addReminder')}
          </Button>
        </Card.Content>
      ) : (
        rows
          .slice(0, SHOWN)
          .map(({ reminder, view }) => (
            <List.Item
              key={reminder.id}
              title={reminderName(reminder, ctx)}
              description={dueText(view, today, ctx)}
              descriptionStyle={
                view.state === 'overdue' || view.state === 'due'
                  ? { color: theme.colors.error }
                  : undefined
              }
              onPress={() =>
                router.push({ pathname: '/reminder/[id]', params: { id: reminder.id } })
              }
            />
          ))
      )}
      {rows.length > SHOWN ? (
        <Card.Actions>
          <Button onPress={() => router.push('/reminders')}>{t('home.allReminders')}</Button>
        </Card.Actions>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  left: { alignSelf: 'flex-start' },
});

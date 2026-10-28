import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  Dialog,
  HelperText,
  List,
  Portal,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getContainer } from '@/container';
import { isAppError } from '@/domain/errors';
import { localDateOf } from '@/domain/fill-up';
import { servicePresetsFor } from '@/domain/presets';
import {
  DOCUMENT_KEYS,
  REMINDER_LIMITS,
  type Reminder,
  type ReminderField,
  type ReminderIssue,
  type ReminderKind,
  type ReminderTypeKey,
} from '@/domain/reminder';
import type { Vehicle } from '@/domain/vehicle';
import { DateTimeField } from '@/ui/date-time-field';
import { SegmentedControl } from '@/ui/segmented-control';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { useReminderActions } from '../hooks/use-reminder-actions';
import { useReminderForm } from '../hooks/use-reminder-form';
import { reminderName } from '../reminder-display';
import {
  blankReminder,
  isPersonLevel,
  keepUntouchedReminder,
  suggestFromInterval,
  type ReminderFormValues,
} from '../reminder-form-values';

type TextField =
  'title' | 'dueOdometer' | 'repeatMonths' | 'repeatDistance' | 'leadDays' | 'leadDistance';

const FORM_FIELD: Partial<Record<ReminderField, keyof ReminderFormValues>> = {
  title: 'title',
  dueOdometerM: 'dueOdometer',
  repeatMonths: 'repeatMonths',
  repeatDistanceM: 'repeatDistance',
  leadDays: 'leadDays',
  leadDistanceM: 'leadDistance',
};

type Props = {
  vehicle: Vehicle | null;
  /** Base for suggested due odometers (LLD §5.1); loaded by the screen. */
  currentOdometerM: number | null;
  existing?: Reminder;
};

/** Create, edit or delete a reminder (FR-12). */
export function ReminderForm({ vehicle, currentOdometerM, existing }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { region } = useUnitPreferences();
  const { form, convert, ctx, initial } = useReminderForm(vehicle, currentOdometerM, existing);
  const actions = useReminderActions();
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showLead, setShowLead] = useState(false);
  const { control, formState, setValue } = form;
  const kind = useWatch({ control, name: 'kind' });
  const typeKey = useWatch({ control, name: 'typeKey' });
  const hasDueDate = useWatch({ control, name: 'hasDueDate' });
  const personLevel = isPersonLevel(typeKey);
  const distance = t(`units.${ctx.units.distanceUnit}`);
  const today = () => localDateOf(getContainer().clock.now());
  const displayCtx = { t, units: ctx.units, locale: ctx.locale, region };

  const errorText = (field: keyof ReminderFormValues) => {
    const message = formState.errors[field]?.message;
    return message ? t(message) : undefined;
  };

  const chooseKind = (next: ReminderKind) => {
    const first: ReminderTypeKey =
      next === 'service' ? 'general_service' : next === 'document' ? 'insurance' : 'custom';
    form.reset(blankReminder(next, first, getContainer().clock.now(), ctx));
    if (next === 'service') choosePreset('general_service');
  };

  const choosePreset = (key: ReminderTypeKey) => {
    setValue('typeKey', key);
    if (existing) return; // an edit never overwrites the user's own dates
    const preset = vehicle ? servicePresetsFor(vehicle).find((p) => p.key === key) : undefined;
    if (preset) {
      const suggestion = suggestFromInterval(
        preset.interval,
        { today: today(), currentOdometerM },
        ctx,
      );
      for (const [field, value] of Object.entries(suggestion)) {
        setValue(field as keyof ReminderFormValues, value as never);
      }
    }
  };

  const save = form.handleSubmit(async (values) => {
    const result = convert(values);
    if (!result.ok) return; // the resolver already showed the errors
    setSaving(true);
    setSaveFailed(false);
    try {
      if (existing && initial) {
        await actions.update(
          existing.id,
          keepUntouchedReminder(result.input, existing, initial, values),
        );
      } else {
        await actions.create(result.input);
      }
      router.back();
    } catch (error: unknown) {
      if (isAppError(error) && error.code === 'INVALID_REMINDER') {
        const issues = (error.details?.issues ?? {}) as Partial<
          Record<ReminderField, ReminderIssue>
        >;
        for (const [field, issue] of Object.entries(issues) as [ReminderField, ReminderIssue][]) {
          form.setError(FORM_FIELD[field] ?? 'dueOdometer', {
            type: 'validate',
            message: `reminderForm.errors.${field === 'due' ? 'due' : issue}`,
          });
        }
      } else {
        setSaveFailed(true);
      }
    } finally {
      setSaving(false);
    }
  });

  const remove = async () => {
    if (!existing) return;
    setConfirmDelete(false);
    setSaving(true);
    try {
      await actions.remove(existing.id);
      router.back();
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const textField = (
    field: TextField,
    label: string,
    options: { numeric?: boolean; affix?: string; helper?: string } = {},
  ) => (
    <Controller
      control={control}
      name={field}
      render={({ field: { value, onChange, onBlur } }) => {
        const error = errorText(field);
        return (
          <View style={styles.flex}>
            <TextInput
              mode="outlined"
              label={label}
              accessibilityLabel={label}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType={options.numeric ? 'decimal-pad' : 'default'}
              maxLength={field === 'title' ? REMINDER_LIMITS.titleMax : undefined}
              right={options.affix ? <TextInput.Affix text={options.affix} /> : undefined}
              error={Boolean(error)}
            />
            <HelperText type={error ? 'error' : 'info'} visible={Boolean(error ?? options.helper)}>
              {error ?? options.helper ?? ''}
            </HelperText>
          </View>
        );
      }}
    />
  );

  const presetKeys: ReminderTypeKey[] =
    kind === 'service' && vehicle
      ? servicePresetsFor(vehicle).map((p) => p.key)
      : kind === 'document'
        ? DOCUMENT_KEYS.filter((k) => vehicle || k === 'licence')
        : [];

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <Stack.Screen
        options={{ title: existing ? t('reminderForm.editTitle') : t('reminderForm.title') }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {vehicle && !existing ? (
          <SegmentedControl
            value={kind}
            onChange={chooseKind}
            accessibilityLabel={t('reminderForm.kind')}
            segments={[
              { value: 'service', label: t('reminderForm.kinds.service') },
              { value: 'document', label: t('reminderForm.kinds.document') },
              { value: 'custom', label: t('reminderForm.kinds.custom') },
            ]}
          />
        ) : null}

        {presetKeys.length > 0 ? (
          <View style={styles.chips} accessibilityRole="radiogroup">
            {presetKeys.map((key) => (
              <Chip
                key={key}
                selected={typeKey === key}
                showSelectedOverlay
                onPress={() => choosePreset(key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: typeKey === key }}
              >
                {reminderName({ typeKey: key, title: null }, displayCtx)}
              </Chip>
            ))}
          </View>
        ) : null}
        {kind === 'custom' ? textField('title', t('reminderForm.titleLabel')) : null}
        {kind === 'service' && !existing ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('reminderForm.suggestion')}
          </Text>
        ) : null}
        {personLevel ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('reminderForm.personLevel')}
          </Text>
        ) : null}

        <Text variant="titleSmall" style={styles.section}>
          {t('reminderForm.due')}
        </Text>
        <Controller
          control={control}
          name="hasDueDate"
          render={({ field: { value, onChange } }) => (
            <View style={styles.toggle}>
              <Text variant="bodyLarge" style={styles.flex}>
                {t('reminderForm.byDate')}
              </Text>
              <Switch
                value={value}
                onValueChange={onChange}
                accessibilityLabel={t('reminderForm.byDate')}
              />
            </View>
          )}
        />
        {hasDueDate ? (
          <Controller
            control={control}
            name="dueDate"
            render={({ field: { value, onChange } }) => (
              <DateTimeField
                label={t('reminderForm.dueDate')}
                value={value}
                onChange={onChange}
                locale={ctx.locale}
                doneLabel={t('fillUp.done')}
                dateLabel={t('fillUp.date')}
                timeLabel={t('fillUp.time')}
                withTime={false}
              />
            )}
          />
        ) : null}
        {!personLevel
          ? textField('dueOdometer', t('reminderForm.dueOdometer'), {
              numeric: true,
              affix: distance,
              helper: t('reminderForm.dueHelp'),
            })
          : null}
        {personLevel && errorText('dueOdometer') ? (
          <HelperText type="error" visible>
            {errorText('dueOdometer')}
          </HelperText>
        ) : null}

        <Text variant="titleSmall" style={styles.section}>
          {t('reminderForm.repeat')}
        </Text>
        <View style={styles.row}>
          {textField('repeatMonths', t('reminderForm.repeatMonths'), { numeric: true })}
          {!personLevel
            ? textField('repeatDistance', t('reminderForm.repeatDistance'), {
                numeric: true,
                affix: distance,
              })
            : null}
        </View>

        <List.Accordion
          title={t('reminderForm.lead')}
          expanded={showLead}
          onPress={() => setShowLead((v) => !v)}
          style={styles.accordion}
        >
          <View style={styles.row}>
            {textField('leadDays', t('reminderForm.leadDays'), { numeric: true })}
            {!personLevel
              ? textField('leadDistance', t('reminderForm.leadDistance'), {
                  numeric: true,
                  affix: distance,
                })
              : null}
          </View>
        </List.Accordion>

        <HelperText type="error" visible={saveFailed}>
          {t('vehicleForm.errors.saveFailed')}
        </HelperText>
        {existing ? (
          <Button
            mode="text"
            icon="delete-outline"
            textColor={theme.colors.error}
            onPress={() => setConfirmDelete(true)}
            disabled={saving}
            contentStyle={styles.actionButton}
          >
            {t('reminderForm.delete')}
          </Button>
        ) : null}
      </ScrollView>
      <Portal>
        <Dialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <Dialog.Title>{t('reminderForm.deleteTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('reminderForm.deleteBody')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
            <Button textColor={theme.colors.error} onPress={() => void remove()}>
              {t('common.delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => void save()}
          loading={saving}
          disabled={saving}
          contentStyle={styles.button}
        >
          {t('fillUp.save')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  section: { marginTop: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  flex: { flexGrow: 1, flexBasis: 140 },
  accordion: { paddingHorizontal: 0 },
  actionButton: { minHeight: 48 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  button: { minHeight: 52 },
});

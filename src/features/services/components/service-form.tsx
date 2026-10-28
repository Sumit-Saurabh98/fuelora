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
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getContainer } from '@/container';
import { isAppError } from '@/domain/errors';
import { servicePresetsFor } from '@/domain/presets';
import {
  SERVICE_LIMITS,
  type ServiceEntry,
  type ServiceField,
  type ServiceIssue,
} from '@/domain/service-entry';
import type { Vehicle } from '@/domain/vehicle';
import { DateTimeField } from '@/ui/date-time-field';
import { currencySymbol } from '@/ui/format';

import { useServiceActions } from '../hooks/use-service-actions';
import { useServiceForm } from '../hooks/use-service-form';
import {
  keepUntouchedService,
  type ServiceFormField,
  type ServiceFormValues,
} from '../service-form-values';

const FORM_FIELD: Record<ServiceField, ServiceFormField> = {
  servicedDate: 'servicedOn',
  odometerM: 'odometer',
  typeKey: 'typeKey',
  title: 'title',
  costMinor: 'cost',
  note: 'note',
};

type Props = { vehicle: Vehicle; existing?: ServiceEntry };

/** Log a service (F-09), or edit / delete a saved one. */
export function ServiceForm({ vehicle, existing }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { form, convert, ctx, initial } = useServiceForm(vehicle, existing);
  const actions = useServiceActions();
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { control, formState } = form;
  const typeKey = useWatch({ control, name: 'typeKey' });
  const presets = servicePresetsFor(vehicle);
  const distance = t(`units.${ctx.units.distanceUnit}`);

  const errorText = (field: ServiceFormField) => {
    const message = formState.errors[field]?.message;
    return message ? t(message) : undefined;
  };

  const save = form.handleSubmit(async (values: ServiceFormValues) => {
    const result = convert(values);
    if (!result.ok) return; // the resolver already showed the errors
    setSaving(true);
    setSaveFailed(false);
    try {
      if (existing && initial) {
        await actions.update(
          existing.id,
          keepUntouchedService(result.input, existing, initial, values),
        );
      } else {
        await actions.add(result.input);
      }
      router.back();
    } catch (error: unknown) {
      if (isAppError(error) && error.code === 'INVALID_SERVICE') {
        const issues = (error.details?.issues ?? {}) as Partial<Record<ServiceField, ServiceIssue>>;
        for (const [field, issue] of Object.entries(issues) as [ServiceField, ServiceIssue][]) {
          form.setError(FORM_FIELD[field], {
            type: 'validate',
            message: `serviceForm.errors.${issue}`,
          });
        }
      } else if (isAppError(error) && error.code === 'ODOMETER_BELOW_START') {
        form.setError('odometer', { type: 'validate', message: 'serviceForm.errors.below_start' });
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
    field: 'title' | 'odometer' | 'cost' | 'note',
    label: string,
    options: {
      numeric?: boolean;
      affix?: { text: string; side: 'left' | 'right' };
      helper?: string;
      maxLength?: number;
      multiline?: boolean;
    } = {},
  ) => (
    <Controller
      control={control}
      name={field}
      render={({ field: { value, onChange, onBlur } }) => {
        const error = errorText(field);
        const affix = options.affix ? <TextInput.Affix text={options.affix.text} /> : undefined;
        return (
          <View>
            <TextInput
              mode="outlined"
              label={label}
              accessibilityLabel={label}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType={options.numeric ? 'decimal-pad' : 'default'}
              maxLength={options.maxLength}
              multiline={options.multiline}
              left={options.affix?.side === 'left' ? affix : undefined}
              right={options.affix?.side === 'right' ? affix : undefined}
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

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <Stack.Screen
        options={{ title: existing ? t('serviceForm.editTitle') : t('serviceForm.title') }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="titleMedium">{vehicle.name}</Text>

        <Controller
          control={control}
          name="servicedOn"
          render={({ field: { value, onChange } }) => (
            <DateTimeField
              label={t('serviceForm.when')}
              value={value}
              onChange={onChange}
              maximumDate={getContainer().clock.now()}
              locale={ctx.locale}
              doneLabel={t('fillUp.done')}
              dateLabel={t('fillUp.date')}
              timeLabel={t('fillUp.time')}
              error={errorText('servicedOn')}
              withTime={false}
            />
          )}
        />

        <Text variant="titleSmall">{t('serviceForm.type')}</Text>
        <Controller
          control={control}
          name="typeKey"
          render={({ field: { value, onChange } }) => (
            <View style={styles.chips} accessibilityRole="radiogroup">
              {[...presets.map((p) => p.key), 'custom' as const].map((key) => (
                <Chip
                  key={key}
                  selected={value === key}
                  showSelectedOverlay
                  onPress={() => onChange(key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: value === key }}
                >
                  {t(`servicePresets.${key}`)}
                </Chip>
              ))}
            </View>
          )}
        />
        {typeKey === 'custom'
          ? textField('title', t('serviceForm.titleLabel'), { maxLength: SERVICE_LIMITS.titleMax })
          : null}

        {textField('odometer', t('serviceForm.odometer'), {
          numeric: true,
          affix: { text: distance, side: 'right' },
          helper: t('serviceForm.odometerHelp'),
        })}
        {textField('cost', t('serviceForm.cost'), {
          numeric: true,
          affix: { text: currencySymbol(ctx.locale, ctx.units.currency), side: 'left' },
        })}
        {textField('note', t('fillUp.note'), {
          maxLength: SERVICE_LIMITS.noteMax,
          multiline: true,
        })}

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
            contentStyle={styles.deleteButton}
          >
            {t('serviceForm.delete')}
          </Button>
        ) : null}
      </ScrollView>
      <Portal>
        <Dialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <Dialog.Title>{t('serviceForm.deleteTitle')}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t('serviceForm.deleteBody')}</Text>
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
  deleteButton: { minHeight: 48 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  button: { minHeight: 52 },
});

import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getContainer } from '@/container';
import { isAppError } from '@/domain/errors';
import {
  FILL_UP_LIMITS,
  type FillUp,
  type FillUpField,
  type FillUpIssue,
  type NewFillUpInput,
} from '@/domain/fill-up';
import { baseTo, metresTo } from '@/domain/units';
import type { Vehicle } from '@/domain/vehicle';
import { DateTimeField } from '@/ui/date-time-field';
import type { FillUpWarning } from '@/services/fill-up.service';
import { EmptyState } from '@/ui/empty-state';
import { SegmentedControl } from '@/ui/segmented-control';
import { currencySymbol, formatNumber } from '@/ui/format';

import { useVehicle } from '../../vehicles/hooks/use-vehicle';
import {
  derivedField,
  derivedText,
  effectiveSources,
  quantityUnitFor,
  withEdited,
  type AmountField,
  type EntryLayout,
  type FillUpFormField,
  type FillUpFormValues,
} from '../fill-up-form-values';
import { useAddFillUp } from '../hooks/use-add-fill-up';
import { useFillUpForm } from '../hooks/use-fill-up-form';
import { useLatestFillUp } from '../hooks/use-latest-fill-up';

const FORM_FIELD: Record<FillUpField, FillUpFormField> = {
  filledAt: 'filledAt',
  odometerM: 'odometer',
  quantityBase: 'quantity',
  totalMinor: 'total',
  station: 'station',
  note: 'note',
};

export function AddFillUpScreen({ vehicleId }: { vehicleId: string }) {
  const { t } = useTranslation();
  const vehicle = useVehicle(vehicleId);
  const last = useLatestFillUp(vehicleId);

  if (vehicle === undefined || last === undefined) return null; // one frame while SQLite answers
  if (vehicle === null || vehicle.isArchived) {
    return (
      <EmptyState
        icon="car-off"
        title={t('editVehicle.notFoundTitle')}
        body={t('editVehicle.notFoundBody')}
      />
    );
  }
  // Keyed: the pre-filled price and station are read once, when the form opens.
  return <FillUpForm key={vehicle.id} vehicle={vehicle} last={last} />;
}

function FillUpForm({ vehicle, last }: { vehicle: Vehicle; last: FillUp | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { form, convert, ctx } = useFillUpForm(vehicle, last);
  const { add, odometerProblem, warnings: checkWarnings } = useAddFillUp();
  const [saving, setSaving] = useState(false);
  // Set when the entry looks unusual; the user can still save it (FR-8).
  const [pending, setPending] = useState<{
    input: NewFillUpInput;
    warnings: FillUpWarning[];
  } | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const { control, formState, setValue, getValues } = form;
  const values = useWatch({ control }) as FillUpFormValues;
  const derived = derivedField(effectiveSources(values));
  const isEv = vehicle.fuelType === 'electric';
  const unit = quantityUnitFor(vehicle.fuelType, ctx.units);
  const symbol = currencySymbol(ctx.locale, ctx.units.currency);
  const distance = t(`units.${ctx.units.distanceUnit}`);

  const errorText = (field: FillUpFormField) => {
    const error = formState.errors[field];
    if (!error?.message) return undefined;
    // Odometer order messages are translated when set, because they carry the reading.
    return error.type === 'translated' ? error.message : t(error.message);
  };

  const editAmount = (field: AmountField, text: string) => {
    setValue(field, text);
    setValue('sources', withEdited(getValues('sources'), field, text), { shouldValidate: false });
    for (const f of ['quantity', 'price', 'total'] as const) form.clearErrors(f);
  };

  const switchLayout = (layout: EntryLayout) => {
    setValue('layout', layout);
    // Into the full form, what was typed in amount mode is the two inputs.
    if (layout === 'full') {
      const typed = (['price', 'total'] as const).filter((f) => getValues(f).trim() !== '');
      setValue('sources', typed);
    }
    for (const f of ['quantity', 'price', 'total'] as const) form.clearErrors(f);
  };

  const save = form.handleSubmit(async (formValues) => {
    const result = convert(formValues);
    if (!result.ok) return; // the resolver already showed the errors
    setSaving(true);
    setSaveFailed(false);
    try {
      const problem = await odometerProblem(result.input);
      if (problem) {
        const limit =
          'limitM' in problem
            ? `${formatNumber(metresTo(problem.limitM, ctx.units.distanceUnit), ctx.locale, 1)} ${distance}`
            : '';
        form.setError('odometer', {
          type: 'translated',
          message: t(`fillUp.errors.${problem.code}`, { limit }),
        });
        return;
      }
      const warnings = await checkWarnings(result.input);
      if (warnings.length > 0) {
        setPending({ input: result.input, warnings });
        return;
      }
      await store(result.input);
    } catch (error: unknown) {
      handleSaveError(error);
    } finally {
      setSaving(false);
    }
  });

  const store = async (input: NewFillUpInput) => {
    const saved = await add(input);
    // Replace, so Done on the result card goes straight back to Home.
    router.replace({
      pathname: '/fill-up/result',
      params: { id: saved.id, vehicleId: saved.vehicleId },
    });
  };

  const saveAnyway = async () => {
    if (!pending) return;
    const { input } = pending;
    setPending(null);
    setSaving(true);
    try {
      await store(input);
    } catch (error: unknown) {
      handleSaveError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveError = (error: unknown) => {
    if (isAppError(error) && error.code === 'INVALID_FILL_UP') {
      const issues = (error.details?.issues ?? {}) as Partial<Record<FillUpField, FillUpIssue>>;
      for (const [field, issue] of Object.entries(issues) as [FillUpField, FillUpIssue][]) {
        form.setError(FORM_FIELD[field], { type: 'validate', message: `fillUp.errors.${issue}` });
      }
    } else {
      setSaveFailed(true);
    }
  };

  const warningText = (warning: FillUpWarning) => {
    if (warning.kind === 'tank') {
      const tank = vehicle.tankCapacityBase ?? 0;
      return t('fillUp.warnTank', {
        tank: `${formatNumber(baseTo(tank, unit), ctx.locale, 1)} ${t(`units.${unit}`)}`,
      });
    }
    return warning.level === 'too_high' ? t('fillUp.warnHigh') : t('fillUp.warnLow');
  };

  const amountField = (field: AmountField, label: string, affix: string) => {
    const isDerived = field === derived;
    const error = errorText(field);
    return (
      <View>
        <TextInput
          mode="outlined"
          label={label}
          accessibilityLabel={label}
          value={isDerived ? derivedText(values, ctx) : values[field]}
          onChangeText={(text) => editAmount(field, text)}
          keyboardType="decimal-pad"
          left={field === 'quantity' ? undefined : <TextInput.Affix text={affix} />}
          right={field === 'quantity' ? <TextInput.Affix text={affix} /> : undefined}
          error={Boolean(error)}
          style={isDerived ? { backgroundColor: theme.colors.surfaceVariant } : undefined}
        />
        <HelperText type={error ? 'error' : 'info'} visible={Boolean(error) || isDerived}>
          {error ?? (isDerived ? t('fillUp.calculated') : '')}
        </HelperText>
      </View>
    );
  };

  const toggle = (name: 'isFull' | 'missedPrevious', title: string, description: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <View style={styles.toggle}>
          <View style={styles.toggleText}>
            <Text variant="titleSmall">{title}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {description}
            </Text>
          </View>
          <Switch value={value} onValueChange={onChange} accessibilityLabel={title} />
        </View>
      )}
    />
  );

  const odometerError = errorText('odometer');
  const textField = (
    field: 'station' | 'note',
    label: string,
    maxLength: number,
    multiline = false,
  ) => (
    <Controller
      control={control}
      name={field}
      render={({ field: { value, onChange, onBlur } }) => (
        <View>
          <TextInput
            mode="outlined"
            label={label}
            accessibilityLabel={label}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            maxLength={maxLength}
            multiline={multiline}
            error={Boolean(errorText(field))}
          />
          <HelperText type="error" visible={Boolean(errorText(field))}>
            {errorText(field)}
          </HelperText>
        </View>
      )}
    />
  );

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <Stack.Screen options={{ title: isEv ? t('fillUp.titleCharge') : t('fillUp.title') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="titleMedium">{vehicle.name}</Text>

        <Controller
          control={control}
          name="filledAt"
          render={({ field: { value, onChange } }) => (
            <DateTimeField
              label={t('fillUp.when')}
              value={value}
              onChange={onChange}
              maximumDate={getContainer().clock.now()}
              locale={ctx.locale}
              doneLabel={t('fillUp.done')}
              dateLabel={t('fillUp.date')}
              timeLabel={t('fillUp.time')}
              error={errorText('filledAt')}
            />
          )}
        />

        <Controller
          control={control}
          name="odometer"
          render={({ field: { value, onChange, onBlur } }) => (
            <View>
              <TextInput
                mode="outlined"
                label={t('fillUp.odometer')}
                accessibilityLabel={t('fillUp.odometer')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                right={<TextInput.Affix text={distance} />}
                error={Boolean(odometerError)}
              />
              <HelperText type="error" visible={Boolean(odometerError)}>
                {odometerError}
              </HelperText>
            </View>
          )}
        />

        <SegmentedControl
          value={values.layout}
          onChange={switchLayout}
          accessibilityLabel={t('fillUp.layout')}
          segments={[
            { value: 'amount', label: t('fillUp.layoutAmount') },
            {
              value: 'full',
              label: isEv ? t('fillUp.layoutFullEv') : t('fillUp.layoutFull'),
            },
          ]}
        />
        {values.layout === 'amount' ? (
          <>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {isEv ? t('fillUp.amountHintEv') : t('fillUp.amountHint')}
            </Text>
            {amountField('total', t('fillUp.amountPaid'), symbol)}
            {amountField('price', t('fillUp.price', { unit: t(`units.${unit}`) }), symbol)}
            {derivedText(values, ctx) ? (
              <Text variant="titleMedium" accessibilityLiveRegion="polite">
                {t('fillUp.amountResult', {
                  quantity: `${derivedText(values, ctx)} ${t(`units.${unit}`)}`,
                })}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('fillUp.anyTwo')}
            </Text>
            {amountField(
              'quantity',
              isEv ? t('fillUp.energy') : t('fillUp.quantity'),
              t(`units.${unit}`),
            )}
            {amountField('price', t('fillUp.price', { unit: t(`units.${unit}`) }), symbol)}
            {amountField('total', t('fillUp.total'), symbol)}
          </>
        )}

        {toggle(
          'isFull',
          isEv ? t('fillUp.fullCharge') : t('fillUp.fullTank'),
          isEv ? t('fillUp.fullChargeHelp') : t('fillUp.fullTankHelp'),
        )}
        {toggle('missedPrevious', t('fillUp.missed'), t('fillUp.missedHelp'))}

        {textField('station', t('fillUp.station'), FILL_UP_LIMITS.stationMax)}
        {textField('note', t('fillUp.note'), FILL_UP_LIMITS.noteMax, true)}

        <HelperText type="error" visible={saveFailed}>
          {t('vehicleForm.errors.saveFailed')}
        </HelperText>
      </ScrollView>
      <Portal>
        <Dialog visible={pending !== null} onDismiss={() => setPending(null)}>
          <Dialog.Title>{t('fillUp.warnTitle')}</Dialog.Title>
          <Dialog.Content style={styles.warnings}>
            {pending?.warnings.map((w) => (
              <Text key={w.kind} variant="bodyMedium">
                {warningText(w)}
              </Text>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPending(null)}>{t('fillUp.checkAgain')}</Button>
            <Button onPress={() => void saveAnyway()}>{t('fillUp.saveAnyway')}</Button>
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
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  toggleText: { flex: 1, gap: 2 },
  warnings: { gap: 8 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  button: { minHeight: 52 },
});

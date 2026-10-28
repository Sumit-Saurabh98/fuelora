import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mileageInAllFormats, splitEvenly, tripCost, type EnergyKind } from '@/domain/calculators';
import type { EfficiencyFormat } from '@/domain/efficiency';
import { Money } from '@/domain/money';
import {
  distanceToMetres,
  parseDecimalInput,
  quantityToBase,
  type QuantityUnit,
} from '@/domain/units';
import { currencySymbol, numberSeparators } from '@/ui/format';
import { SegmentedControl } from '@/ui/segmented-control';

import { efficiencyText, quantityText } from '../../fill-up/figures-text';
import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';

type Calculator = 'trip' | 'mileage' | 'split';

const KIND_FUEL = { liquid: 'petrol', cng: 'cng', electric: 'electric' } as const;

/** Trip cost, mileage and cost split without any setup; nothing is saved (F-12, FR-21). */
export function CalculatorsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { units, locale } = useUnitPreferences();
  const separators = useMemo(() => numberSeparators(locale), [locale]);
  const [calculator, setCalculator] = useState<Calculator>('trip');
  const [kind, setKind] = useState<EnergyKind>('liquid');
  const [text, setText] = useState({
    distance: '',
    efficiency: '',
    price: '',
    people: '1',
    quantity: '',
    total: '',
  });
  const ctx = { t, units, locale };

  const num = (value: string) =>
    value.trim() === '' ? null : parseDecimalInput(value, separators);
  const field = (key: keyof typeof text, label: string, affix?: string, left = false) => (
    <TextInput
      mode="outlined"
      label={label}
      accessibilityLabel={label}
      value={text[key]}
      onChangeText={(v) => setText((s) => ({ ...s, [key]: v }))}
      keyboardType="decimal-pad"
      left={affix && left ? <TextInput.Affix text={affix} /> : undefined}
      right={affix && !left ? <TextInput.Affix text={affix} /> : undefined}
    />
  );

  const unit: QuantityUnit = kind === 'cng' ? 'kg' : kind === 'electric' ? 'kWh' : units.volumeUnit;
  const format: EfficiencyFormat =
    kind === 'cng'
      ? 'km_per_kg'
      : kind === 'electric'
        ? units.efficiencyEv
        : units.efficiencyLiquid;
  const distanceUnit = t(`units.${units.distanceUnit}`);
  const symbol = currencySymbol(locale, units.currency);
  const distance = num(text.distance);
  const distanceM = distance === null ? null : distanceToMetres(distance, units.distanceUnit);

  let result: string[] = [];
  if (calculator === 'trip') {
    const efficiency = num(text.efficiency);
    const price = num(text.price);
    const people = num(text.people) ?? 1;
    const trip =
      distanceM !== null && efficiency !== null && price !== null
        ? tripCost({
            distanceM,
            efficiency,
            format,
            unitPrice: price,
            unit,
            currency: units.currency,
            people,
          })
        : null;
    if (trip) {
      result = [
        t('calculators.fuelNeeded', {
          quantity: quantityText(trip.quantityBase, KIND_FUEL[kind], ctx),
        }),
        t('calculators.tripTotal', { total: trip.total.format(locale) }),
        ...(trip.perPerson.length > 1
          ? [t('calculators.each', { share: trip.perPerson.at(-1)!.format(locale) })]
          : []),
      ];
    }
  } else if (calculator === 'mileage') {
    const quantity = num(text.quantity);
    if (distanceM !== null && quantity !== null) {
      result = mileageInAllFormats(distanceM, quantityToBase(quantity, unit), kind).map((r) =>
        efficiencyText(r.value, r.format, ctx),
      );
    }
  } else {
    const total = num(text.total);
    const people = num(text.people);
    const shares =
      total !== null && people !== null
        ? splitEvenly(Money.fromMajor(total, units.currency), people)
        : null;
    if (shares) {
      // Shares differ by at most one minor unit; show the range when they do.
      const high = shares[0]!.format(locale);
      const low = shares.at(-1)!.format(locale);
      result = [
        high === low
          ? t('calculators.each', { share: high })
          : t('calculators.eachRange', { low, high }),
      ];
    }
  }

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SegmentedControl
          value={calculator}
          onChange={setCalculator}
          accessibilityLabel={t('calculators.which')}
          segments={[
            { value: 'trip', label: t('calculators.trip') },
            { value: 'mileage', label: t('calculators.mileage') },
            { value: 'split', label: t('calculators.split') },
          ]}
        />
        {calculator !== 'split' ? (
          <View style={styles.chips} accessibilityRole="radiogroup">
            {(['liquid', 'cng', 'electric'] as const).map((k) => (
              <Chip
                key={k}
                selected={kind === k}
                showSelectedOverlay
                onPress={() => setKind(k)}
                accessibilityRole="radio"
                accessibilityState={{ selected: kind === k }}
              >
                {t(`calculators.kinds.${k}`)}
              </Chip>
            ))}
          </View>
        ) : null}

        {calculator === 'trip' ? (
          <>
            {field('distance', t('calculators.distance'), distanceUnit)}
            {field('efficiency', t('calculators.yourMileage'), t(`efficiencyFormats.${format}`))}
            {field('price', t('fillUp.price', { unit: t(`units.${unit}`) }), symbol, true)}
            {field('people', t('calculators.people'))}
          </>
        ) : null}
        {calculator === 'mileage' ? (
          <>
            {field('distance', t('calculators.distance'), distanceUnit)}
            {field(
              'quantity',
              kind === 'electric' ? t('fillUp.energy') : t('fillUp.quantity'),
              t(`units.${unit}`),
            )}
          </>
        ) : null}
        {calculator === 'split' ? (
          <>
            {field('total', t('calculators.totalCost'), symbol, true)}
            {field('people', t('calculators.people'))}
          </>
        ) : null}

        <Card mode="contained" style={{ backgroundColor: theme.colors.primaryContainer }}>
          <Card.Content style={styles.result} accessibilityLiveRegion="polite">
            {result.length ? (
              result.map((line, i) => (
                <Text
                  key={line}
                  variant={i === 0 ? 'headlineSmall' : 'titleMedium'}
                  style={{ color: theme.colors.onPrimaryContainer }}
                >
                  {line}
                </Text>
              ))
            ) : (
              <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                {t('calculators.fillIn')}
              </Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
      <View style={styles.footer}>
        <Text variant="bodySmall" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
          {t('calculators.trackHint')}
        </Text>
        <Button
          mode="contained-tonal"
          icon="car-arrow-right"
          onPress={() => router.push('/vehicles/new')}
          contentStyle={styles.button}
        >
          {t('calculators.track')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  result: { gap: 4, paddingVertical: 8 },
  footer: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8, gap: 8 },
  center: { textAlign: 'center' },
  button: { minHeight: 52 },
});

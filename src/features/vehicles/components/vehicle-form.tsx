import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Chip, HelperText, List, Text, TextInput, useTheme } from 'react-native-paper';

import { FUEL_TYPES, VEHICLE_TYPES, VEHICLE_LIMITS } from '@/domain/vehicle';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { fuelLabelKey, VEHICLE_TYPE_ICONS } from '../vehicle-display';
import { tankUnitFor, type VehicleFormField, type VehicleFormValues } from '../vehicle-form-values';

type Props = { form: UseFormReturn<VehicleFormValues> };

/** Add-vehicle fields: essentials up front, optional details collapsed (KB #21). */
export function VehicleForm({ form }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { units, region } = useUnitPreferences();
  const [showMore, setShowMore] = useState(false);
  const { control, formState } = form;
  const fuelType = useWatch({ control, name: 'fuelType' });
  const tankUnit = tankUnitFor(fuelType, units);

  const errorText = (field: VehicleFormField) => {
    const message = formState.errors[field]?.message;
    return message ? t(message) : undefined;
  };

  const textField = (
    field: VehicleFormField,
    label: string,
    options: {
      keyboardType?: 'default' | 'decimal-pad' | 'number-pad';
      affix?: string;
      helper?: string;
      maxLength?: number;
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    } = {},
  ) => (
    <Controller
      control={control}
      name={field}
      render={({ field: { onChange, onBlur, value } }) => {
        const error = errorText(field);
        return (
          <View>
            <TextInput
              mode="outlined"
              label={label}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={error !== undefined}
              keyboardType={options.keyboardType ?? 'default'}
              autoCapitalize={options.autoCapitalize ?? 'sentences'}
              maxLength={options.maxLength}
              right={options.affix ? <TextInput.Affix text={options.affix} /> : undefined}
              accessibilityLabel={label}
            />
            <HelperText type={error ? 'error' : 'info'} visible={Boolean(error ?? options.helper)}>
              {error ?? options.helper}
            </HelperText>
          </View>
        );
      }}
    />
  );

  return (
    <View style={styles.form}>
      <Text variant="titleSmall">{t('vehicleForm.typeLabel')}</Text>
      <Controller
        control={control}
        name="type"
        render={({ field: { value, onChange } }) => (
          <View style={styles.types}>
            {VEHICLE_TYPES.map((type) => {
              const selected = value === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => onChange(type)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={t(`vehicleForm.types.${type}`)}
                  style={[
                    styles.typeCard,
                    {
                      borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                      backgroundColor: selected ? theme.colors.primaryContainer : 'transparent',
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={VEHICLE_TYPE_ICONS[type]}
                    size={28}
                    color={selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface}
                  />
                  <Text
                    variant="labelLarge"
                    style={{
                      color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                    }}
                  >
                    {t(`vehicleForm.types.${type}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      />

      <Text variant="titleSmall">{t('vehicleForm.fuelLabel')}</Text>
      <Controller
        control={control}
        name="fuelType"
        render={({ field: { value, onChange } }) => (
          <View style={styles.chips}>
            {FUEL_TYPES.map((fuel) => (
              <Chip
                key={fuel}
                selected={value === fuel}
                showSelectedOverlay
                onPress={() => onChange(fuel)}
                accessibilityRole="radio"
                accessibilityState={{ selected: value === fuel }}
              >
                {t(fuelLabelKey(fuel, region))}
              </Chip>
            ))}
          </View>
        )}
      />
      {/* Only the save can reject a fuel (KB #24: fill-ups already logged in another unit). */}
      {errorText('fuelType') ? (
        <HelperText type="error" visible>
          {errorText('fuelType')}
        </HelperText>
      ) : null}

      {textField('name', t('vehicleForm.name'), { maxLength: VEHICLE_LIMITS.nameMax })}
      {textField('odometer', t('vehicleForm.odometer'), {
        keyboardType: 'decimal-pad',
        affix: t(`units.${units.distanceUnit}`),
        helper: t('vehicleForm.odometerHelp'),
      })}

      <List.Accordion
        title={t('vehicleForm.moreDetails')}
        expanded={showMore}
        onPress={() => setShowMore((v) => !v)}
        style={styles.accordion}
        left={(props) => <List.Icon {...props} icon="text-box-plus-outline" />}
      >
        <View style={styles.more}>
          {textField('make', t('vehicleForm.make'), { maxLength: VEHICLE_LIMITS.makeModelMax })}
          {textField('model', t('vehicleForm.model'), { maxLength: VEHICLE_LIMITS.makeModelMax })}
          {textField('year', t('vehicleForm.year'), { keyboardType: 'number-pad', maxLength: 4 })}
          {textField('plate', t('vehicleForm.plate'), {
            autoCapitalize: 'characters',
            maxLength: VEHICLE_LIMITS.plateMax,
          })}
          {textField(
            'tank',
            t(fuelType === 'electric' ? 'vehicleForm.battery' : 'vehicleForm.tank'),
            { keyboardType: 'decimal-pad', affix: t(`units.${tankUnit}`) },
          )}
        </View>
      </List.Accordion>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  typeCard: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    minHeight: 72,
    borderWidth: 1.5,
    borderRadius: 16,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  accordion: { paddingHorizontal: 0 },
  more: { gap: 4, paddingTop: 4 },
});

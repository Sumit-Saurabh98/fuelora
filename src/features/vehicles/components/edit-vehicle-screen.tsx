import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Vehicle } from '@/domain/vehicle';
import { EmptyState } from '@/ui/empty-state';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { useSaveVehicle } from '../hooks/use-save-vehicle';
import { useUpdateVehicle } from '../hooks/use-update-vehicle';
import { useVehicle } from '../hooks/use-vehicle';
import { useVehicleForm } from '../hooks/use-vehicle-form';
import { keepUntouchedValues, toFormValues } from '../vehicle-form-values';
import { VehicleForm } from './vehicle-form';

export function EditVehicleScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const vehicle = useVehicle(id);

  if (vehicle === undefined) return null; // one frame while SQLite answers
  if (vehicle === null) {
    return (
      <EmptyState
        icon="car-off"
        title={t('editVehicle.notFoundTitle')}
        body={t('editVehicle.notFoundBody')}
      />
    );
  }
  // Keyed so the form starts from this vehicle's values, not a previous one's.
  return <EditVehicleForm key={vehicle.id} vehicle={vehicle} />;
}

function EditVehicleForm({ vehicle }: { vehicle: Vehicle }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { units, locale } = useUnitPreferences();
  const { form, convert } = useVehicleForm(vehicle);
  const updateVehicle = useUpdateVehicle();
  const { save, saving, saveFailed } = useSaveVehicle({
    form,
    convert,
    persist: (input) => {
      // Compare with the text the form started from (formState.dirtyFields is only tracked
      // when read during render).
      const initial = toFormValues(vehicle, { units, locale });
      const touched = {
        odometer: form.getValues('odometer') !== initial.odometer,
        tank: form.getValues('tank') !== initial.tank,
      };
      return updateVehicle(vehicle.id, keepUntouchedValues(input, vehicle, touched, units));
    },
    onSaved: () => router.back(),
  });

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <VehicleForm form={form} />
        <HelperText type="error" visible={saveFailed}>
          {t('vehicleForm.errors.saveFailed')}
        </HelperText>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => void save()}
          loading={saving}
          disabled={saving}
          contentStyle={styles.button}
        >
          {t('editVehicle.save')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, gap: 16 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  button: { minHeight: 52 },
});

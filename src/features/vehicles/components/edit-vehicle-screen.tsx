import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, HelperText, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Vehicle } from '@/domain/vehicle';
import { EmptyState } from '@/ui/empty-state';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import { useSaveVehicle } from '../hooks/use-save-vehicle';
import { useUpdateVehicle } from '../hooks/use-update-vehicle';
import { useVehicle } from '../hooks/use-vehicle';
import { useVehicleActions } from '../hooks/use-vehicle-actions';
import { useVehicleForm } from '../hooks/use-vehicle-form';
import { keepUntouchedValues, toFormValues } from '../vehicle-form-values';
import { DeleteVehicleDialog } from './delete-vehicle-dialog';
import { VehicleForm } from './vehicle-form';

export function EditVehicleScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const vehicle = useVehicle(id);
  // Set once the vehicle is deleted, so the screen doesn't flash "not found" on its way out.
  const [leaving, setLeaving] = useState(false);

  if (vehicle === undefined || leaving) return null; // undefined: one frame while SQLite answers
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
  return <EditVehicleForm key={vehicle.id} vehicle={vehicle} onDeleted={() => setLeaving(true)} />;
}

function EditVehicleForm({ vehicle, onDeleted }: { vehicle: Vehicle; onDeleted: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { units, locale } = useUnitPreferences();
  const { form, convert } = useVehicleForm(vehicle);
  const updateVehicle = useUpdateVehicle();
  const actions = useVehicleActions();
  const [deleting, setDeleting] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [actionFailed, setActionFailed] = useState(false);

  const toggleArchived = async () => {
    setArchiveBusy(true);
    setActionFailed(false);
    try {
      if (vehicle.isArchived) {
        await actions.unarchive(vehicle.id); // stays here; the screen updates live
      } else {
        await actions.archive(vehicle.id);
        router.back();
      }
    } catch {
      setActionFailed(true);
    } finally {
      setArchiveBusy(false);
    }
  };

  const remove = async () => {
    await actions.remove(vehicle.id);
    onDeleted();
    router.back();
  };
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

        <Divider />
        <View style={styles.actions}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {vehicle.isArchived ? t('editVehicle.archivedNote') : t('editVehicle.archiveNote')}
          </Text>
          <Button
            mode="outlined"
            icon={vehicle.isArchived ? 'archive-arrow-up-outline' : 'archive-outline'}
            onPress={() => void toggleArchived()}
            loading={archiveBusy}
            disabled={archiveBusy || saving}
            contentStyle={styles.actionButton}
          >
            {vehicle.isArchived ? t('editVehicle.unarchive') : t('editVehicle.archive')}
          </Button>
          <Button
            mode="text"
            icon="delete-outline"
            textColor={theme.colors.error}
            onPress={() => setDeleting(true)}
            disabled={archiveBusy || saving}
            contentStyle={styles.actionButton}
          >
            {t('editVehicle.delete')}
          </Button>
          <HelperText type="error" visible={actionFailed}>
            {t('vehicleForm.errors.saveFailed')}
          </HelperText>
        </View>
      </ScrollView>
      <DeleteVehicleDialog
        visible={deleting}
        vehicleName={vehicle.name}
        onDismiss={() => setDeleting(false)}
        onConfirm={remove}
      />
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
  actions: { gap: 8 },
  actionButton: { minHeight: 48 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  button: { minHeight: 52 },
});

import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCreateVehicle } from '../hooks/use-create-vehicle';
import { useSaveVehicle } from '../hooks/use-save-vehicle';
import { useVehicleForm } from '../hooks/use-vehicle-form';
import { VehicleForm } from './vehicle-form';

/** Add a vehicle after onboarding (e.g. the user skipped it). The stack header has the back arrow. */
export function AddVehicleScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { form, convert } = useVehicleForm();
  const createVehicle = useCreateVehicle();
  const { save, saving, saveFailed } = useSaveVehicle({
    form,
    convert,
    persist: createVehicle,
    onSaved: () => router.back(),
  });

  return (
    // The header covers the top inset; only the bottom one is ours.
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
          {t('addVehicle.save')}
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

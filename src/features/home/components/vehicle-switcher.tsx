import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Dialog, Portal, RadioButton } from 'react-native-paper';

import type { Vehicle } from '@/domain/vehicle';

import { useVehicleActions } from '../../vehicles/hooks/use-vehicle-actions';
import { VEHICLE_TYPE_ICONS } from '../../vehicles/vehicle-display';

type Props = { vehicles: readonly Vehicle[]; current: Vehicle };

/** Current vehicle on top of Home; tap to switch, add or manage vehicles (F-02, FR-4). */
export function VehicleSwitcher({ vehicles, current }: Props) {
  const { t } = useTranslation();
  const actions = useVehicleActions();
  const [open, setOpen] = useState(false);

  const choose = async (id: string) => {
    setOpen(false);
    // Home re-renders from the live query once the setting is saved.
    if (id !== current.id) await actions.select(id);
  };

  const go = (path: '/vehicles' | '/vehicles/new') => {
    setOpen(false);
    router.push(path);
  };

  return (
    <>
      <Button
        mode="contained-tonal"
        icon={({ size, color }) => (
          <MaterialCommunityIcons
            name={VEHICLE_TYPE_ICONS[current.type]}
            size={size}
            color={color}
          />
        )}
        onPress={() => setOpen(true)}
        style={styles.trigger}
        contentStyle={styles.triggerContent}
        accessibilityLabel={t('home.switchVehicle', { name: current.name })}
        accessibilityHint={t('home.switchVehicleHint')}
      >
        {`${current.name}  ▾`}
      </Button>
      <Portal>
        <Dialog visible={open} onDismiss={() => setOpen(false)}>
          <Dialog.Title>{t('home.yourVehicles')}</Dialog.Title>
          <Dialog.ScrollArea style={styles.scrollArea}>
            <ScrollView>
              <RadioButton.Group value={current.id} onValueChange={(id) => void choose(id)}>
                {vehicles.map((v) => (
                  <RadioButton.Item key={v.id} label={v.name} value={v.id} mode="android" />
                ))}
              </RadioButton.Group>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => go('/vehicles')}>{t('home.manageVehicles')}</Button>
            <Button icon="plus" onPress={() => go('/vehicles/new')}>
              {t('vehicles.add')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { alignSelf: 'flex-start', maxWidth: '100%' },
  triggerContent: { minHeight: 48, paddingHorizontal: 4 },
  scrollArea: { maxHeight: 320, paddingHorizontal: 0 },
  dialogActions: { flexWrap: 'wrap' },
});

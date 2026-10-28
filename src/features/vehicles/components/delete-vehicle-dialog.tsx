import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { Button, Dialog, HelperText, Portal, Text, TextInput, useTheme } from 'react-native-paper';

/** Typing the name must be deliberate, but case and stray spaces shouldn't block it. */
export function matchesVehicleName(typed: string, name: string): boolean {
  return typed.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase();
}

type Props = {
  visible: boolean;
  vehicleName: string;
  onDismiss: () => void;
  onConfirm: () => Promise<void>;
};

/** Delete removes every entry of the vehicle, so it needs the typed name (FR-5, rule 12). */
export function DeleteVehicleDialog({ visible, vehicleName, onDismiss, onConfirm }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const close = () => {
    setTyped('');
    setFailed(false);
    onDismiss();
  };

  const confirm = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await onConfirm();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={busy ? undefined : close}>
        <Dialog.Title>{t('editVehicle.deleteTitle')}</Dialog.Title>
        <Dialog.Content style={styles.content}>
          <Text variant="bodyMedium">{t('editVehicle.deleteBody', { name: vehicleName })}</Text>
          <TextInput
            mode="outlined"
            label={t('editVehicle.deleteTypeName')}
            accessibilityLabel={t('editVehicle.deleteTypeName')}
            placeholder={vehicleName}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <HelperText type="error" visible={failed}>
            {t('editVehicle.deleteFailed')}
          </HelperText>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={close} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            textColor={theme.colors.error}
            onPress={() => void confirm()}
            loading={busy}
            disabled={busy || !matchesVehicleName(typed, vehicleName)}
          >
            {t('common.delete')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
});

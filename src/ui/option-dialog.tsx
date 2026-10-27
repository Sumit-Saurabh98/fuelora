import { ScrollView, StyleSheet } from 'react-native';
import { Button, Dialog, Portal, RadioButton } from 'react-native-paper';

export type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  visible: boolean;
  title: string;
  options: readonly Option<T>[];
  value: T;
  cancelLabel: string;
  onSelect: (value: T) => void;
  onDismiss: () => void;
};

/** Single-choice dialog; selecting an option applies it and closes. */
export function OptionDialog<T extends string>({
  visible,
  title,
  options,
  value,
  cancelLabel,
  onSelect,
  onDismiss,
}: Props<T>) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView>
            <RadioButton.Group
              value={value}
              onValueChange={(v) => {
                const option = options.find((o) => o.value === v);
                if (option) onSelect(option.value);
              }}
            >
              {options.map((o) => (
                <RadioButton.Item key={o.value} value={o.value} label={o.label} />
              ))}
            </RadioButton.Group>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{cancelLabel}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  scrollArea: { maxHeight: 420, paddingHorizontal: 0 },
});

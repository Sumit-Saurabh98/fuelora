import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button, Dialog, HelperText, Portal, Text, useTheme } from 'react-native-paper';

import { formatDate, formatTime } from './format';

type Props = {
  label: string;
  value: Date;
  onChange: (value: Date) => void;
  /** Latest selectable date (usually now). */
  maximumDate: Date;
  locale: string;
  doneLabel: string;
  dateLabel: string;
  timeLabel: string;
  error?: string;
  /** False for calendar days (services, documents): only the date button. */
  withTime?: boolean;
};

type Mode = 'date' | 'time';

// Keeps the time when the date changes and the date when the time changes.
function merge(current: Date, picked: Date, mode: Mode): Date {
  const next = new Date(current);
  if (mode === 'date') next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
  else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return next;
}

/**
 * Date and time buttons backed by the native pickers: Android's system dialogs, and on iOS an
 * inline calendar / time wheel in a dialog (the compact iOS style is too small at 1.3× font).
 */
export function DateTimeField({
  label,
  value,
  onChange,
  maximumDate,
  locale,
  doneLabel,
  dateLabel,
  timeLabel,
  error,
  withTime = true,
}: Props) {
  const theme = useTheme();
  const [iosMode, setIosMode] = useState<Mode | null>(null);
  const [draft, setDraft] = useState(value);

  const open = (mode: Mode) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        maximumDate: mode === 'date' ? maximumDate : undefined,
        onChange: (event: DateTimePickerEvent, picked?: Date) => {
          if (event.type === 'set' && picked) onChange(merge(value, picked, mode));
        },
      });
      return;
    }
    setDraft(value);
    setIosMode(mode);
  };

  return (
    <View style={styles.field}>
      <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <View style={styles.row}>
        <Button
          mode="outlined"
          icon="calendar"
          onPress={() => open('date')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          accessibilityLabel={`${dateLabel}: ${formatDate(value, locale)}`}
        >
          {formatDate(value, locale)}
        </Button>
        {withTime ? (
          <Button
            mode="outlined"
            icon="clock-outline"
            onPress={() => open('time')}
            style={styles.button}
            contentStyle={styles.buttonContent}
            accessibilityLabel={`${timeLabel}: ${formatTime(value, locale)}`}
          >
            {formatTime(value, locale)}
          </Button>
        ) : null}
      </View>
      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : null}
      {Platform.OS === 'ios' ? (
        <Portal>
          <Dialog visible={iosMode !== null} onDismiss={() => setIosMode(null)}>
            <Dialog.Content>
              {iosMode ? (
                <DateTimePicker
                  value={draft}
                  mode={iosMode}
                  display={iosMode === 'date' ? 'inline' : 'spinner'}
                  maximumDate={iosMode === 'date' ? maximumDate : undefined}
                  locale={locale}
                  themeVariant={theme.dark ? 'dark' : 'light'}
                  accentColor={theme.colors.primary}
                  onChange={(_event, picked) => {
                    if (picked) setDraft(merge(draft, picked, iosMode));
                  }}
                />
              ) : null}
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                onPress={() => {
                  onChange(draft);
                  setIosMode(null);
                }}
              >
                {doneLabel}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { flexGrow: 1 },
  buttonContent: { minHeight: 48 },
});

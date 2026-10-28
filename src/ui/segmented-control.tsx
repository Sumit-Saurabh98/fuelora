import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export type Segment<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  segments: readonly Segment<T>[];
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/**
 * Pill-shaped single choice. Replaces Paper's SegmentedButtons, whose per-segment borders and
 * corner radii render a shaded seam on iOS: here one rounded track clips plain segments separated
 * by 1px dividers, so nothing is left for iOS to anti-alias.
 */
export function SegmentedControl<T extends string>({
  value,
  segments,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { borderColor: theme.colors.outline }]}
    >
      {segments.map((segment, index) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            onPress={() => onChange(segment.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={segment.label}
            style={({ pressed }) => [
              styles.segment,
              index > 0 && { borderLeftWidth: 1, borderLeftColor: theme.colors.outline },
              selected
                ? { backgroundColor: theme.colors.secondaryContainer }
                : pressed && { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Text
              variant="labelLarge"
              numberOfLines={1}
              style={{
                color: selected ? theme.colors.onSecondaryContainer : theme.colors.onSurface,
              }}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderWidth: 1, borderRadius: 999, overflow: 'hidden' },
  segment: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});

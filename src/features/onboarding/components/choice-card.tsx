import { Pressable, StyleSheet, View } from 'react-native';
import { RadioButton, Text, useTheme } from 'react-native-paper';

/** A large tappable radio row (≥ 48dp, NFR-6) used across onboarding steps. */
export function ChoiceCard({
  value,
  selected,
  onPress,
  children,
  description,
}: {
  value: string;
  selected: boolean;
  onPress: () => void;
  children: string;
  description?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.option,
        {
          borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
          backgroundColor: selected ? theme.colors.primaryContainer : 'transparent',
        },
      ]}
    >
      <RadioButton.Android value={value} />
      <View style={styles.optionText}>
        <Text
          variant="titleMedium"
          style={{ color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface }}
        >
          {children}
        </Text>
        {description ? (
          <Text
            variant="bodySmall"
            style={{
              color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    paddingVertical: 8,
    paddingRight: 16,
    borderWidth: 1.5,
    borderRadius: 16,
    marginBottom: 12,
  },
  optionText: { flex: 1, gap: 2 },
});

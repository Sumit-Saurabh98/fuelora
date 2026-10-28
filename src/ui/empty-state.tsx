import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

type Props = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  body: string;
  /** Optional next step, e.g. "Add your first vehicle". */
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ icon, title, body, action }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <MaterialCommunityIcons
        name={icon}
        size={56}
        color={theme.colors.primary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
        {body}
      </Text>
      {action ? (
        <Button
          mode="contained"
          icon="plus"
          onPress={action.onPress}
          style={styles.action}
          contentStyle={styles.actionContent}
        >
          {action.label}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', maxWidth: 320 },
  action: { marginTop: 8 },
  actionContent: { minHeight: 48, paddingHorizontal: 8 },
});

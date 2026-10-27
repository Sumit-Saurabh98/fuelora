import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ONBOARDING_STEPS = 3;

type Action = { label: string; onPress: () => void; loading?: boolean };

type Props = {
  /** 1-based position, shown as "Step 2 of 3". */
  step: number;
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  children: ReactNode;
  primary: Action;
  secondary?: Action;
};

/** Shared layout for onboarding steps: content scrolls, actions stay pinned at the bottom. */
export function OnboardingFrame({
  step,
  title,
  subtitle,
  header,
  children,
  primary,
  secondary,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={styles.steps}
          accessible
          accessibilityLabel={t('onboarding.stepOf', { step, total: ONBOARDING_STEPS })}
        >
          {Array.from({ length: ONBOARDING_STEPS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < step ? theme.colors.primary : theme.colors.surfaceVariant,
                  width: i === step - 1 ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
        {header}
        {title ? (
          <Text variant="headlineSmall" accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {subtitle}
          </Text>
        ) : null}
        {children}
      </ScrollView>

      <View style={styles.footer}>
        {secondary ? (
          <Button mode="text" onPress={secondary.onPress} contentStyle={styles.button}>
            {secondary.label}
          </Button>
        ) : null}
        <Button
          mode="contained"
          onPress={primary.onPress}
          loading={primary.loading}
          disabled={primary.loading}
          style={styles.primary}
          contentStyle={styles.button}
        >
          {primary.label}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 24, gap: 16 },
  steps: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 8 },
  dot: { height: 8, borderRadius: 4 },
  footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 16 },
  primary: { flex: 1 },
  button: { minHeight: 52 },
});

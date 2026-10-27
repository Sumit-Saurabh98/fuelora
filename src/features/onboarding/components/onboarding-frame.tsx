import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ONBOARDING_STEPS = 3;

type Action = { label: string; onPress: () => void; loading?: boolean; disabled?: boolean };

type Props = {
  /** 1-based position, shown as "Step 2 of 3". */
  step: number;
  title?: string;
  subtitle?: string;
  header?: ReactNode;
  children: ReactNode;
  /** The one full-width action at the bottom (Continue / Save). */
  primary: Action;
  /** Optional quieter choice under it (e.g. "Skip for now"). */
  secondary?: Action;
  /** Shows a back arrow top-left; the system back gesture works either way. */
  onBack?: () => void;
};

/**
 * Shared onboarding layout: back arrow and step dots pinned on top, content scrolls, one clear
 * full-width action at the bottom with an optional text action below it.
 */
export function OnboardingFrame({
  step,
  title,
  subtitle,
  header,
  children,
  primary,
  secondary,
  onBack,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topBar}>
        <View style={styles.side}>
          {onBack ? (
            <IconButton
              icon="arrow-left"
              onPress={onBack}
              accessibilityLabel={t('onboarding.back')}
            />
          ) : null}
        </View>
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
        {/* Same width as the back slot so the dots stay centred on every step. */}
        <View style={styles.side} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
        <Button
          mode="contained"
          onPress={primary.onPress}
          loading={primary.loading}
          disabled={primary.loading || primary.disabled}
          contentStyle={styles.button}
        >
          {primary.label}
        </Button>
        {secondary ? (
          <Button
            mode="text"
            onPress={secondary.onPress}
            loading={secondary.loading}
            disabled={secondary.loading || secondary.disabled}
            contentStyle={styles.textButton}
          >
            {secondary.label}
          </Button>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 4 },
  side: { width: 56, alignItems: 'flex-start' },
  steps: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { height: 8, borderRadius: 4 },
  content: { paddingHorizontal: 24, paddingBottom: 24, gap: 16 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8, gap: 4 },
  button: { minHeight: 52 },
  textButton: { minHeight: 48 },
});

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export function StartupError() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <MaterialCommunityIcons name="database-alert-outline" size={56} color={theme.colors.error} />
      <Text variant="titleMedium" style={styles.text}>
        {t('startup.errorTitle')}
      </Text>
      <Text variant="bodyMedium" style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>
        {t('startup.errorBody')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  text: { textAlign: 'center', maxWidth: 320 },
});

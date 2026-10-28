import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'react-native-paper';

import { useNotificationSync } from '@/features/reminders/hooks/use-notification-sync';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Home · History · Reminders · More (LLD §6); stats, calculators and settings live in More.
const TABS: readonly { name: string; titleKey: string; icon: IconName }[] = [
  { name: 'index', titleKey: 'tabs.home', icon: 'gas-station' },
  { name: 'history', titleKey: 'tabs.history', icon: 'history' },
  { name: 'reminders', titleKey: 'tabs.reminders', icon: 'bell-outline' },
  { name: 'more', titleKey: 'tabs.more', icon: 'dots-horizontal' },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  // Only after onboarding: the tabs group is the onboarded app.
  useNotificationSync();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: theme.colors.surface },
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.titleKey),
            tabBarIcon: ({ focused, size }) => (
              <MaterialCommunityIcons
                name={tab.icon}
                size={size}
                color={focused ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

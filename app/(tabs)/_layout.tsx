import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'react-native-paper';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const TABS: readonly { name: string; titleKey: string; icon: IconName }[] = [
  { name: 'index', titleKey: 'tabs.home', icon: 'gas-station' },
  { name: 'history', titleKey: 'tabs.history', icon: 'history' },
  { name: 'stats', titleKey: 'tabs.stats', icon: 'chart-line' },
  { name: 'tools', titleKey: 'tabs.tools', icon: 'calculator-variant' },
  { name: 'settings', titleKey: 'tabs.settings', icon: 'cog' },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

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

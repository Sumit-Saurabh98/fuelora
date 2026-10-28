import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { List, useTheme } from 'react-native-paper';

type Icon = ComponentProps<typeof List.Icon>['icon'];
type Entry = {
  path: '/stats' | '/tools' | '/vehicles' | '/settings';
  title: string;
  description: string;
  icon: Icon;
};

/** Less frequent places, one tap from the tab bar (LLD §6). */
export function MoreScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const entries: Entry[] = [
    {
      path: '/stats',
      title: t('tabs.stats'),
      description: t('more.statsBody'),
      icon: 'chart-line',
    },
    {
      path: '/tools',
      title: t('tools.emptyTitle'),
      description: t('more.toolsBody'),
      icon: 'calculator-variant',
    },
    {
      path: '/vehicles',
      title: t('vehicles.title'),
      description: t('more.vehiclesBody'),
      icon: 'car-multiple',
    },
    {
      path: '/settings',
      title: t('tabs.settings'),
      description: t('more.settingsBody'),
      icon: 'cog',
    },
  ];
  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }}>
      <List.Section>
        {entries.map((e) => (
          <List.Item
            key={e.path}
            title={e.title}
            description={e.description}
            left={(props) => <List.Icon {...props} icon={e.icon} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push(e.path)}
          />
        ))}
      </List.Section>
    </ScrollView>
  );
}

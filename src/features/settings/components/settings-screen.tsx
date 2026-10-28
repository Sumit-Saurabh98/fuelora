import { ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';

import { AboutSettings } from './about-settings';
import { AppearanceSettings } from './appearance-settings';
import { DeveloperSettings } from './developer-settings';
import { RegionSettings } from './region-settings';
import { UnitsSettings } from './units-settings';
import { VehiclesSettings } from './vehicles-settings';

export function SettingsScreen() {
  const theme = useTheme();
  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }}>
      <VehiclesSettings />
      <AppearanceSettings />
      <RegionSettings />
      <UnitsSettings />
      <AboutSettings />
      <DeveloperSettings />
    </ScrollView>
  );
}

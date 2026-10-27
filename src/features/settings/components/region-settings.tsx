import { useTranslation } from 'react-i18next';
import { List, RadioButton } from 'react-native-paper';

import { isRegion, REGIONS } from '@/domain/regions';

import { useUnitPreferences } from '../hooks/use-unit-preferences';
import { usePreferences } from '../preferences.store';

export function RegionSettings() {
  const { t } = useTranslation();
  const region = usePreferences((s) => s.region);
  const setRegion = usePreferences((s) => s.setRegion);
  const { deviceCurrency } = useUnitPreferences();

  return (
    <List.Section title={t('settings.region')}>
      <RadioButton.Group
        value={region}
        onValueChange={(v) => {
          if (isRegion(v)) setRegion(v);
        }}
      >
        {REGIONS.map((r) => (
          <RadioButton.Item
            key={r}
            value={r}
            label={t(`regions.${r}`, { currency: deviceCurrency })}
          />
        ))}
      </RadioButton.Group>
    </List.Section>
  );
}

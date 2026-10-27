import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { List, RadioButton } from 'react-native-paper';

import { isRegion, REGIONS } from '@/domain/regions';
import { deviceLocale } from '@/i18n/i18n';

import { usePreferences } from '../preferences.store';
import { buildRegionPreview } from '../region-preview';

// Without a device currency (rare), "Other" shows amounts in USD until the user picks one (2.5).
const FALLBACK_CURRENCY = 'USD';

export function RegionSettings() {
  const { t } = useTranslation();
  const { region, language, setRegion } = usePreferences();
  const device = useMemo(() => deviceLocale(), []);
  const deviceCurrency = device.currencyCode ?? FALLBACK_CURRENCY;

  const preview = useMemo(
    () =>
      buildRegionPreview({
        region,
        language,
        deviceCurrency,
        deviceLanguageTag: device.languageTag,
      }),
    [region, language, deviceCurrency, device.languageTag],
  );
  const { defaults, sample } = preview;

  return (
    <>
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
      <List.Section title={t('settings.regionDefaults')}>
        <List.Item
          title={t('settings.currency')}
          description={defaults.currency}
          left={(props) => <List.Icon {...props} icon="cash" />}
        />
        <List.Item
          title={t('settings.distanceUnit')}
          description={t(`units.${defaults.distanceUnit}`)}
          left={(props) => <List.Icon {...props} icon="map-marker-distance" />}
        />
        <List.Item
          title={t('settings.volumeUnit')}
          description={t(`units.${defaults.volumeUnit}`)}
          left={(props) => <List.Icon {...props} icon="gas-station" />}
        />
        <List.Item
          title={t('settings.efficiency')}
          description={t(`efficiencyFormats.${defaults.efficiencyLiquid}`)}
          left={(props) => <List.Icon {...props} icon="speedometer" />}
        />
        <List.Item
          title={t('settings.emissionName')}
          description={t(preview.emissionNameKey)}
          left={(props) => <List.Icon {...props} icon="smog" />}
        />
        <List.Item
          title={t('settings.example')}
          description={`${sample.distance} ${t(`units.${defaults.distanceUnit}`)} · ${sample.quantity} ${t(`units.${defaults.volumeUnit}`)} · ${sample.money}`}
          left={(props) => <List.Icon {...props} icon="eye-outline" />}
        />
      </List.Section>
    </>
  );
}

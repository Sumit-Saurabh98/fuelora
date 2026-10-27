import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, List } from 'react-native-paper';

import { EV_EFFICIENCY_FORMATS, LIQUID_EFFICIENCY_FORMATS } from '@/domain/efficiency-formats';
import { Money } from '@/domain/money';
import type { UnitPreference, UnitPreferences } from '@/domain/unit-preferences';
import { DISTANCE_UNITS, VOLUME_UNITS } from '@/domain/units';
import { OptionDialog, type Option } from '@/ui/option-dialog';

import { currencyOptions } from '../currency-options';
import { useUnitPreferences } from '../hooks/use-unit-preferences';
import { usePreferences } from '../preferences.store';
import { buildUnitsPreview } from '../units-preview';

type Row = {
  key: UnitPreference;
  titleKey: string;
  icon: string;
  options: Option<string>[];
  descriptionNoteKey?: string;
};

export function UnitsSettings() {
  const { t } = useTranslation();
  const { region, units, regionUnits, locale, deviceCurrency, hasOverrides } = useUnitPreferences();
  const setUnit = usePreferences((s) => s.setUnit);
  const resetUnits = usePreferences((s) => s.resetUnits);
  const [editing, setEditing] = useState<UnitPreference | null>(null);

  const preview = useMemo(
    () => buildUnitsPreview({ region, units, locale }),
    [region, units, locale],
  );

  const label = (key: UnitPreference, value: string): string => {
    switch (key) {
      case 'currency':
        return `${value} · ${Money.fromMajor(1234.5, value).format(locale)}`;
      case 'distanceUnit':
      case 'volumeUnit':
        return t(`units.${value}`);
      default:
        return t(`efficiencyFormats.${value}`);
    }
  };

  const rows: Row[] = [
    {
      key: 'currency',
      titleKey: 'settings.currency',
      icon: 'cash',
      descriptionNoteKey: 'settings.currencyNote',
      options: currencyOptions(units.currency, regionUnits.currency, deviceCurrency).map((c) => ({
        value: c,
        label: label('currency', c),
      })),
    },
    {
      key: 'distanceUnit',
      titleKey: 'settings.distanceUnit',
      icon: 'map-marker-distance',
      options: DISTANCE_UNITS.map((u) => ({ value: u, label: label('distanceUnit', u) })),
    },
    {
      key: 'volumeUnit',
      titleKey: 'settings.volumeUnit',
      icon: 'gas-station',
      options: VOLUME_UNITS.map((u) => ({ value: u, label: label('volumeUnit', u) })),
    },
    {
      key: 'efficiencyLiquid',
      titleKey: 'settings.efficiency',
      icon: 'speedometer',
      options: LIQUID_EFFICIENCY_FORMATS.map((f) => ({
        value: f,
        label: label('efficiencyLiquid', f),
      })),
    },
    {
      key: 'efficiencyEv',
      titleKey: 'settings.efficiencyEv',
      icon: 'ev-station',
      options: EV_EFFICIENCY_FORMATS.map((f) => ({ value: f, label: label('efficiencyEv', f) })),
    },
  ];

  const editingRow = rows.find((r) => r.key === editing);
  const { sample } = preview;

  return (
    <List.Section title={t('settings.units')}>
      {rows.map((row) => {
        const value = units[row.key];
        const isDefault = value === regionUnits[row.key];
        const current = label(row.key, value);
        const note = row.descriptionNoteKey ? `\n${t(row.descriptionNoteKey)}` : '';
        return (
          <List.Item
            key={row.key}
            title={t(row.titleKey)}
            description={`${current}${isDefault ? ` · ${t('settings.regionDefault')}` : ''}${note}`}
            descriptionNumberOfLines={3}
            onPress={() => setEditing(row.key)}
            left={(props) => <List.Icon {...props} icon={row.icon} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
          />
        );
      })}
      <List.Item
        title={t('settings.emissionName')}
        description={t(preview.emissionNameKey)}
        left={(props) => <List.Icon {...props} icon="smog" />}
      />
      <List.Item
        title={t('settings.example')}
        description={`${sample.distance} ${t(`units.${units.distanceUnit}`)} · ${sample.quantity} ${t(`units.${units.volumeUnit}`)} · ${sample.money}`}
        left={(props) => <List.Icon {...props} icon="eye-outline" />}
      />
      {hasOverrides ? (
        <View style={styles.reset}>
          <Button mode="outlined" icon="restore" onPress={resetUnits}>
            {t('settings.resetUnits')}
          </Button>
        </View>
      ) : null}
      {editingRow ? (
        <OptionDialog
          visible
          title={t(editingRow.titleKey)}
          options={editingRow.options}
          value={units[editingRow.key]}
          cancelLabel={t('common.cancel')}
          onSelect={(value) => {
            applyUnit(setUnit, editingRow.key, value);
            setEditing(null);
          }}
          onDismiss={() => setEditing(null)}
        />
      ) : null}
    </List.Section>
  );
}

// Options are built from each preference's own allowed values, so the cast only narrows the
// string back to that key's type.
function applyUnit(
  setUnit: <K extends UnitPreference>(key: K, value: UnitPreferences[K]) => void,
  key: UnitPreference,
  value: string,
): void {
  setUnit(key, value as UnitPreferences[typeof key]);
}

const styles = StyleSheet.create({
  reset: { paddingHorizontal: 16, paddingTop: 8, alignItems: 'flex-start' },
});

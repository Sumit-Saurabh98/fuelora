import {
  EV_EFFICIENCY_FORMATS,
  LIQUID_EFFICIENCY_FORMATS,
  type EvEfficiencyFormat,
  type LiquidEfficiencyFormat,
} from './efficiency-formats';
import { isCurrencyCode } from './money';
import type { RegionDefaults } from './regions';
import { DISTANCE_UNITS, VOLUME_UNITS, type DistanceUnit, type VolumeUnit } from './units';

// The units a user sees: the region's defaults, with any field the user changed in Settings
// overriding it (REQUIREMENTS F-14). Overrides are cleared when the region changes.
export type UnitPreferences = RegionDefaults;
export type UnitPreference = keyof UnitPreferences;
export type UnitOverrides = Partial<UnitPreferences>;

export const UNIT_PREFERENCES = [
  'currency',
  'distanceUnit',
  'volumeUnit',
  'efficiencyLiquid',
  'efficiencyEv',
] as const satisfies readonly UnitPreference[];

export function resolveUnits(defaults: UnitPreferences, overrides: UnitOverrides): UnitPreferences {
  return {
    currency: overrides.currency ?? defaults.currency,
    distanceUnit: overrides.distanceUnit ?? defaults.distanceUnit,
    volumeUnit: overrides.volumeUnit ?? defaults.volumeUnit,
    efficiencyLiquid: overrides.efficiencyLiquid ?? defaults.efficiencyLiquid,
    efficiencyEv: overrides.efficiencyEv ?? defaults.efficiencyEv,
  };
}

const oneOf =
  <T extends string>(options: readonly T[]) =>
  (value: unknown): value is T =>
    options.some((o) => o === value);

const VALIDATORS: { [K in UnitPreference]: (value: unknown) => value is UnitPreferences[K] } = {
  currency: (value: unknown): value is string => typeof value === 'string' && isCurrencyCode(value),
  distanceUnit: oneOf<DistanceUnit>(DISTANCE_UNITS),
  volumeUnit: oneOf<VolumeUnit>(VOLUME_UNITS),
  efficiencyLiquid: oneOf<LiquidEfficiencyFormat>(LIQUID_EFFICIENCY_FORMATS),
  efficiencyEv: oneOf<EvEfficiencyFormat>(EV_EFFICIENCY_FORMATS),
};

export function isValidUnitValue<K extends UnitPreference>(
  key: K,
  value: unknown,
): value is UnitPreferences[K] {
  return VALIDATORS[key](value);
}

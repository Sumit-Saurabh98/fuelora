import type { FuelType, VehicleType } from './vehicle';

// Service presets with SUGGESTED intervals (KB §5): always editable, never manufacturer advice.
// Keys are stored in `services.type_key` / `reminders.type_key`, so never rename one.
export const SERVICE_PRESET_KEYS = [
  'general_service',
  'engine_oil',
  'oil_filter',
  'air_filter',
  'chain_lube',
  'cvt_belt',
  'spark_plug',
  'brake_check',
  'tyre_rotation',
  'wheel_alignment',
  'coolant',
  'ac_service',
  'battery_check',
  'tyre_pressure',
] as const;
export type ServicePresetKey = (typeof SERVICE_PRESET_KEYS)[number];
/** A service type: a preset, or the user's own title. */
export type ServiceTypeKey = ServicePresetKey | 'custom';

export function isServiceTypeKey(value: unknown): value is ServiceTypeKey {
  return value === 'custom' || SERVICE_PRESET_KEYS.some((k) => k === value);
}

export type SuggestedInterval = {
  distanceM?: number;
  months?: number;
  days?: number;
  /** Shown as optional (tyre pressure checks). */
  optional?: boolean;
};

/** KB §5 columns; EVs use their own column whatever their body type. */
export type PresetColumn = 'bike' | 'scooter' | 'car' | 'ev';

const km = (n: number) => n * 1000;

const PRESETS: Record<ServicePresetKey, Partial<Record<PresetColumn, SuggestedInterval>>> = {
  general_service: {
    bike: { distanceM: km(3000), months: 3 },
    scooter: { distanceM: km(3000), months: 3 },
    car: { distanceM: km(10_000), months: 12 },
    ev: { distanceM: km(10_000), months: 12 },
  },
  engine_oil: {
    bike: { distanceM: km(3000), months: 6 },
    scooter: { distanceM: km(3000), months: 6 },
    car: { distanceM: km(10_000), months: 12 },
  },
  oil_filter: {
    bike: { distanceM: km(6000) },
    scooter: { distanceM: km(6000) },
    car: { distanceM: km(10_000) },
  },
  air_filter: {
    bike: { distanceM: km(6000) },
    scooter: { distanceM: km(6000) },
    car: { distanceM: km(15_000) },
  },
  chain_lube: { bike: { distanceM: km(500) } },
  cvt_belt: { scooter: { distanceM: km(20_000) } },
  spark_plug: {
    bike: { distanceM: km(10_000) },
    scooter: { distanceM: km(10_000) },
    car: { distanceM: km(30_000) },
  },
  brake_check: {
    bike: { distanceM: km(5000) },
    scooter: { distanceM: km(5000) },
    car: { distanceM: km(10_000), months: 12 },
    ev: { distanceM: km(10_000), months: 12 },
  },
  tyre_rotation: { car: { distanceM: km(10_000) }, ev: { distanceM: km(10_000) } },
  wheel_alignment: { car: { distanceM: km(10_000) }, ev: { distanceM: km(10_000) } },
  coolant: { car: { distanceM: km(40_000), months: 24 } },
  ac_service: { car: { months: 12 }, ev: { months: 12 } },
  battery_check: {
    bike: { months: 6 },
    scooter: { months: 6 },
    car: { months: 6 },
    ev: { months: 12 },
  },
  tyre_pressure: {
    bike: { days: 14, optional: true },
    scooter: { days: 14, optional: true },
    car: { days: 30, optional: true },
    ev: { days: 30, optional: true },
  },
};

/** Which KB §5 column applies; "other" vehicles get the car list. */
export function presetColumnFor(vehicle: { type: VehicleType; fuelType: FuelType }): PresetColumn {
  if (vehicle.fuelType === 'electric') return 'ev';
  if (vehicle.type === 'bike' || vehicle.type === 'scooter') return vehicle.type;
  return 'car';
}

/** Presets that apply to the vehicle, in KB §5 order, with their suggested intervals. */
export function servicePresetsFor(vehicle: {
  type: VehicleType;
  fuelType: FuelType;
}): { key: ServicePresetKey; interval: SuggestedInterval }[] {
  const column = presetColumnFor(vehicle);
  return SERVICE_PRESET_KEYS.flatMap((key) => {
    const interval = PRESETS[key][column];
    return interval ? [{ key, interval }] : [];
  });
}

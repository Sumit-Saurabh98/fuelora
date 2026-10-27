// Allowed values from REQUIREMENTS F-02 / LLD §2. Stored as text, so never rename a value;
// adding one is safe.
export const VEHICLE_TYPES = ['bike', 'scooter', 'car', 'other'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const FUEL_TYPES = ['petrol', 'diesel', 'cng', 'lpg', 'electric'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

/** A stored vehicle in canonical units (LLD §2 `vehicles`). */
export type Vehicle = {
  id: string;
  name: string;
  type: VehicleType;
  fuelType: FuelType;
  make: string | null;
  model: string | null;
  year: number | null;
  plate: string | null;
  initialOdometerM: number;
  tankCapacityBase: number | null;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** What a user supplies when adding a vehicle; optional text may be empty. */
export type NewVehicleInput = {
  name: string;
  type: VehicleType;
  fuelType: FuelType;
  initialOdometerM: number;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  plate?: string | null;
  tankCapacityBase?: number | null;
};

export type VehicleField = keyof NewVehicleInput;
export type VehicleIssue = 'required' | 'too_long' | 'out_of_range' | 'invalid';

export const VEHICLE_LIMITS = {
  nameMax: 40,
  makeModelMax: 40,
  plateMax: 20,
  // 2,000,000 km covers any real odometer; larger is a typo.
  odometerMaxM: 2_000_000_000,
  yearMin: 1900,
  // 1,000 L / kg / kWh: no road vehicle carries more.
  tankMaxBase: 1_000_000,
} as const;

export type ValidVehicleInput = {
  name: string;
  type: VehicleType;
  fuelType: FuelType;
  initialOdometerM: number;
  make: string | null;
  model: string | null;
  year: number | null;
  plate: string | null;
  tankCapacityBase: number | null;
};

export type VehicleValidation =
  | { ok: true; value: ValidVehicleInput }
  | { ok: false; issues: Partial<Record<VehicleField, VehicleIssue>> };

const isOneOf = <T extends string>(options: readonly T[], value: unknown): value is T =>
  options.some((o) => o === value);

function optionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/**
 * Checks and normalizes new-vehicle input (trims text, empty optional fields → null). Reports
 * every problem at once so a form can mark all bad fields together. `currentYear` is passed in
 * because the domain has no clock access of its own.
 */
export function validateNewVehicle(input: NewVehicleInput, currentYear: number): VehicleValidation {
  const issues: Partial<Record<VehicleField, VehicleIssue>> = {};
  const name = input.name.trim();
  const make = optionalText(input.make);
  const model = optionalText(input.model);
  // Plates are compared and shown uppercase regardless of how they were typed.
  const plate = optionalText(input.plate)?.toUpperCase() ?? null;
  const year = input.year ?? null;
  const tank = input.tankCapacityBase ?? null;

  if (name === '') issues.name = 'required';
  else if (name.length > VEHICLE_LIMITS.nameMax) issues.name = 'too_long';
  if (!isOneOf(VEHICLE_TYPES, input.type)) issues.type = 'invalid';
  if (!isOneOf(FUEL_TYPES, input.fuelType)) issues.fuelType = 'invalid';
  if (
    !Number.isSafeInteger(input.initialOdometerM) ||
    input.initialOdometerM < 0 ||
    input.initialOdometerM > VEHICLE_LIMITS.odometerMaxM
  ) {
    issues.initialOdometerM = 'out_of_range';
  }
  if (make && make.length > VEHICLE_LIMITS.makeModelMax) issues.make = 'too_long';
  if (model && model.length > VEHICLE_LIMITS.makeModelMax) issues.model = 'too_long';
  if (plate && plate.length > VEHICLE_LIMITS.plateMax) issues.plate = 'too_long';
  if (
    year !== null &&
    (!Number.isInteger(year) || year < VEHICLE_LIMITS.yearMin || year > currentYear + 1)
  ) {
    issues.year = 'out_of_range';
  }
  if (
    tank !== null &&
    (!Number.isSafeInteger(tank) || tank <= 0 || tank > VEHICLE_LIMITS.tankMaxBase)
  ) {
    issues.tankCapacityBase = 'out_of_range';
  }

  if (Object.keys(issues).length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: {
      name,
      type: input.type,
      fuelType: input.fuelType,
      initialOdometerM: input.initialOdometerM,
      make,
      model,
      year,
      plate,
      tankCapacityBase: tank,
    },
  };
}

/**
 * The vehicle that opens by default (FR-4): the saved one if it is still active, otherwise the
 * first active vehicle in switcher order; null when there are none.
 */
export function pickCurrentVehicle(
  vehicles: readonly Vehicle[],
  currentId: string | null,
): Vehicle | null {
  const active = vehicles.filter((v) => !v.isArchived);
  return active.find((v) => v.id === currentId) ?? active[0] ?? null;
}

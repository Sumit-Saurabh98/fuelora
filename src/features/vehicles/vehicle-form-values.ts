import type { UnitPreferences } from '@/domain/unit-preferences';
import {
  distanceToMetres,
  parseDecimalInput,
  quantityToBase,
  type NumberSeparators,
  type QuantityUnit,
} from '@/domain/units';
import {
  validateNewVehicle,
  type FuelType,
  type NewVehicleInput,
  type VehicleIssue,
  type VehicleType,
} from '@/domain/vehicle';

/** What the form holds: text exactly as typed, plus the two choices. */
export type VehicleFormValues = {
  type: VehicleType;
  fuelType: FuelType;
  name: string;
  odometer: string;
  make: string;
  model: string;
  year: string;
  plate: string;
  tank: string;
};

export type VehicleFormField = keyof VehicleFormValues;
/** i18n key suffix under `vehicleForm.errors`. */
export type VehicleFormError = VehicleIssue | 'not_a_number';

export type VehicleFormResult =
  | { ok: true; input: NewVehicleInput }
  | { ok: false; errors: Partial<Record<VehicleFormField, VehicleFormError>> };

/** Tank (or battery) size unit for a fuel: the user's volume unit for liquids. */
export function tankUnitFor(fuel: FuelType, units: UnitPreferences): QuantityUnit {
  if (fuel === 'cng') return 'kg';
  if (fuel === 'electric') return 'kWh';
  return units.volumeUnit;
}

const DOMAIN_TO_FORM: Partial<Record<keyof NewVehicleInput, VehicleFormField>> = {
  initialOdometerM: 'odometer',
  tankCapacityBase: 'tank',
};

/**
 * Converts typed values to canonical units (odometer → metres, tank → base units) and applies the
 * domain rules, mapping every problem back to the field the user typed it in.
 */
export function toNewVehicleInput(
  values: VehicleFormValues,
  context: { units: UnitPreferences; separators: NumberSeparators; currentYear: number },
): VehicleFormResult {
  const errors: Partial<Record<VehicleFormField, VehicleFormError>> = {};

  let initialOdometerM = 0;
  if (values.odometer.trim() === '') {
    errors.odometer = 'required';
  } else {
    const km = parseDecimalInput(values.odometer, context.separators);
    if (km === null) errors.odometer = 'not_a_number';
    else initialOdometerM = distanceToMetres(km, context.units.distanceUnit);
  }

  let year: number | null = null;
  if (values.year.trim() !== '') {
    // A year is digits only; "2,023" or "23.5" are typos, not years.
    if (/^\d{4}$/.test(values.year.trim())) year = Number(values.year.trim());
    else errors.year = 'not_a_number';
  }

  let tankCapacityBase: number | null = null;
  if (values.tank.trim() !== '') {
    const size = parseDecimalInput(values.tank, context.separators);
    if (size === null) errors.tank = 'not_a_number';
    else tankCapacityBase = quantityToBase(size, tankUnitFor(values.fuelType, context.units));
  }

  const input: NewVehicleInput = {
    name: values.name,
    type: values.type,
    fuelType: values.fuelType,
    initialOdometerM,
    make: values.make,
    model: values.model,
    year,
    plate: values.plate,
    tankCapacityBase,
  };

  const result = validateNewVehicle(input, context.currentYear);
  if (!result.ok) {
    for (const [field, issue] of Object.entries(result.issues)) {
      const formField =
        DOMAIN_TO_FORM[field as keyof NewVehicleInput] ?? (field as VehicleFormField);
      // A parse error is more useful than the range error it causes.
      errors[formField] ??= issue;
    }
  }
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, input };
}

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { isAppError } from '@/domain/errors';
import type { NewVehicleInput, VehicleField, VehicleIssue } from '@/domain/vehicle';

import type {
  VehicleFormField,
  VehicleFormResult,
  VehicleFormValues,
} from '../vehicle-form-values';

const FORM_FIELD: Partial<Record<VehicleField, VehicleFormField>> = {
  initialOdometerM: 'odometer',
  tankCapacityBase: 'tank',
};

type Options = {
  form: UseFormReturn<VehicleFormValues>;
  convert: (values: VehicleFormValues) => VehicleFormResult;
  /** Stores the checked input (create or update). */
  persist: (input: NewVehicleInput) => Promise<unknown>;
  /** Runs after the vehicle is stored (finish onboarding, go back…). */
  onSaved: () => Promise<void> | void;
};

/** Save flow shared by onboarding, the add-vehicle and the edit-vehicle screens. */
export function useSaveVehicle({ form, convert, persist, onSaved }: Options) {
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const save = form.handleSubmit(async (values) => {
    const result = convert(values);
    if (!result.ok) return; // the resolver already showed the errors
    setSaving(true);
    setSaveFailed(false);
    try {
      await persist(result.input);
      await onSaved();
    } catch (error: unknown) {
      if (isAppError(error) && error.code === 'INVALID_VEHICLE') {
        // Same rules as the form, so this is rare; show them on the right fields anyway.
        const issues = (error.details?.issues ?? {}) as Partial<Record<VehicleField, VehicleIssue>>;
        for (const [field, issue] of Object.entries(issues) as [VehicleField, VehicleIssue][]) {
          form.setError(FORM_FIELD[field] ?? (field as VehicleFormField), {
            type: 'validate',
            message: `vehicleForm.errors.${issue}`,
          });
        }
      } else {
        setSaveFailed(true);
      }
    } finally {
      setSaving(false);
    }
  });

  return { save, saving, saveFailed };
}

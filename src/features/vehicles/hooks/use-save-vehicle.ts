import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { isAppError } from '@/domain/errors';
import type { VehicleField, VehicleIssue } from '@/domain/vehicle';

import type {
  VehicleFormField,
  VehicleFormResult,
  VehicleFormValues,
} from '../vehicle-form-values';
import { useCreateVehicle } from './use-create-vehicle';

const FORM_FIELD: Partial<Record<VehicleField, VehicleFormField>> = {
  initialOdometerM: 'odometer',
  tankCapacityBase: 'tank',
};

type Options = {
  form: UseFormReturn<VehicleFormValues>;
  convert: (values: VehicleFormValues) => VehicleFormResult;
  /** Runs after the vehicle is stored (finish onboarding, go back…). */
  onSaved: () => Promise<void> | void;
};

/** Save flow shared by onboarding and the add-vehicle screen. */
export function useSaveVehicle({ form, convert, onSaved }: Options) {
  const createVehicle = useCreateVehicle();
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const save = form.handleSubmit(async (values) => {
    const result = convert(values);
    if (!result.ok) return; // the resolver already showed the errors
    setSaving(true);
    setSaveFailed(false);
    try {
      await createVehicle(result.input);
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

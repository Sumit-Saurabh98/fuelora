import { useEffect, useMemo } from 'react';
import { useForm, useWatch, type FieldErrors, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { getContainer } from '@/container';
import type { Vehicle } from '@/domain/vehicle';
import { numberSeparators } from '@/ui/format';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import {
  toFormValues,
  toNewVehicleInput,
  type VehicleFormError,
  type VehicleFormField,
  type VehicleFormResult,
  type VehicleFormValues,
} from '../vehicle-form-values';

export function toFieldErrors(
  errors: Partial<Record<VehicleFormField, VehicleFormError>>,
): FieldErrors<VehicleFormValues> {
  const out: FieldErrors<VehicleFormValues> = {};
  for (const [field, code] of Object.entries(errors) as [VehicleFormField, VehicleFormError][]) {
    out[field] = { type: 'validate', message: `vehicleForm.errors.${code}` };
  }
  return out;
}

/**
 * Form state for adding a vehicle, or editing `existing`; validation is the domain's
 * (validateNewVehicle), not a copy.
 */
export function useVehicleForm(existing?: Vehicle) {
  const { t } = useTranslation();
  const { units, locale } = useUnitPreferences();
  const separators = useMemo(() => numberSeparators(locale), [locale]);

  // react-hook-form re-reads its options (incl. the resolver) on every render, so closing over the
  // current units is enough: changing units in Settings applies to the next validation.
  const convert = (values: VehicleFormValues): VehicleFormResult =>
    toNewVehicleInput(values, {
      units,
      separators,
      currentYear: getContainer().clock.now().getFullYear(),
    });

  const resolver: Resolver<VehicleFormValues> = async (values) => {
    const result = convert(values);
    return result.ok
      ? { values, errors: {} }
      : { values: {}, errors: toFieldErrors(result.errors) };
  };

  const form = useForm<VehicleFormValues>({
    defaultValues: existing
      ? toFormValues(existing, { units, locale })
      : {
          type: 'scooter',
          fuelType: 'petrol',
          name: t('vehicleForm.defaultName.scooter'),
          odometer: '',
          make: '',
          model: '',
          year: '',
          plate: '',
          tank: '',
        },
    resolver,
    reValidateMode: 'onChange',
  });

  // Keep the suggested name in step with the type until the user writes their own. A saved
  // vehicle already has its own name.
  const type = useWatch({ control: form.control, name: 'type' });
  const suggestName = !existing && form.formState.dirtyFields.name !== true;
  useEffect(() => {
    if (suggestName) form.setValue('name', t(`vehicleForm.defaultName.${type}`));
  }, [type, suggestName, form, t]);

  return { form, convert };
}

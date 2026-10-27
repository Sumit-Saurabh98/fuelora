import { useEffect, useMemo } from 'react';
import { useForm, useWatch, type FieldErrors, type Resolver } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { getContainer } from '@/container';
import { numberSeparators } from '@/ui/format';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import {
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

/** Form state for adding a vehicle; validation is the domain's (validateNewVehicle), not a copy. */
export function useVehicleForm() {
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
    defaultValues: {
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

  // Keep the suggested name in step with the type until the user writes their own.
  const type = useWatch({ control: form.control, name: 'type' });
  const nameEdited = form.formState.dirtyFields.name === true;
  useEffect(() => {
    if (!nameEdited) form.setValue('name', t(`vehicleForm.defaultName.${type}`));
  }, [type, nameEdited, form, t]);

  return { form, convert };
}

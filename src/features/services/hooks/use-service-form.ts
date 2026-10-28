import { useMemo } from 'react';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';

import { getContainer } from '@/container';
import { localDateOf } from '@/domain/fill-up';
import type { ServiceEntry } from '@/domain/service-entry';
import type { Vehicle } from '@/domain/vehicle';
import { numberSeparators } from '@/ui/format';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import {
  toServiceFormValues,
  toServiceInput,
  type ServiceFormContext,
  type ServiceFormValues,
} from '../service-form-values';

/** Form state for a new service, or for editing `existing`. */
export function useServiceForm(vehicle: Vehicle, existing?: ServiceEntry) {
  const { units: settingsUnits, locale } = useUnitPreferences();
  // An old entry keeps the currency it was saved in (KB §3).
  const units = existing?.currency
    ? { ...settingsUnits, currency: existing.currency }
    : settingsUnits;
  const separators = useMemo(() => numberSeparators(locale), [locale]);
  const ctx: ServiceFormContext = { units, separators, locale };
  const initial = useMemo(
    () => (existing ? toServiceFormValues(existing, { units, locale }) : null),
    // Computed once per entry; later unit changes don't rewrite what the user is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existing?.id],
  );

  const convert = (values: ServiceFormValues) =>
    toServiceInput(values, {
      ...ctx,
      vehicleId: vehicle.id,
      today: localDateOf(getContainer().clock.now()),
    });

  const resolver: Resolver<ServiceFormValues> = async (values) => {
    const result = convert(values);
    if (result.ok) return { values, errors: {} };
    const errors: FieldErrors<ServiceFormValues> = {};
    for (const [field, code] of Object.entries(result.errors)) {
      errors[field as keyof ServiceFormValues] = {
        type: 'validate',
        message: `serviceForm.errors.${code}`,
      };
    }
    return { values: {}, errors };
  };

  const form = useForm<ServiceFormValues>({
    defaultValues: initial ?? {
      servicedOn: getContainer().clock.now(),
      typeKey: 'general_service',
      title: '',
      odometer: '',
      cost: '',
      note: '',
    },
    resolver,
    reValidateMode: 'onChange',
  });

  return { form, convert, ctx, initial };
}

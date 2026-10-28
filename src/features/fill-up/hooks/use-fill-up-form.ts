import { useMemo } from 'react';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';

import { getContainer } from '@/container';
import type { FillUp } from '@/domain/fill-up';
import type { Vehicle } from '@/domain/vehicle';
import { numberSeparators } from '@/ui/format';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import {
  rememberedPrice,
  toFillUpInput,
  type FillUpFormContext,
  type FillUpFormValues,
} from '../fill-up-form-values';

/** Form state for a new fill-up; the price and station come from the last entry (F-03). */
export function useFillUpForm(vehicle: Vehicle, last: FillUp | null) {
  const { units, locale } = useUnitPreferences();
  const separators = useMemo(() => numberSeparators(locale), [locale]);
  const ctx: FillUpFormContext = { fuelType: vehicle.fuelType, units, separators, locale };

  const convert = (values: FillUpFormValues) =>
    toFillUpInput(values, { ...ctx, vehicleId: vehicle.id, now: getContainer().clock.now() });

  const resolver: Resolver<FillUpFormValues> = async (values) => {
    const result = convert(values);
    if (result.ok) return { values, errors: {} };
    const errors: FieldErrors<FillUpFormValues> = {};
    for (const [field, code] of Object.entries(result.errors)) {
      errors[field as keyof FillUpFormValues] = {
        type: 'validate',
        message: `fillUp.errors.${code}`,
      };
    }
    return { values: {}, errors };
  };

  const price = rememberedPrice(last, ctx);
  const form = useForm<FillUpFormValues>({
    defaultValues: {
      filledAt: getContainer().clock.now(),
      odometer: '',
      quantity: '',
      price,
      total: '',
      // A remembered price counts as typed: entering the total alone then gives the litres.
      sources: price ? ['price'] : [],
      isFull: true,
      missedPrevious: false,
      station: last?.station ?? '',
      note: '',
    },
    resolver,
    reValidateMode: 'onChange',
  });

  return { form, convert, ctx };
}

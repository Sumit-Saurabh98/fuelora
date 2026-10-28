import { useMemo } from 'react';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';

import { getContainer } from '@/container';
import type { FillUp } from '@/domain/fill-up';
import type { Vehicle } from '@/domain/vehicle';
import { numberSeparators } from '@/ui/format';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import {
  defaultLayout,
  rememberedPrice,
  toFillUpFormValues,
  toFillUpInput,
  type FillUpFormContext,
  type FillUpFormValues,
} from '../fill-up-form-values';

/**
 * Form state for a new fill-up (price and station from the last entry, F-03), or for editing
 * `existing` (FR-11).
 */
export function useFillUpForm(vehicle: Vehicle, last: FillUp | null, existing?: FillUp) {
  const { units: settingsUnits, locale } = useUnitPreferences();
  // An old entry keeps the currency it was saved in (KB §3), even after a settings change.
  const units = existing ? { ...settingsUnits, currency: existing.currency } : settingsUnits;
  const separators = useMemo(() => numberSeparators(locale), [locale]);
  const base = { fuelType: vehicle.fuelType, units, locale };
  const price = existing ? '' : rememberedPrice(last, base);
  const ctx: FillUpFormContext = { ...base, separators, rememberedPrice: price };
  // What the edit form started from, to tell untouched fields from changed ones.
  const initial = useMemo(
    () => (existing ? toFillUpFormValues(existing, base) : null),
    // Computed once per entry; later unit changes don't rewrite what the user is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existing?.id],
  );

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

  const form = useForm<FillUpFormValues>({
    defaultValues: initial ?? {
      layout: defaultLayout(vehicle.type, price !== ''),
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

  return { form, convert, ctx, initial };
}

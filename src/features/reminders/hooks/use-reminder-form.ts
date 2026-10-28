import { useMemo } from 'react';
import { useForm, type FieldErrors, type Resolver } from 'react-hook-form';

import { getContainer } from '@/container';
import { localDateOf } from '@/domain/fill-up';
import { servicePresetsFor } from '@/domain/presets';
import type { Reminder } from '@/domain/reminder';
import type { Vehicle } from '@/domain/vehicle';
import { numberSeparators } from '@/ui/format';

import { useUnitPreferences } from '../../settings/hooks/use-unit-preferences';
import {
  blankReminder,
  suggestFromInterval,
  toReminderFormValues,
  toReminderInput,
  type ReminderFormContext,
  type ReminderFormValues,
} from '../reminder-form-values';

/** Form state for a new reminder (for `vehicle`, or person-level without one) or `existing`. */
export function useReminderForm(
  vehicle: Vehicle | null,
  currentOdometerM: number | null,
  existing?: Reminder,
) {
  const { units, locale } = useUnitPreferences();
  const separators = useMemo(() => numberSeparators(locale), [locale]);
  const ctx: ReminderFormContext = { units, separators, locale };
  const initial = useMemo(
    () => (existing ? toReminderFormValues(existing, { units, locale }) : null),
    // Computed once per reminder; later unit changes don't rewrite what the user is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existing?.id],
  );

  const convert = (values: ReminderFormValues) =>
    toReminderInput(values, { ...ctx, vehicleId: existing?.vehicleId ?? vehicle?.id ?? null });

  const resolver: Resolver<ReminderFormValues> = async (values) => {
    const result = convert(values);
    if (result.ok) return { values, errors: {} };
    const errors: FieldErrors<ReminderFormValues> = {};
    for (const [field, code] of Object.entries(result.errors)) {
      // `due` has no input of its own; its message sits under the due fields.
      const key = (field === 'due' ? 'dueOdometer' : field) as keyof ReminderFormValues;
      errors[key] = {
        type: field,
        message: `reminderForm.errors.${field === 'due' ? 'due' : code}`,
      };
    }
    return { values: {}, errors };
  };

  const now = getContainer().clock.now();
  const newValues = (): ReminderFormValues => {
    if (!vehicle) return blankReminder('document', 'licence', now, { units, locale });
    // A new vehicle reminder starts as a general service with its suggested interval (KB §5).
    const general = servicePresetsFor(vehicle).find((p) => p.key === 'general_service');
    const blank = blankReminder('service', 'general_service', now, { units, locale });
    return general
      ? {
          ...blank,
          ...suggestFromInterval(
            general.interval,
            { today: localDateOf(now), currentOdometerM },
            { units, locale },
          ),
        }
      : blank;
  };

  const form = useForm<ReminderFormValues>({
    defaultValues: initial ?? newValues(),
    resolver,
    reValidateMode: 'onChange',
  });

  return { form, convert, ctx, initial };
}

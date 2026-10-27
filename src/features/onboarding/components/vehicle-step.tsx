import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelperText } from 'react-native-paper';

import { isAppError } from '@/domain/errors';
import type { VehicleField, VehicleIssue } from '@/domain/vehicle';

import { VehicleForm } from '../../vehicles/components/vehicle-form';
import { useCreateVehicle } from '../../vehicles/hooks/use-create-vehicle';
import { useVehicleForm } from '../../vehicles/hooks/use-vehicle-form';
import type { VehicleFormField } from '../../vehicles/vehicle-form-values';
import { useOnboarding } from '../onboarding.store';
import { OnboardingFrame } from './onboarding-frame';

const FORM_FIELD: Partial<Record<VehicleField, VehicleFormField>> = {
  initialOdometerM: 'odometer',
  tankCapacityBase: 'tank',
};

export function VehicleStep() {
  const { t } = useTranslation();
  const { form, convert } = useVehicleForm();
  const createVehicle = useCreateVehicle();
  const complete = useOnboarding((s) => s.complete);
  const [busy, setBusy] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const save = form.handleSubmit(async (values) => {
    const result = convert(values);
    if (!result.ok) return; // the resolver already showed the errors
    setBusy(true);
    setSaveFailed(false);
    try {
      await createVehicle(result.input);
      await complete();
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
      setBusy(false);
    }
  });

  const skip = async () => {
    setBusy(true);
    try {
      await complete();
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingFrame
      step={3}
      title={t('onboarding.vehicleTitle')}
      subtitle={t('onboarding.vehicleSubtitle')}
      onBack={() => router.back()}
      primary={{ label: t('onboarding.save'), onPress: save, loading: busy }}
      secondary={{ label: t('onboarding.skip'), onPress: skip, disabled: busy }}
    >
      <VehicleForm form={form} />
      <HelperText type="error" visible={saveFailed}>
        {t('vehicleForm.errors.saveFailed')}
      </HelperText>
    </OnboardingFrame>
  );
}

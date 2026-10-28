import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelperText } from 'react-native-paper';

import { VehicleForm } from '../../vehicles/components/vehicle-form';
import { useCreateVehicle } from '../../vehicles/hooks/use-create-vehicle';
import { useSaveVehicle } from '../../vehicles/hooks/use-save-vehicle';
import { useVehicleForm } from '../../vehicles/hooks/use-vehicle-form';
import { useOnboarding } from '../onboarding.store';
import { OnboardingFrame } from './onboarding-frame';

export function VehicleStep() {
  const { t } = useTranslation();
  const { form, convert } = useVehicleForm();
  const complete = useOnboarding((s) => s.complete);
  const createVehicle = useCreateVehicle();
  const { save, saving, saveFailed } = useSaveVehicle({
    form,
    convert,
    persist: createVehicle,
    onSaved: complete,
  });
  const [skipping, setSkipping] = useState(false);

  const skip = async () => {
    setSkipping(true);
    try {
      await complete();
    } finally {
      setSkipping(false);
    }
  };

  return (
    <OnboardingFrame
      step={3}
      title={t('onboarding.vehicleTitle')}
      subtitle={t('onboarding.vehicleSubtitle')}
      onBack={() => router.back()}
      primary={{ label: t('onboarding.save'), onPress: save, loading: saving, disabled: skipping }}
      secondary={{
        label: t('onboarding.skip'),
        onPress: skip,
        loading: skipping,
        disabled: saving,
      }}
    >
      <VehicleForm form={form} />
      <HelperText type="error" visible={saveFailed}>
        {t('vehicleForm.errors.saveFailed')}
      </HelperText>
    </OnboardingFrame>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { FillUp } from '@/domain/fill-up';
import { EmptyState } from '@/ui/empty-state';

import { useVehicle } from '../../vehicles/hooks/use-vehicle';
import { useFillUp } from '../hooks/use-fill-up';
import { FillUpForm } from './add-fill-up-screen';

/** Edit or delete a saved fill-up, opened from History (F-07, FR-11). */
export function EditFillUpScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const fillUp = useFillUp(id);
  const vehicle = useVehicle(fillUp?.vehicleId ?? '');
  // The first loaded row; later live updates (incl. our own save or delete) don't reset the form.
  const [existing, setExisting] = useState<FillUp | null>(null);
  if (!existing && fillUp) setExisting(fillUp);

  if (fillUp === undefined || (fillUp && (vehicle === undefined || !existing))) return null;
  if (!existing || !vehicle) {
    return (
      <EmptyState
        icon="gas-station-off-outline"
        title={t('fillUp.notFoundTitle')}
        body={t('fillUp.notFoundBody')}
      />
    );
  }
  return <FillUpForm key={existing.id} vehicle={vehicle} last={null} existing={existing} />;
}

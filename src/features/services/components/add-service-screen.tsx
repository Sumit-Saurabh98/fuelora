import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/ui/empty-state';

import { useVehicle } from '../../vehicles/hooks/use-vehicle';
import { ServiceForm } from './service-form';

export function AddServiceScreen({ vehicleId }: { vehicleId: string }) {
  const { t } = useTranslation();
  const vehicle = useVehicle(vehicleId);
  if (vehicle === undefined) return null; // one frame while SQLite answers
  if (vehicle === null || vehicle.isArchived) {
    return (
      <EmptyState
        icon="car-off"
        title={t('editVehicle.notFoundTitle')}
        body={t('editVehicle.notFoundBody')}
      />
    );
  }
  return <ServiceForm key={vehicle.id} vehicle={vehicle} />;
}

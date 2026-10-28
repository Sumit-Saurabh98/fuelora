import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ServiceEntry } from '@/domain/service-entry';
import { EmptyState } from '@/ui/empty-state';

import { useVehicle } from '../../vehicles/hooks/use-vehicle';
import { useService } from '../hooks/use-service';
import { ServiceForm } from './service-form';

/** Edit or delete a saved service, opened from History. */
export function EditServiceScreen({ id }: { id: string }) {
  const { t } = useTranslation();
  const service = useService(id);
  const vehicle = useVehicle(service?.vehicleId ?? '');
  // The first loaded row; later live updates (incl. our own save or delete) don't reset the form.
  const [existing, setExisting] = useState<ServiceEntry | null>(null);
  if (!existing && service) setExisting(service);

  if (service === undefined || (service && (vehicle === undefined || !existing))) return null;
  if (!existing || !vehicle) {
    return (
      <EmptyState
        icon="wrench-outline"
        title={t('fillUp.notFoundTitle')}
        body={t('fillUp.notFoundBody')}
      />
    );
  }
  return <ServiceForm key={existing.id} vehicle={vehicle} existing={existing} />;
}

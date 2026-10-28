import { getContainer } from '@/container';

export function useVehicleActions() {
  const service = () => getContainer().vehicleService;
  return {
    /** Makes it the vehicle that opens by default (FR-4). */
    select: (id: string) => service().setCurrent(id),
    archive: (id: string) => service().archive(id),
    unarchive: (id: string) => service().unarchive(id),
    remove: (id: string) => service().delete(id),
  };
}

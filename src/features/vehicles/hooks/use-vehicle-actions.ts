import { getContainer } from '@/container';

export function useVehicleActions() {
  const service = () => getContainer().vehicleService;
  return {
    archive: (id: string) => service().archive(id),
    unarchive: (id: string) => service().unarchive(id),
    remove: (id: string) => service().delete(id),
  };
}

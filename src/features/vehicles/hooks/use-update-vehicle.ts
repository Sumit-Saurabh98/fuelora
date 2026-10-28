import { getContainer } from '@/container';
import type { NewVehicleInput, Vehicle } from '@/domain/vehicle';

export function useUpdateVehicle(): (id: string, input: NewVehicleInput) => Promise<Vehicle> {
  return (id, input) => getContainer().vehicleService.update(id, input);
}

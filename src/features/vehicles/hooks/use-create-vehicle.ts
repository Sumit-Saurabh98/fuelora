import { getContainer } from '@/container';
import type { NewVehicleInput, Vehicle } from '@/domain/vehicle';

export function useCreateVehicle(): (input: NewVehicleInput) => Promise<Vehicle> {
  return (input) => getContainer().vehicleService.create(input);
}

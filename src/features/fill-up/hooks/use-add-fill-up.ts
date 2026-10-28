import { getContainer } from '@/container';
import type { FillUp, NewFillUpInput, OdometerProblem } from '@/domain/fill-up';

export function useAddFillUp() {
  const service = () => getContainer().fillUpService;
  return {
    add: (input: NewFillUpInput): Promise<FillUp> => service().add(input),
    odometerProblem: (input: NewFillUpInput): Promise<OdometerProblem | null> =>
      service().odometerProblem(input.vehicleId, input, null),
  };
}

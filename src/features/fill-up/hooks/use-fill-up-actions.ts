import { getContainer } from '@/container';
import type { FillUp, NewFillUpInput, OdometerProblem } from '@/domain/fill-up';
import type { FillUpWarning } from '@/services/fill-up.service';

/** Fill-up writes and pre-save checks; `editingId` excludes the entry being edited (FR-11). */
export function useFillUpActions() {
  const service = () => getContainer().fillUpService;
  return {
    add: (input: NewFillUpInput): Promise<FillUp> => service().add(input),
    update: (id: string, input: NewFillUpInput): Promise<FillUp> => service().update(id, input),
    remove: (id: string): Promise<void> => service().delete(id),
    odometerProblem: (
      input: NewFillUpInput,
      editingId: string | null,
    ): Promise<OdometerProblem | null> =>
      service().odometerProblem(input.vehicleId, input, editingId),
    warnings: (input: NewFillUpInput, editingId: string | null): Promise<FillUpWarning[]> =>
      service().warnings(input, editingId),
  };
}

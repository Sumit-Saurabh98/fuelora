import { getContainer } from '@/container';
import type { NewServiceInput, ServiceEntry } from '@/domain/service-entry';

export function useServiceActions() {
  const service = () => getContainer().serviceLogService;
  return {
    add: (input: NewServiceInput): Promise<ServiceEntry> => service().add(input),
    update: (id: string, input: NewServiceInput): Promise<ServiceEntry> =>
      service().update(id, input),
    remove: (id: string): Promise<void> => service().delete(id),
  };
}

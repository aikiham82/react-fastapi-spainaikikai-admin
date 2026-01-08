import { useQuery } from '@tanstack/react-query';
import { licenseService } from '../../data/services/license.service';
import type { LicenseFilters } from '../../data/schemas/license.schema';

export const useLicensesQuery = (filters?: LicenseFilters) => {
  return useQuery({
    queryKey: ['licenses', filters],
    queryFn: () => licenseService.getLicenses(filters),
    staleTime: 2 * 60 * 1000,
  });
};

export const useLicenseQuery = (id: string) => {
  return useQuery({
    queryKey: ['license', id],
    queryFn: () => licenseService.getLicense(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

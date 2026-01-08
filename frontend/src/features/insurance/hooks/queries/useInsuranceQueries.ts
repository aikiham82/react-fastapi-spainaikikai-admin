import { useQuery } from '@tanstack/react-query';
import { insuranceService } from '../../data/services/insurance.service';
import type { InsuranceFilters } from '../../data/schemas/insurance.schema';

export const useInsuranceQuery = (filters?: InsuranceFilters) => {
  return useQuery({
    queryKey: ['insurance', filters],
    queryFn: () => insuranceService.getInsurance(filters),
    staleTime: 2 * 60 * 1000,
  });
};

export const useInsurancePolicyQuery = (id: string) => {
  return useQuery({
    queryKey: ['insurance', id],
    queryFn: () => insuranceService.getInsurancePolicy(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

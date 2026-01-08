import { useQuery } from '@tanstack/react-query';
import { seminarService } from '../../data/services/seminar.service';
import type { SeminarFilters } from '../../data/schemas/seminar.schema';

export const useSeminarsQuery = (filters?: SeminarFilters) => {
  return useQuery({
    queryKey: ['seminars', filters],
    queryFn: () => seminarService.getSeminars(filters),
    staleTime: 2 * 60 * 1000,
  });
};

export const useSeminarQuery = (id: string) => {
  return useQuery({
    queryKey: ['seminar', id],
    queryFn: () => seminarService.getSeminar(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

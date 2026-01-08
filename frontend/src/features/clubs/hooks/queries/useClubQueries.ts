import { useQuery } from '@tanstack/react-query';
import { clubService } from '../../data/services/club.service';
import type { ClubFilters } from '../../data/schemas/club.schema';

export const useClubsQuery = (filters?: ClubFilters) => {
  return useQuery({
    queryKey: ['clubs', filters],
    queryFn: () => clubService.getClubs(filters),
    staleTime: 2 * 60 * 1000,
  });
};

export const useClubQuery = (id: string) => {
  return useQuery({
    queryKey: ['club', id],
    queryFn: () => clubService.getClub(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

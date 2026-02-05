import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { memberService } from '../../data/services/member.service';
import type { Member, MemberFilters } from '../../data/schemas/member.schema';

interface UseMembersQueryOptions {
  enabled?: boolean;
}

export const useMembersQuery = (
  filters?: MemberFilters,
  options?: UseMembersQueryOptions
) => {
  return useQuery({
    queryKey: ['members', filters],
    queryFn: () => memberService.getMembers(filters),
    staleTime: 2 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
};

export const useMemberQuery = (id: string) => {
  return useQuery({
    queryKey: ['member', id],
    queryFn: () => memberService.getMember(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

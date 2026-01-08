import { useQuery } from '@tanstack/react-query';
import { memberService } from '../../data/services/member.service';
import type { MemberFilters } from '../../data/schemas/member.schema';

export const useMembersQuery = (filters?: MemberFilters) => {
  return useQuery({
    queryKey: ['members', filters],
    queryFn: () => memberService.getMembers(filters),
    staleTime: 2 * 60 * 1000,
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

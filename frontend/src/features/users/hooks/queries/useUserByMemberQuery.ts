import { useQuery } from '@tanstack/react-query';
import { getUserByMember } from '../../data/services/user.service';
import type { UserAccount } from '../../data/schemas/user.schema';

export const useUserByMemberQuery = (memberId?: string, enabled = true) => {
  return useQuery<UserAccount>({
    queryKey: ['user-by-member', memberId],
    queryFn: () => getUserByMember(memberId as string),
    enabled: Boolean(memberId) && enabled,
    retry: false,
  });
};

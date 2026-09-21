import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserAccounts } from '../../data/services/user.service';
import type { UserAccount } from '../../data/schemas/user.schema';

const EMPTY_SET: ReadonlySet<string> = new Set();

export const useMembersWithAccountQuery = (enabled: boolean) => {
  const { data, isLoading } = useQuery<UserAccount[]>({
    queryKey: ['user-accounts'],
    queryFn: getUserAccounts,
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const memberIdsWithAccount = useMemo(() => {
    if (!data) return EMPTY_SET;

    return new Set(
      data
        .map((account) => account.member_id)
        .filter((memberId): memberId is string => Boolean(memberId))
    );
  }, [data]);

  return { memberIdsWithAccount, isLoading };
};

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';

vi.mock('@/features/users/data/services/user.service', () => ({
  getUserAccounts: vi.fn(),
}));

import { useMembersWithAccountQuery } from '../../queries/useMembersWithAccountQuery';
import { getUserAccounts } from '@/features/users/data/services/user.service';

const mockGetUserAccounts = getUserAccounts as unknown as ReturnType<typeof vi.fn>;

const accounts = [
  {
    id: 'user-1',
    email: 'club@example.com',
    username: 'KUKI AIKIKAI',
    is_active: true,
    global_role: 'user',
    member_id: 'member-1',
  },
  {
    id: 'user-2',
    email: 'admin@spainaikikai.org',
    username: 'Admin',
    is_active: true,
    global_role: 'super_admin',
    member_id: null,
  },
];

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useMembersWithAccountQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserAccounts.mockResolvedValue(accounts);
  });

  it('returns the ids of the members holding an account', async () => {
    const { result } = renderHook(() => useMembersWithAccountQuery(true), { wrapper });

    await waitFor(() => expect(result.current.memberIdsWithAccount.has('member-1')).toBe(true));
    expect(result.current.memberIdsWithAccount.has('member-2')).toBe(false);
  });

  it('ignores accounts not linked to any member', async () => {
    const { result } = renderHook(() => useMembersWithAccountQuery(true), { wrapper });

    await waitFor(() => expect(result.current.memberIdsWithAccount.size).toBe(1));
  });

  it('does not request the accounts when the caller is not a super admin', async () => {
    const { result } = renderHook(() => useMembersWithAccountQuery(false), { wrapper });

    await waitFor(() => expect(result.current.memberIdsWithAccount.size).toBe(0));
    expect(mockGetUserAccounts).not.toHaveBeenCalled();
  });
});

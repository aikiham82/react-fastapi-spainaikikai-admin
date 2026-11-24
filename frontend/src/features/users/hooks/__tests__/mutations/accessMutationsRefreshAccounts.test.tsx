import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';

vi.mock('@/features/users/data/services/user.service', () => ({
  grantMemberAccess: vi.fn(),
  revokeMemberAccess: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useGrantMemberAccessMutation } from '../../mutations/useGrantMemberAccessMutation';
import { useRevokeMemberAccessMutation } from '../../mutations/useRevokeMemberAccessMutation';
import { grantMemberAccess, revokeMemberAccess } from '@/features/users/data/services/user.service';

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  const invalidatedKeys = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey);
  return { wrapper, invalidatedKeys };
};

describe('access mutations refresh the accounts behind the "Acceso" badge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes the accounts after giving access', async () => {
    vi.mocked(grantMemberAccess).mockResolvedValue({
      url: 'https://admin.example.com/reset?token=t',
      email: 'club@example.com',
      expires_at: '2026-11-25T10:00:00',
    });
    const { wrapper, invalidatedKeys } = setup();
    const { result } = renderHook(() => useGrantMemberAccessMutation(), { wrapper });

    result.current.mutate({ memberId: 'member-1', email: 'club@example.com', clubAdmin: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidatedKeys()).toContainEqual(['user-accounts']);
    expect(invalidatedKeys()).toContainEqual(['user-by-member']);
  });

  it('refreshes the accounts after removing access', async () => {
    vi.mocked(revokeMemberAccess).mockResolvedValue(undefined);
    const { wrapper, invalidatedKeys } = setup();
    const { result } = renderHook(() => useRevokeMemberAccessMutation(), { wrapper });

    result.current.mutate('member-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidatedKeys()).toContainEqual(['user-accounts']);
  });
});

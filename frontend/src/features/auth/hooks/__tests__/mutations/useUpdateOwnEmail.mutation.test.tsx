import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'

vi.mock('@/features/auth/data/auth.service', () => ({
  authService: {
    updateOwnEmail: vi.fn(),
  },
}))

import { useUpdateOwnEmailMutation } from '../../mutations/useUpdateOwnEmail.mutation'
import { authService } from '@/features/auth/data/auth.service'

const mockUpdateOwnEmail = authService.updateOwnEmail as unknown as ReturnType<typeof vi.fn>

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

const wrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children)

describe('useUpdateOwnEmailMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockUpdateOwnEmail.mockResolvedValue({ access_token: 'fresh.jwt.token', token_type: 'bearer' })
  })

  it('stores the token the API returns, so the session survives the change', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateOwnEmailMutation(), { wrapper })

    result.current.mutate({ email: 'leon.aikikai@gmail.com', current_password: 'right' })

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBe('fresh.jwt.token')
    })
    expect(mockUpdateOwnEmail).toHaveBeenCalledWith({
      email: 'leon.aikikai@gmail.com',
      current_password: 'right',
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['currentUser'] })
  })

  it('leaves the stored token untouched when the change fails', async () => {
    localStorage.setItem('access_token', 'old.jwt.token')
    mockUpdateOwnEmail.mockRejectedValue({ status: 409, detail: 'taken' })

    const { result } = renderHook(() => useUpdateOwnEmailMutation(), { wrapper })
    result.current.mutate({ email: 'taken@example.com', current_password: 'right' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(localStorage.getItem('access_token')).toBe('old.jwt.token')
  })
})

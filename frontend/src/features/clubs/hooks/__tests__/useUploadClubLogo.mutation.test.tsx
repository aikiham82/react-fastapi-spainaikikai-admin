import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { type ReactNode } from 'react'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../data/services/club.service', () => ({
  clubService: { uploadLogo: vi.fn() },
}))

import { useUploadClubLogoMutation } from '../mutations/useClubMutations'
import { clubService } from '../../data/services/club.service'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

const wrapper = ({ children }: { children: ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children)

describe('useUploadClubLogoMutation', () => {
  it('refreshes the club and the signed-in identity so the rail shows the new logo', async () => {
    vi.mocked(clubService.uploadLogo).mockResolvedValue({ id: 'c1', name: 'Club Ejemplo' } as never)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const file = new File(['logo'], 'logo.png', { type: 'image/png' })
    const { result } = renderHook(() => useUploadClubLogoMutation(), { wrapper })

    result.current.mutate({ clubId: 'c1', file })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(clubService.uploadLogo).toHaveBeenCalledWith('c1', file)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['club'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['currentUser'] })
  })
})

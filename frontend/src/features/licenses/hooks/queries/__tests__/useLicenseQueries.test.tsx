import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useLicensesQuery } from '../useLicenseQueries'
import { licenseService } from '../../../data/services/license.service'

vi.mock('../../../data/services/license.service', () => ({
  licenseService: { getLicenses: vi.fn() },
}))

describe('useLicensesQuery', () => {
  it('keeps the current licences while another filter loads', async () => {
    const firstPage = { items: [], total: 24, offset: 0, limit: 0 }
    vi.mocked(licenseService.getLicenses)
      .mockResolvedValueOnce(firstPage as never)
      .mockReturnValueOnce(new Promise(() => {}) as never)
    const client = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result, rerender } = renderHook(({ clubId }) => useLicensesQuery({ club_id: clubId }), {
      wrapper,
      initialProps: { clubId: undefined as string | undefined },
    })
    await waitFor(() => expect(result.current.data).toBe(firstPage))

    rerender({ clubId: 'club-1' })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBe(firstPage)
  })
})

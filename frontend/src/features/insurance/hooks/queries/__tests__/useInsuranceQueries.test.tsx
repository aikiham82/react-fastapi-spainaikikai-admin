import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useInsuranceQuery } from '../useInsuranceQueries'
import { insuranceService } from '../../../data/services/insurance.service'

vi.mock('../../../data/services/insurance.service', () => ({
  insuranceService: { getInsurance: vi.fn() },
}))

describe('useInsuranceQuery', () => {
  it('keeps the current insurances while another filter loads', async () => {
    const firstPage = { items: [], total: 32, offset: 0, limit: 0 }
    vi.mocked(insuranceService.getInsurance)
      .mockResolvedValueOnce(firstPage as never)
      .mockReturnValueOnce(new Promise(() => {}) as never)
    const client = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result, rerender } = renderHook(({ clubId }) => useInsuranceQuery({ club_id: clubId }), {
      wrapper,
      initialProps: { clubId: undefined as string | undefined },
    })
    await waitFor(() => expect(result.current.data).toBe(firstPage))

    rerender({ clubId: 'club-1' })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBe(firstPage)
  })
})

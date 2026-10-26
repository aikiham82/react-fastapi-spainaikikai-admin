import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSeminarOfficialidadPriceQuery } from '../useSeminarPriceQuery'

const service = vi.hoisted(() => ({ getSeminarOficialidadPrice: vi.fn() }))
vi.mock('../../../data/services/seminar.service', () => ({ seminarService: service }))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe('useSeminarOfficialidadPriceQuery', () => {
  it('loads the price through the seminar service when enabled', async () => {
    service.getSeminarOficialidadPrice.mockResolvedValue({ key: 'seminar-price', price: 25 })
    const { result } = renderHook(() => useSeminarOfficialidadPriceQuery(true), { wrapper })

    await waitFor(() => expect(result.current.data?.price).toBe(25))
  })

  it('does not fetch while disabled', () => {
    service.getSeminarOficialidadPrice.mockClear()
    renderHook(() => useSeminarOfficialidadPriceQuery(false), { wrapper })

    expect(service.getSeminarOficialidadPrice).not.toHaveBeenCalled()
  })
})

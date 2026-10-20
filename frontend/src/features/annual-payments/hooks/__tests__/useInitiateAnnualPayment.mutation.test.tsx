import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { toast } from 'sonner'
import type { ApiError } from '@/core/data/apiClient'
import { annualPaymentService } from '../../data/services/annual-payment.service'
import { useInitiateAnnualPaymentMutation } from '../mutations/useInitiateAnnualPayment.mutation'
import type { InitiateAnnualPaymentRequest } from '../../data/schemas/annual-payment.schema'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const request: InitiateAnnualPaymentRequest = {
  payer_name: 'Example Club',
  club_id: 'club-1',
  payment_year: 2026,
  include_club_fee: false,
  kyu_count: 0,
  kyu_infantil_count: 0,
  dan_count: 0,
  fukushidoin_count: 0,
  shidoin_count: 0,
  seguro_accidentes_count: 1,
  seguro_rc_count: 0,
}

describe('useInitiateAnnualPaymentMutation', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('shows the backend detail when the API rejects the payment', async () => {
    const apiError: ApiError = {
      message: 'Request failed with status code 400',
      detail: 'Los siguientes miembros ya tienen pagos completados para este año: Ana Example (seguro_accidentes)',
      status: 400,
    }
    vi.spyOn(annualPaymentService, 'initiateAnnualPayment').mockRejectedValue(apiError)

    const { result } = renderHook(() => useInitiateAnnualPaymentMutation(), { wrapper })
    result.current.mutate(request)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(toast.error).toHaveBeenCalledWith(apiError.detail)
  })
})

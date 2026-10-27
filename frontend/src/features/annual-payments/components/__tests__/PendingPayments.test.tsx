import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { AnnualPaymentProvider } from '../../hooks/useAnnualPaymentContext'
import { PendingPayments } from '../PendingPayments'
import type { Member } from '@/features/members/data/schemas/member.schema'
import type { AnnualPaymentPrices, PrefillAnnualPaymentResponse } from '../../data/schemas/annual-payment.schema'

const refetch = vi.fn()
let prefillState: { data?: PrefillAnnualPaymentResponse; isLoading: boolean; isError: boolean }
let prices: Partial<AnnualPaymentPrices>

vi.mock('@/features/auth/hooks/useAuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/hooks/useAuthContext')>()),
  useAuthContext: () => ({ userRole: 'club_admin', clubId: 'club-1' }),
}))
vi.mock('@/features/clubs/hooks/queries/useClubQueries', () => ({
  useClubsQuery: () => ({ data: [{ id: 'club-1', name: 'Dojo Ejemplo' }], isLoading: false }),
}))
vi.mock('@/features/members/hooks/queries/useMemberQueries', () => ({
  useMemberQuery: () => ({ data: undefined }),
  useMembersQuery: () => ({
    data: [{ id: 'm-new', first_name: 'Nuevo', last_name: 'Ejemplo', birth_date: '1990-01-01', club_id: 'club-1' } as Member],
    isLoading: false,
    isPlaceholderData: false,
  }),
}))
vi.mock('../../hooks/queries/useAnnualPaymentPricesQuery', () => ({
  useAnnualPaymentPricesQuery: () => ({ data: prices, isLoading: false, error: null }),
}))
vi.mock('../../hooks/queries/useAnnualPaymentPrefillQuery', () => ({
  useAnnualPaymentPrefillQuery: () => ({ ...prefillState, refetch }),
}))
vi.mock('../../hooks/mutations/useInitiateAnnualPayment.mutation', () => ({
  useInitiateAnnualPaymentMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

const loadedPrefill = {
  payer_name: 'Director Ejemplo',
  include_club_fee: true,
  club_fee_already_paid: false,
  member_assignments: [],
  paid_assignments: [],
  source: 'members',
} as unknown as PrefillAnnualPaymentResponse

const fullPrices: AnnualPaymentPrices = {
  club_fee: 50, kyu: 30, kyu_infantil: 20, dan: 40,
  fukushidoin: 60, shidoin: 70, seguro_accidentes: 15, seguro_rc: 10,
}

const renderPending = () =>
  renderWithProviders(
    <AnnualPaymentProvider>
      <PendingPayments />
    </AnnualPaymentProvider>,
  )

describe('PendingPayments', () => {
  beforeEach(() => {
    refetch.mockClear()
    prices = fullPrices
    prefillState = { data: loadedPrefill, isLoading: false, isError: false }
  })

  it('does not offer payment when the paid items could not be loaded', async () => {
    prefillState = { data: undefined, isLoading: false, isError: true }
    renderPending()

    expect(screen.getByText('No hemos podido comprobar lo que ya está pagado. Inténtalo de nuevo.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /Nuevo/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pagar con tarjeta' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(refetch).toHaveBeenCalled()
  })

  it('blocks payment when a ticked concept has no price', async () => {
    prices = { ...fullPrices, dan: undefined }
    renderPending()
    expect(screen.getAllByRole('button', { name: 'Pagar con tarjeta' }).length).toBeGreaterThan(0)

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Tipo de licencia de Nuevo Ejemplo' }), 'dan')

    expect(screen.getByRole('alert')).toHaveTextContent('Licencia Dan no tiene precio todavía. Elige otro tipo o avisa a la Federación.')
    screen.getAllByRole('button', { name: 'Pagar con tarjeta' }).forEach((button) => expect(button).toBeDisabled())

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Tipo de licencia de Nuevo Ejemplo' }), 'kyu')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

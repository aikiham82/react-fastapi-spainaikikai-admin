import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { UnfinishedPaymentsSection } from '../UnfinishedPaymentsSection'
import type { Payment } from '../../data/schemas/payment-admin.schema'
import { useClubUnfinishedPaymentsQuery } from '../../hooks/queries/useClubPaymentsQueries'

vi.mock('../../hooks/queries/useClubPaymentsQueries', () => ({
  useClubUnfinishedPaymentsQuery: vi.fn(),
}))

const mockConfirmPayment = vi.fn()

vi.mock('../../hooks/mutations/usePaymentAdminMutations', () => ({
  useConfirmPaymentMutation: vi.fn(() => ({
    confirmPayment: mockConfirmPayment,
    isLoading: false,
  })),
}))

const makePayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'pay-1',
  club_id: 'club-1',
  payment_type: 'annual_quota',
  payment_method: 'redsys',
  status: 'processing',
  amount: 185,
  payment_year: 2026,
  payer_name: 'Example Dojo',
  created_at: '2026-04-03T10:20:46',
  ...overrides,
})

const withPayments = (payments: Payment[]) =>
  vi.mocked(useClubUnfinishedPaymentsQuery).mockReturnValue({
    data: payments,
    isLoading: false,
  } as unknown as ReturnType<typeof useClubUnfinishedPaymentsQuery>)

describe('UnfinishedPaymentsSection', () => {
  beforeEach(() => {
    mockConfirmPayment.mockReset()
  })

  it('shows nothing when the club has no unfinished payment', () => {
    withPayments([])

    const { container } = renderWithProviders(<UnfinishedPaymentsSection clubId="club-1" paymentYear={2026} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('lists each unfinished payment with its concept, date and amount', () => {
    withPayments([makePayment()])

    renderWithProviders(<UnfinishedPaymentsSection clubId="club-1" paymentYear={2026} />)

    expect(screen.getByRole('heading', { name: 'Pagos sin terminar' })).toBeInTheDocument()
    expect(screen.getByText('Pago anual 2026')).toBeInTheDocument()
    expect(screen.getByText(/Iniciado el 03\/04\/2026 · Example Dojo · 185,00/)).toBeInTheDocument()
  })

  it('names the payment in Spanish and leaves out a missing start date', () => {
    withPayments([makePayment({ payment_type: 'seminar_oficialidad', created_at: null, payer_name: '' })])

    renderWithProviders(<UnfinishedPaymentsSection clubId="club-1" paymentYear={2026} />)

    expect(screen.getByText('Oficialidad de seminario 2026')).toBeInTheDocument()
    expect(screen.queryByText(/Iniciado/)).not.toBeInTheDocument()
  })

  it('tells what confirming an oficialidad does, without licences', async () => {
    withPayments([makePayment({ payment_type: 'seminar_oficialidad', amount: 20 })])
    renderWithProviders(<UnfinishedPaymentsSection clubId="club-1" paymentYear={2026} />)

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }))

    expect(screen.getByText(/Se marcará como pagado y se enviará la factura al club\./)).toBeInTheDocument()
  })

  it('asks only for the unfinished payments of the season on screen', () => {
    withPayments([])

    renderWithProviders(<UnfinishedPaymentsSection clubId="club-1" paymentYear={2027} />)

    expect(useClubUnfinishedPaymentsQuery).toHaveBeenCalledWith('club-1', 2027)
  })

  it('confirms a payment as a bank transfer', async () => {
    withPayments([makePayment()])
    renderWithProviders(<UnfinishedPaymentsSection clubId="club-1" paymentYear={2026} />)

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(mockConfirmPayment).toHaveBeenCalledWith(
      { id: 'pay-1', paymentMethod: 'transfer' },
      expect.anything(),
    )
  })
})

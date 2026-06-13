import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { TransactionsSection } from '../TransactionsSection'
import type { MemberPayment } from '@/features/member-payments/data/schemas/member-payment.schema'
// ReturnType<typeof useClubMemberPaymentsQuery> is used inline via dynamic import — no top-level import needed

// ─── Mock query hook ───────────────────────────────────────────────────────
vi.mock('../../hooks/queries/useClubPaymentsQueries', () => ({
  useClubMemberPaymentsQuery: vi.fn(),
  clubPaymentsKeys: {
    all: ['club-payments'],
    allClubsSummary: (year?: number) => ['club-payments', 'all-clubs-summary', year],
    clubDetail: (clubId: string, year?: number) => ['club-payments', 'club-detail', clubId, year],
    clubMemberPayments: (clubId: string, year?: number) => ['club-payments', 'club-member-payments', clubId, year],
  },
}))

// ─── Mock mutation hooks ───────────────────────────────────────────────────
const mockDeleteMemberPayment = vi.fn()

vi.mock('../../hooks/mutations/usePaymentAdminMutations', () => ({
  useDeleteMemberPaymentMutation: vi.fn(() => ({
    deleteMemberPayment: mockDeleteMemberPayment,
    isLoading: false,
    error: null,
    isSuccess: false,
  })),
  useUpdateMemberPaymentMutation: vi.fn(() => ({
    updateMemberPayment: vi.fn(),
    isLoading: false,
    error: null,
    isSuccess: false,
  })),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────
const makeMemberPayment = (overrides: Partial<MemberPayment> = {}): MemberPayment => ({
  id: 'mp-001',
  payment_id: 'pay-100',
  member_id: 'mem-001',
  club_id: 'club-001',
  payment_year: 2024,
  payment_type: 'licencia_kyu',
  concept: 'Licencia KYU 2024',
  amount: 50,
  status: 'pending',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

const defaultProps = {
  clubId: 'club-001',
  paymentYear: 2024,
}

describe('TransactionsSection', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Test 1: Loading state ───────────────────────────────────────────────
  describe('loading state', () => {
    it('shows a loading skeleton when the query is loading', async () => {
      const { useClubMemberPaymentsQuery } = await import('../../hooks/queries/useClubPaymentsQueries')
      vi.mocked(useClubMemberPaymentsQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      } as ReturnType<typeof useClubMemberPaymentsQuery>)

      renderWithProviders(<TransactionsSection {...defaultProps} />)

      // The component renders skeleton placeholders while loading
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  // ─── Test 2: Data rows ───────────────────────────────────────────────────
  describe('with data', () => {
    it('renders a row per MemberPayment returned by the query', async () => {
      const payments = [
        makeMemberPayment({ id: 'mp-001', concept: 'Licencia KYU 2024', member_id: 'mem-001' }),
        makeMemberPayment({ id: 'mp-002', concept: 'Seguro RC 2024', member_id: 'mem-002', payment_type: 'seguro_rc' }),
      ]

      const { useClubMemberPaymentsQuery } = await import('../../hooks/queries/useClubPaymentsQueries')
      vi.mocked(useClubMemberPaymentsQuery).mockReturnValue({
        data: payments,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useClubMemberPaymentsQuery>)

      renderWithProviders(<TransactionsSection {...defaultProps} />)

      expect(screen.getByText('Licencia KYU 2024')).toBeInTheDocument()
      expect(screen.getByText('Seguro RC 2024')).toBeInTheDocument()
    })
  })

  // ─── Test 3: Edit opens MemberPaymentEditModal ───────────────────────────
  describe('edit action', () => {
    it('opens MemberPaymentEditModal when the edit (pencil) button is clicked', async () => {
      const payments = [makeMemberPayment()]

      const { useClubMemberPaymentsQuery } = await import('../../hooks/queries/useClubPaymentsQueries')
      vi.mocked(useClubMemberPaymentsQuery).mockReturnValue({
        data: payments,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useClubMemberPaymentsQuery>)

      renderWithProviders(<TransactionsSection {...defaultProps} />)

      // Click the edit button (aria-label contains "editar" or the pencil button)
      const editBtn = screen.getByRole('button', { name: /editar/i })
      await user.click(editBtn)

      // MemberPaymentEditModal renders with its dialog title
      await waitFor(() => {
        expect(screen.getByText(/editar línea de pago/i)).toBeInTheDocument()
      })
    })
  })

  // ─── Test 4: Delete opens ConfirmDeleteDialog ────────────────────────────
  describe('delete action', () => {
    it('opens ConfirmDeleteDialog when the delete (trash) button is clicked', async () => {
      const payments = [makeMemberPayment()]

      const { useClubMemberPaymentsQuery } = await import('../../hooks/queries/useClubPaymentsQueries')
      vi.mocked(useClubMemberPaymentsQuery).mockReturnValue({
        data: payments,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useClubMemberPaymentsQuery>)

      renderWithProviders(<TransactionsSection {...defaultProps} />)

      // Click the delete button
      const deleteBtn = screen.getByRole('button', { name: /eliminar/i })
      await user.click(deleteBtn)

      // ConfirmDeleteDialog (AlertDialog) renders
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })
    })
  })

  // ─── Test 5: Empty state ─────────────────────────────────────────────────
  describe('empty state', () => {
    it('shows an empty state message when there are no transactions', async () => {
      const { useClubMemberPaymentsQuery } = await import('../../hooks/queries/useClubPaymentsQueries')
      vi.mocked(useClubMemberPaymentsQuery).mockReturnValue({
        data: [] as MemberPayment[],
        isLoading: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof useClubMemberPaymentsQuery>)

      renderWithProviders(<TransactionsSection {...defaultProps} />)

      expect(screen.getByText(/sin transacciones/i)).toBeInTheDocument()
    })
  })

  // ─── Test 6: Confirm delete fires the mutation ───────────────────────────
  describe('confirm delete', () => {
    it('calls deleteMemberPayment with the row id when the confirm button is clicked', async () => {
      const payments = [makeMemberPayment({ id: 'mp-001' })]

      const { useClubMemberPaymentsQuery } = await import('../../hooks/queries/useClubPaymentsQueries')
      vi.mocked(useClubMemberPaymentsQuery).mockReturnValue({
        data: payments,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useClubMemberPaymentsQuery>)

      renderWithProviders(<TransactionsSection {...defaultProps} />)

      // 1. Open the ConfirmDeleteDialog
      const deleteBtn = screen.getByRole('button', { name: /eliminar/i })
      await user.click(deleteBtn)

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      // 2. Click the confirm button inside the dialog
      const confirmBtn = screen.getByRole('button', { name: /confirmar|eliminar|sí/i })
      await user.click(confirmBtn)

      // 3. Assert the mutation was called with the correct id
      expect(mockDeleteMemberPayment).toHaveBeenCalledWith('mp-001')
    })
  })
})

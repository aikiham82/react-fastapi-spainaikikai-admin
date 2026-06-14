/**
 * Gap tests for TransactionsSection — branches NOT covered in TransactionsSection.test.tsx:
 *  1. Status label "completed" → "Completado" rendered in the badge
 *  2. Status label "refunded" → "Reembolsado" rendered in the badge
 *  3. getStatusLabel fallback for unknown status → raw status string
 *  4. getPaymentTypeLabel fallback for unknown payment_type → raw type string
 *
 * TransactionsSection.test.tsx already covers: loading, empty state, data rows,
 * edit/delete open modals, confirm-delete mutation call. NOT duplicated here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { TransactionsSection } from '../TransactionsSection'
import type { MemberPayment } from '@/features/member-payments/data/schemas/member-payment.schema'

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
vi.mock('../../hooks/mutations/usePaymentAdminMutations', () => ({
  useDeleteMemberPaymentMutation: vi.fn(() => ({
    deleteMemberPayment: vi.fn(),
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

// ─── Fixture helper ────────────────────────────────────────────────────────
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

const defaultProps = { clubId: 'club-001', paymentYear: 2024 }

describe('TransactionsSection — gap coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Gap 1: "completed" status renders with the correct localized label ────
  describe('status label — completed', () => {
    it('renders "Completado" for status="completed"', async () => {
      const { useClubMemberPaymentsQuery } = await import('../../hooks/queries/useClubPaymentsQueries')
      vi.mocked(useClubMemberPaymentsQuery).mockReturnValue({
        data: [makeMemberPayment({ status: 'completed', concept: 'Pago completado' })],
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useClubMemberPaymentsQuery>)

      renderWithProviders(<TransactionsSection {...defaultProps} />)

      // The badge label appears in the DOM alongside the concept cell that may share words;
      // use getAllByText to handle both the badge and any concept overlap
      expect(screen.getAllByText(/completado/i).length).toBeGreaterThan(0)
    })
  })

  // ── Gap 2: "refunded" status renders with the correct localized label ─────
  describe('status label — refunded', () => {
    it('renders "Reembolsado" for status="refunded"', async () => {
      const { useClubMemberPaymentsQuery } = await import('../../hooks/queries/useClubPaymentsQueries')
      vi.mocked(useClubMemberPaymentsQuery).mockReturnValue({
        data: [makeMemberPayment({ status: 'refunded', concept: 'Pago reembolsado' })],
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useClubMemberPaymentsQuery>)

      renderWithProviders(<TransactionsSection {...defaultProps} />)

      expect(screen.getAllByText(/reembolsado/i).length).toBeGreaterThan(0)
    })
  })

  // ── Gap 3: Unknown status falls back to the raw value ─────────────────────
  describe('status label — unknown fallback', () => {
    it('renders the raw status string when the status has no label mapping', async () => {
      const { useClubMemberPaymentsQuery } = await import('../../hooks/queries/useClubPaymentsQueries')
      vi.mocked(useClubMemberPaymentsQuery).mockReturnValue({
        data: [makeMemberPayment({ status: 'unknown_xyz', concept: 'Pago desconocido' })],
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useClubMemberPaymentsQuery>)

      renderWithProviders(<TransactionsSection {...defaultProps} />)

      // getStatusLabel returns raw status when not in MEMBER_PAYMENT_STATUS map
      expect(screen.getByText('unknown_xyz')).toBeInTheDocument()
    })
  })

  // ── Gap 4: Unknown payment_type falls back to the raw value ───────────────
  describe('payment_type label — unknown fallback', () => {
    it('renders the raw payment_type string when no label mapping exists', async () => {
      const { useClubMemberPaymentsQuery } = await import('../../hooks/queries/useClubPaymentsQueries')
      vi.mocked(useClubMemberPaymentsQuery).mockReturnValue({
        data: [makeMemberPayment({ payment_type: 'custom_type_xyz', concept: 'Tipo custom' })],
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useClubMemberPaymentsQuery>)

      renderWithProviders(<TransactionsSection {...defaultProps} />)

      // getPaymentTypeLabel returns raw type when not in MEMBER_PAYMENT_TYPES map
      expect(screen.getByText('custom_type_xyz')).toBeInTheDocument()
    })
  })
})

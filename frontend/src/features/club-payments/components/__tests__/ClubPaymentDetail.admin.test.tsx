import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { ClubPaymentDetail } from '../ClubPaymentDetail'
import type { ClubPaymentSummaryResponse } from '@/features/member-payments/data/schemas/member-payment.schema'
import { usePermissions } from '@/core/hooks/usePermissions'

// ─── Mock usePermissions ───────────────────────────────────────────────────
vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({ isAssociationAdmin: () => true })),
}))

// ─── Mock useClubPaymentsContext ───────────────────────────────────────────
const mockClubDetail: ClubPaymentSummaryResponse = {
  club_id: 'club-001',
  club_name: 'Club Aikido Madrid',
  payment_year: 2024,
  total_collected: 1200,
  has_club_fee: true,
  total_members: 10,
  members_with_license: 8,
  members_with_insurance: 7,
  by_payment_type: [],
  members: [],
}

vi.mock('@/features/club-payments/hooks/useClubPaymentsContext', () => ({
  useClubPaymentsContext: vi.fn(() => ({
    isSuperAdmin: true,
    clubDetail: mockClubDetail,
    isLoadingClubDetail: false,
    clubDetailError: null,
    goBackToList: vi.fn(),
    selectedYear: 2024,
    userClubId: null,
    selectedClubId: 'club-001',
    selectClub: vi.fn(),
    allClubsSummary: undefined,
    isLoadingAllClubs: false,
    allClubsError: null,
    showingDetail: true,
    setSelectedYear: vi.fn(),
  })),
}))

// ─── Mock useMembersQuery ──────────────────────────────────────────────────
vi.mock('@/features/members/hooks/queries/useMemberQueries', () => ({
  useMembersQuery: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
}))

// ─── Stub ManualPaymentModal to isolate gating logic ──────────────────────
vi.mock('../ManualPaymentModal', () => ({
  ManualPaymentModal: vi.fn(({ isOpen }: { isOpen: boolean }) =>
    isOpen
      ? <div role="dialog" data-testid="manual-payment-modal">ManualPaymentModal</div>
      : null
  ),
}))

// ─── Stub TransactionsSection to isolate gating logic ─────────────────────
vi.mock('../TransactionsSection', () => ({
  TransactionsSection: vi.fn(() => (
    <div data-testid="transactions-section">TransactionsSection</div>
  )),
}))

// ─── Helper to configure the usePermissions mock ──────────────────────────
const mockAsAdmin = () => {
  vi.mocked(usePermissions).mockReturnValue({
    isAssociationAdmin: () => true,
    isClubAdmin: () => false,
    canAccess: vi.fn(() => true),
    canAccessClub: vi.fn(() => true),
    userRole: 'super_admin',
    clubId: null,
  })
}

const mockAsClubAdmin = () => {
  vi.mocked(usePermissions).mockReturnValue({
    isAssociationAdmin: () => false,
    isClubAdmin: () => true,
    canAccess: vi.fn(() => false),
    canAccessClub: vi.fn(() => false),
    userRole: 'club_admin',
    clubId: 'club-001',
  })
}

describe('ClubPaymentDetail — admin gating (Task 24)', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    // After clearAllMocks, restore the module-level mocks
    vi.mock('../ManualPaymentModal', () => ({
      ManualPaymentModal: vi.fn(({ isOpen }: { isOpen: boolean }) =>
        isOpen
          ? <div role="dialog" data-testid="manual-payment-modal">ManualPaymentModal</div>
          : null
      ),
    }))
    vi.mock('../TransactionsSection', () => ({
      TransactionsSection: vi.fn(() => (
        <div data-testid="transactions-section">TransactionsSection</div>
      )),
    }))
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
  })

  // ─── Case 1: non-admin sees no admin UI ─────────────────────────────────
  describe('when isAssociationAdmin() returns false (club_admin)', () => {
    it('does NOT render the "Registrar pago manual" button', () => {
      mockAsClubAdmin()
      renderWithProviders(<ClubPaymentDetail />)

      expect(
        screen.queryByRole('button', { name: /registrar pago manual/i })
      ).not.toBeInTheDocument()
    })

    it('does NOT render the TransactionsSection', () => {
      mockAsClubAdmin()
      renderWithProviders(<ClubPaymentDetail />)

      expect(screen.queryByTestId('transactions-section')).not.toBeInTheDocument()
    })
  })

  // ─── Case 2: super_admin sees admin UI ──────────────────────────────────
  describe('when isAssociationAdmin() returns true (super_admin)', () => {
    it('renders the "Registrar pago manual" button', () => {
      mockAsAdmin()
      renderWithProviders(<ClubPaymentDetail />)

      expect(
        screen.getByRole('button', { name: /registrar pago manual/i })
      ).toBeInTheDocument()
    })

    it('renders the TransactionsSection', () => {
      mockAsAdmin()
      renderWithProviders(<ClubPaymentDetail />)

      expect(screen.getByTestId('transactions-section')).toBeInTheDocument()
    })
  })

  // ─── Case 3: clicking button opens ManualPaymentModal ───────────────────
  describe('clicking "Registrar pago manual"', () => {
    it('opens ManualPaymentModal when the button is clicked', async () => {
      mockAsAdmin()
      renderWithProviders(<ClubPaymentDetail />)

      // Modal should not be open initially
      expect(screen.queryByTestId('manual-payment-modal')).not.toBeInTheDocument()

      // Click the button
      const btn = screen.getByRole('button', { name: /registrar pago manual/i })
      await user.click(btn)

      // Modal should appear
      await waitFor(() => {
        expect(screen.getByTestId('manual-payment-modal')).toBeInTheDocument()
      })
    })
  })
})

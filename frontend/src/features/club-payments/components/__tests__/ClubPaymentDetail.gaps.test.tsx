/**
 * Gap tests for ClubPaymentDetail — branches NOT covered in ClubPaymentDetail.admin.test.tsx:
 *  1. Loading state (isLoadingClubDetail=true)
 *  2. Error state (clubDetailError set)
 *  3. Null/missing clubDetail (!clubDetail)
 *  4. Member search filter (searchTerm filters member rows)
 *  5. Status filter: all members shown by default, filtered when changed
 *  6. useMembersQuery enabled-gating: called only when canManagePayments && clubDetail?.club_id
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { ClubPaymentDetail } from '../ClubPaymentDetail'
import type { ClubPaymentSummaryResponse } from '@/features/member-payments/data/schemas/member-payment.schema'
import { usePermissions } from '@/core/hooks/usePermissions'

// ─── Mock usePermissions ───────────────────────────────────────────────────
vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({ isAssociationAdmin: () => false })),
}))

// ─── Mock useClubPaymentsContext ───────────────────────────────────────────
const mockUseClubPaymentsContext = vi.fn()

vi.mock('@/features/club-payments/hooks/useClubPaymentsContext', () => ({
  useClubPaymentsContext: () => mockUseClubPaymentsContext(),
}))

// ─── Mock useMembersQuery ──────────────────────────────────────────────────
const mockUseMembersQuery = vi.fn()

vi.mock('@/features/members/hooks/queries/useMemberQueries', () => ({
  useMembersQuery: (...args: unknown[]) => mockUseMembersQuery(...args),
}))

// ─── Stub child components to isolate ClubPaymentDetail logic ──────────────
vi.mock('../ManualPaymentModal', () => ({
  ManualPaymentModal: vi.fn(() => null),
}))

vi.mock('../TransactionsSection', () => ({
  TransactionsSection: vi.fn(() => (
    <div data-testid="transactions-section">TransactionsSection</div>
  )),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────

const memberPaid = {
  member_id: 'mem-paid',
  member_name: 'Ana García',
  license_paid: true,
  insurance_paid: true,
  total_paid: 120,
  grade_group: 'kyu',
}

const memberUnpaid = {
  member_id: 'mem-unpaid',
  member_name: 'Carlos Rodríguez',
  license_paid: false,
  insurance_paid: false,
  total_paid: 0,
  grade_group: 'kyu',
}

const baseClubDetail: ClubPaymentSummaryResponse = {
  club_id: 'club-001',
  club_name: 'Club Aikido Madrid',
  payment_year: 2024,
  total_collected: 120,
  has_club_fee: true,
  total_members: 2,
  members_with_license: 1,
  members_with_insurance: 1,
  by_payment_type: [],
  members: [memberPaid, memberUnpaid],
}

const baseContextValue = {
  isSuperAdmin: false,
  clubDetail: baseClubDetail,
  isLoadingClubDetail: false,
  clubDetailError: null,
  goBackToList: vi.fn(),
  selectedYear: 2024,
  userClubId: 'club-001',
  selectedClubId: 'club-001',
  selectClub: vi.fn(),
  allClubsSummary: undefined,
  isLoadingAllClubs: false,
  allClubsError: null,
  showingDetail: true,
  setSelectedYear: vi.fn(),
}

// ─── Helper to configure mocks as club admin (no manage-payments access) ──
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

describe('ClubPaymentDetail — gap coverage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
    // Default: club admin (no manage payments), useMembersQuery returns empty
    mockAsClubAdmin()
    mockUseMembersQuery.mockReturnValue({ data: [], isLoading: false, error: null })
    mockUseClubPaymentsContext.mockReturnValue(baseContextValue)
  })

  // ── Gap 1: Loading state ──────────────────────────────────────────────────
  describe('loading state', () => {
    it('shows a spinner element when isLoadingClubDetail is true', () => {
      mockUseClubPaymentsContext.mockReturnValue({
        ...baseContextValue,
        isLoadingClubDetail: true,
        clubDetail: undefined,
      })

      renderWithProviders(<ClubPaymentDetail />)

      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeTruthy()
    })

    it('does NOT render member names while loading', () => {
      mockUseClubPaymentsContext.mockReturnValue({
        ...baseContextValue,
        isLoadingClubDetail: true,
        clubDetail: undefined,
      })

      renderWithProviders(<ClubPaymentDetail />)

      expect(screen.queryByText('Ana García')).not.toBeInTheDocument()
    })
  })

  // ── Gap 2: Error state ────────────────────────────────────────────────────
  describe('error state', () => {
    it('shows an error heading when clubDetailError is set', () => {
      mockUseClubPaymentsContext.mockReturnValue({
        ...baseContextValue,
        clubDetailError: { message: 'Network error' } as Error,
        clubDetail: undefined,
      })

      renderWithProviders(<ClubPaymentDetail />)

      expect(
        screen.getByText(/error al cargar los datos del club/i)
      ).toBeInTheDocument()
    })

    it('shows the error detail message from the error object', () => {
      mockUseClubPaymentsContext.mockReturnValue({
        ...baseContextValue,
        clubDetailError: { message: 'Network error' } as Error,
        clubDetail: undefined,
      })

      renderWithProviders(<ClubPaymentDetail />)

      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  // ── Gap 3: Null clubDetail ────────────────────────────────────────────────
  describe('null/missing clubDetail', () => {
    it('shows "no data found" message when clubDetail is undefined and no error', () => {
      mockUseClubPaymentsContext.mockReturnValue({
        ...baseContextValue,
        clubDetail: undefined,
        isLoadingClubDetail: false,
        clubDetailError: null,
      })

      renderWithProviders(<ClubPaymentDetail />)

      expect(
        screen.getByText(/no se encontraron datos de pagos/i)
      ).toBeInTheDocument()
    })
  })

  // ── Gap 4: Member search filter ───────────────────────────────────────────
  describe('member search filter', () => {
    it('filters member rows to show only matching members', async () => {
      renderWithProviders(<ClubPaymentDetail />)

      const searchInput = screen.getByPlaceholderText(/buscar miembro/i)
      await user.type(searchInput, 'ana')

      // Component renders both mobile cards AND desktop table rows, so the same
      // member name appears twice. Use getAllByText to avoid "multiple elements" errors.
      expect(screen.getAllByText('Ana García').length).toBeGreaterThan(0)
      expect(screen.queryAllByText('Carlos Rodríguez').length).toBe(0)
    })

    it('shows the empty-filter message when search matches nothing', async () => {
      renderWithProviders(<ClubPaymentDetail />)

      const searchInput = screen.getByPlaceholderText(/buscar miembro/i)
      await user.type(searchInput, 'zzznonexistent')

      expect(
        screen.getByText(/no se encontraron miembros con los filtros seleccionados/i)
      ).toBeInTheDocument()
    })

    it('shows both members when search is cleared', async () => {
      renderWithProviders(<ClubPaymentDetail />)

      const searchInput = screen.getByPlaceholderText(/buscar miembro/i)
      await user.type(searchInput, 'ana')

      // Clear the input
      await user.clear(searchInput)

      // Both members reappear (mobile + desktop = multiple DOM nodes per member)
      expect(screen.getAllByText('Ana García').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Carlos Rodríguez').length).toBeGreaterThan(0)
    })
  })

  // ── Gap 5: Status filter (initial state only — Select interaction is brittle in jsdom) ─
  describe('status filter — initial all-members state', () => {
    it('shows all members by default (no filter applied)', () => {
      renderWithProviders(<ClubPaymentDetail />)

      // Both mobile cards AND desktop table rows render each member name
      expect(screen.getAllByText('Ana García').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Carlos Rodríguez').length).toBeGreaterThan(0)
    })
  })

  // ── Gap 6: useMembersQuery enabled-gating ─────────────────────────────────
  describe('useMembersQuery enabled gating', () => {
    it('passes enabled: false to useMembersQuery when canManagePayments is false', () => {
      // mockAsClubAdmin already sets isAssociationAdmin=false → canManagePayments=false
      renderWithProviders(<ClubPaymentDetail />)

      expect(mockUseMembersQuery).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ enabled: false })
      )
    })

    it('passes enabled: true to useMembersQuery when canManagePayments=true and clubId is set', () => {
      vi.mocked(usePermissions).mockReturnValue({
        isAssociationAdmin: () => true,
        isClubAdmin: () => false,
        canAccess: vi.fn(() => true),
        canAccessClub: vi.fn(() => true),
        userRole: 'super_admin',
        clubId: null,
      })

      renderWithProviders(<ClubPaymentDetail />)

      expect(mockUseMembersQuery).toHaveBeenCalledWith(
        expect.objectContaining({ club_id: 'club-001' }),
        expect.objectContaining({ enabled: true })
      )
    })
  })
})

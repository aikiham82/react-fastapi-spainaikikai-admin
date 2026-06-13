/**
 * Gap tests for ManualPaymentModal — branches NOT covered by the primary test file:
 *  1. Empty members list (members=[], isLoadingMembers=false) → "no hay miembros" message
 *  2. include_club_fee toggle → payload sent with include_club_fee: true
 *  3. MANUAL_PAYMENT_METHODS does NOT include "redsys" (UI restriction check)
 *
 * All existing tests in ManualPaymentModal.test.tsx remain untouched.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { ManualPaymentModal } from '../ManualPaymentModal'

// Mock the mutation hook
const mockRegisterManualPayment = vi.fn()

vi.mock('../../hooks/mutations/usePaymentAdminMutations', () => ({
  useRegisterManualPaymentMutation: vi.fn(() => ({
    registerManualPayment: mockRegisterManualPayment,
    isLoading: false,
    error: null,
    isSuccess: false,
  })),
}))

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  clubId: 'club-001',
  clubName: 'Club Aikido Madrid',
  paymentYear: 2024,
  members: [],
  isLoadingMembers: false,
}

// Members only need id + name; payment types come from the fixed catalog in the modal.
const memberWithTypes = {
  id: 'mem-1',
  name: 'Ana García',
}

describe('ManualPaymentModal — gap coverage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
  })

  // ── Gap 1: empty members list (not loading) ───────────────────────────────
  describe('when members is empty and not loading', () => {
    it('shows the "no members available" message', () => {
      renderWithProviders(
        <ManualPaymentModal {...defaultProps} members={[]} isLoadingMembers={false} />
      )

      expect(
        screen.getByText(/no hay miembros disponibles para este club/i)
      ).toBeInTheDocument()
    })

    it('does NOT show the loading indicator when members is empty and not loading', () => {
      renderWithProviders(
        <ManualPaymentModal {...defaultProps} members={[]} isLoadingMembers={false} />
      )

      expect(screen.queryByText(/cargando miembros/i)).not.toBeInTheDocument()
    })
  })

  // ── Gap 2: include_club_fee toggle ────────────────────────────────────────
  describe('include_club_fee toggle', () => {
    it('sends include_club_fee: true when the checkbox is checked before submit', async () => {
      renderWithProviders(
        <ManualPaymentModal
          {...defaultProps}
          members={[memberWithTypes]}
          isLoadingMembers={false}
        />
      )

      // Fill payer_name
      await user.type(
        screen.getByRole('textbox', { name: /nombre del pagador/i }),
        'Test Payer'
      )

      // Select the member
      await user.click(screen.getByTestId('member-checkbox-mem-1'))

      // Wait for the catalog type checkboxes to appear and select one
      await waitFor(() => {
        expect(screen.getByTestId('type-checkbox-mem-1-kyu')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('type-checkbox-mem-1-kyu'))

      // Check the "Incluir cuota de club" checkbox
      const clubFeeCheckbox = screen.getByRole('checkbox', { name: /incluir cuota de club/i })
      await user.click(clubFeeCheckbox)

      // Submit
      await user.click(screen.getByRole('button', { name: /registrar|guardar/i }))

      expect(mockRegisterManualPayment).toHaveBeenCalledTimes(1)
      expect(mockRegisterManualPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          include_club_fee: true,
        })
      )
    })

    it('sends include_club_fee: false when the checkbox is NOT checked (default)', async () => {
      renderWithProviders(
        <ManualPaymentModal
          {...defaultProps}
          members={[memberWithTypes]}
          isLoadingMembers={false}
        />
      )

      await user.type(
        screen.getByRole('textbox', { name: /nombre del pagador/i }),
        'Test Payer'
      )

      await user.click(screen.getByTestId('member-checkbox-mem-1'))

      await waitFor(() => {
        expect(screen.getByTestId('type-checkbox-mem-1-kyu')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('type-checkbox-mem-1-kyu'))

      // Do NOT click the club fee checkbox — it should remain false
      await user.click(screen.getByRole('button', { name: /registrar|guardar/i }))

      expect(mockRegisterManualPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          include_club_fee: false,
        })
      )
    })
  })

  // ── Gap 3: MANUAL_PAYMENT_METHODS excludes "redsys" at the UI level ───────
  describe('payment_method select options', () => {
    it('does NOT offer "redsys" as a selectable payment method option', () => {
      renderWithProviders(
        <ManualPaymentModal
          {...defaultProps}
          members={[memberWithTypes]}
          isLoadingMembers={false}
        />
      )

      // The SelectContent for payment_method only contains cash/transfer/other.
      // Neither the trigger label nor any hidden option should mention "redsys".
      expect(screen.queryByText(/redsys/i)).not.toBeInTheDocument()
    })

    it('renders "Efectivo" as the default visible payment method (cash)', () => {
      renderWithProviders(
        <ManualPaymentModal
          {...defaultProps}
          members={[memberWithTypes]}
          isLoadingMembers={false}
        />
      )

      // Radix Select renders the label both in the trigger AND as a hidden native option,
      // so there may be multiple matches — use getAllByText
      expect(screen.getAllByText('Efectivo').length).toBeGreaterThan(0)
    })
  })
})

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

// Members now only need id + name; payment types come from the fixed catalog,
// NOT from per-member attributes.
const mockMembers = [
  { id: 'mem-1', name: 'Ana García' },
  { id: 'mem-2', name: 'Juan López' },
]

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  clubId: 'club-001',
  clubName: 'Club Aikido Madrid',
  paymentYear: 2024,
  members: mockMembers,
  isLoadingMembers: false,
}

describe('ManualPaymentModal', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    // Re-apply ResizeObserver mock after clearMocks resets it
    // (clearMocks: true in vitest config clears vi.fn() implementations)
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
  })

  // Test case 1: Not rendered when isOpen=false
  describe('when isOpen is false', () => {
    it('does not render the dialog content', () => {
      renderWithProviders(
        <ManualPaymentModal {...defaultProps} isOpen={false} />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not render the modal title when closed', () => {
      renderWithProviders(
        <ManualPaymentModal {...defaultProps} isOpen={false} />
      )

      expect(screen.queryByText(/registrar pago manual/i)).not.toBeInTheDocument()
    })
  })

  // Test case 2: Renders form when open
  describe('when isOpen is true', () => {
    it('renders the dialog with the correct title including club name', () => {
      renderWithProviders(<ManualPaymentModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(
        screen.getByText(/registrar pago manual — Club Aikido Madrid/i)
      ).toBeInTheDocument()
    })

    it('renders the payer_name input', () => {
      renderWithProviders(<ManualPaymentModal {...defaultProps} />)

      expect(screen.getByRole('textbox', { name: /nombre del pagador/i })).toBeInTheDocument()
    })

    it('renders the member list in the inline member section', () => {
      renderWithProviders(<ManualPaymentModal {...defaultProps} />)

      expect(screen.getByText('Ana García')).toBeInTheDocument()
      expect(screen.getByText('Juan López')).toBeInTheDocument()
    })

    it('renders Cancel and Submit buttons', () => {
      renderWithProviders(<ManualPaymentModal {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /registrar|guardar/i })).toBeInTheDocument()
    })
  })

  // Test case 3: Submit with empty payer_name → validation error + NOT called
  describe('validation — empty payer_name', () => {
    it('shows validation error for empty payer_name and does NOT call registerManualPayment', async () => {
      renderWithProviders(<ManualPaymentModal {...defaultProps} />)

      // Submit without filling payer_name
      const submitBtn = screen.getByRole('button', { name: /registrar|guardar/i })
      await user.click(submitBtn)

      expect(
        screen.getByText(/nombre del pagador es obligatorio/i)
      ).toBeInTheDocument()
      expect(mockRegisterManualPayment).not.toHaveBeenCalled()
    })
  })

  // Test case 4: Submit with empty member_assignments → validation error + NOT called
  describe('validation — empty member_assignments', () => {
    it('shows validation error when no member is assigned and does NOT call service', async () => {
      renderWithProviders(<ManualPaymentModal {...defaultProps} />)

      // Fill payer_name but do NOT select any member
      const payerInput = screen.getByRole('textbox', { name: /nombre del pagador/i })
      await user.type(payerInput, 'John Doe')

      const submitBtn = screen.getByRole('button', { name: /registrar|guardar/i })
      await user.click(submitBtn)

      expect(
        screen.getByText(/debe asignar al menos un miembro/i)
      ).toBeInTheDocument()
      expect(mockRegisterManualPayment).not.toHaveBeenCalled()
    })
  })

  // Test case 5: Submit valid → registerManualPayment called with correct data
  // Members no longer carry payment_types — the modal uses a fixed catalog instead.
  describe('valid form submission', () => {
    it('calls registerManualPayment with correct data when payer_name is filled and a catalog type is selected for a member', async () => {
      renderWithProviders(<ManualPaymentModal {...defaultProps} />)

      // Fill payer_name
      const payerInput = screen.getByRole('textbox', { name: /nombre del pagador/i })
      await user.type(payerInput, 'Juan Pagador')

      // Check the first member checkbox (Ana García)
      const memberCheckbox = screen.getByTestId('member-checkbox-mem-1')
      await user.click(memberCheckbox)

      // After selecting the member, catalog type checkboxes should appear.
      // The catalog uses value "kyu" (not the old "licencia_kyu" from member.payment_types).
      await waitFor(() => {
        expect(screen.getByTestId('type-checkbox-mem-1-kyu')).toBeInTheDocument()
      })

      // Select the "kyu" type for Ana García from the catalog
      const typeCheckbox = screen.getByTestId('type-checkbox-mem-1-kyu')
      await user.click(typeCheckbox)

      const submitBtn = screen.getByRole('button', { name: /registrar|guardar/i })
      await user.click(submitBtn)

      expect(mockRegisterManualPayment).toHaveBeenCalledTimes(1)
      expect(mockRegisterManualPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          payer_name: 'Juan Pagador',
          club_id: 'club-001',
          payment_year: 2024,
          member_assignments: expect.arrayContaining([
            expect.objectContaining({
              member_id: 'mem-1',
              member_name: 'Ana García',
              payment_types: expect.arrayContaining(['kyu']),
            }),
          ]),
        })
      )
    })

    it('selecting a member then checking a catalog type produces correct assignment', async () => {
      renderWithProviders(<ManualPaymentModal {...defaultProps} />)

      const payerInput = screen.getByRole('textbox', { name: /nombre del pagador/i })
      await user.type(payerInput, 'Pagador Test')

      // Select Juan López (second member)
      await user.click(screen.getByTestId('member-checkbox-mem-2'))

      // The full catalog must appear for mem-2 — pick "dan"
      await waitFor(() => {
        expect(screen.getByTestId('type-checkbox-mem-2-dan')).toBeInTheDocument()
      })
      await user.click(screen.getByTestId('type-checkbox-mem-2-dan'))

      await user.click(screen.getByRole('button', { name: /registrar|guardar/i }))

      expect(mockRegisterManualPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          member_assignments: expect.arrayContaining([
            expect.objectContaining({
              member_id: 'mem-2',
              member_name: 'Juan López',
              payment_types: ['dan'],
            }),
          ]),
        })
      )
    })
  })

  // Test case 6: Cancel button → onClose called
  describe('cancel button', () => {
    it('calls onClose when the cancel button is clicked', async () => {
      const onClose = vi.fn()
      renderWithProviders(
        <ManualPaymentModal {...defaultProps} onClose={onClose} />
      )

      await user.click(screen.getByRole('button', { name: /cancelar/i }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  // Test case 7: isLoadingMembers=true → loading indicator visible
  describe('when isLoadingMembers is true', () => {
    it('shows a loading indicator in the member section', () => {
      renderWithProviders(
        <ManualPaymentModal {...defaultProps} isLoadingMembers={true} members={[]} />
      )

      expect(
        screen.getByText(/cargando miembros/i)
      ).toBeInTheDocument()
    })

    it('does not show the member list while loading', () => {
      renderWithProviders(
        <ManualPaymentModal {...defaultProps} isLoadingMembers={true} members={[]} />
      )

      expect(screen.queryByText('Ana García')).not.toBeInTheDocument()
    })
  })

  // Close on isSuccess
  describe('close on success', () => {
    it('calls onClose when the mutation reports isSuccess', async () => {
      const { useRegisterManualPaymentMutation } = await import(
        '../../hooks/mutations/usePaymentAdminMutations'
      )
      vi.mocked(useRegisterManualPaymentMutation).mockReturnValue({
        registerManualPayment: mockRegisterManualPayment,
        isLoading: false,
        error: null,
        isSuccess: true,
      })

      const onClose = vi.fn()
      renderWithProviders(
        <ManualPaymentModal {...defaultProps} onClose={onClose} />
      )

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })
  })
})

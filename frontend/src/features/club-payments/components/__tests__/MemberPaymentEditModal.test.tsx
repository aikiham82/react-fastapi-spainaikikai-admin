import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { MemberPaymentEditModal } from '../MemberPaymentEditModal'
import type { MemberPayment } from '@/features/member-payments/data/schemas/member-payment.schema'

// Mock the mutation hook
const mockUpdateMemberPayment = vi.fn()

vi.mock('../../hooks/mutations/usePaymentAdminMutations', () => ({
  useUpdateMemberPaymentMutation: vi.fn(() => ({
    updateMemberPayment: mockUpdateMemberPayment,
    isLoading: false,
    error: null,
    isSuccess: false,
  })),
}))

const mockMemberPayment: MemberPayment = {
  id: 'mp-123',
  payment_id: 'pay-456',
  member_id: 'mem-789',
  club_id: 'club-001',
  payment_year: 2024,
  payment_type: 'licencia_kyu',
  concept: 'Licencia KYU 2024',
  amount: 50,
  status: 'pending',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  memberPayment: mockMemberPayment,
  clubId: 'club-001',
  paymentYear: 2024,
}

describe('MemberPaymentEditModal', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when isOpen is false', () => {
    it('does not render the dialog content', () => {
      renderWithProviders(
        <MemberPaymentEditModal {...defaultProps} isOpen={false} />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not render the modal title when closed', () => {
      renderWithProviders(
        <MemberPaymentEditModal {...defaultProps} isOpen={false} />
      )

      expect(screen.queryByText(/editar línea de pago/i)).not.toBeInTheDocument()
    })
  })

  describe('when isOpen is true', () => {
    it('renders the dialog with the correct title', () => {
      renderWithProviders(<MemberPaymentEditModal {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/editar línea de pago/i)).toBeInTheDocument()
    })

    it('pre-fills the concept field with the memberPayment concept', () => {
      renderWithProviders(<MemberPaymentEditModal {...defaultProps} />)

      expect(screen.getByDisplayValue('Licencia KYU 2024')).toBeInTheDocument()
    })

    it('pre-fills the amount field with the memberPayment amount', () => {
      renderWithProviders(<MemberPaymentEditModal {...defaultProps} />)

      expect(screen.getByDisplayValue('50')).toBeInTheDocument()
    })

    it('renders the payment_type select showing the pre-filled label', () => {
      renderWithProviders(<MemberPaymentEditModal {...defaultProps} />)

      // Radix Select renders the visible span AND a hidden native <option> — both have the same text
      const matches = screen.getAllByText('Licencia KYU')
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })

    it('renders the status select showing the pre-filled label', () => {
      renderWithProviders(<MemberPaymentEditModal {...defaultProps} />)

      // Radix Select renders the visible span AND a hidden native <option>
      const matches = screen.getAllByText('Pendiente')
      expect(matches.length).toBeGreaterThanOrEqual(1)
    })

    it('renders a submit button', () => {
      renderWithProviders(<MemberPaymentEditModal {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /guardar|actualizar/i })
      ).toBeInTheDocument()
    })

    it('renders a cancel button', () => {
      renderWithProviders(<MemberPaymentEditModal {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /cancelar/i })
      ).toBeInTheDocument()
    })
  })

  describe('valid form submission', () => {
    it('calls updateMemberPayment with the correct payload on submit', async () => {
      renderWithProviders(<MemberPaymentEditModal {...defaultProps} />)

      // Change the concept field
      const conceptInput = screen.getByDisplayValue('Licencia KYU 2024')
      await user.clear(conceptInput)
      await user.type(conceptInput, 'Licencia KYU actualizada')

      // Submit the form
      const submitBtn = screen.getByRole('button', { name: /guardar|actualizar/i })
      await user.click(submitBtn)

      expect(mockUpdateMemberPayment).toHaveBeenCalledTimes(1)
      expect(mockUpdateMemberPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mp-123',
          data: expect.objectContaining({
            concept: 'Licencia KYU actualizada',
            amount: 50,
            payment_type: 'licencia_kyu',
            status: 'pending',
          }),
        })
      )
    })
  })

  describe('validation — negative amount', () => {
    it('shows a validation error for negative amount and does NOT call the mutation', async () => {
      renderWithProviders(<MemberPaymentEditModal {...defaultProps} />)

      // Use fireEvent.change for type="number" inputs — user-event does not
      // reliably set negative values in jsdom because intermediate states like
      // "-" are not valid numbers and the browser/jsdom discards them.
      const amountInput = screen.getByDisplayValue('50')
      fireEvent.change(amountInput, { target: { value: '-10' } })

      const submitBtn = screen.getByRole('button', { name: /guardar|actualizar/i })
      await user.click(submitBtn)

      // Validation error should appear
      expect(
        screen.getByText(/el importe no puede ser negativo/i)
      ).toBeInTheDocument()

      // Mutation must NOT have been called
      expect(mockUpdateMemberPayment).not.toHaveBeenCalled()
    })
  })

  describe('close on success', () => {
    it('calls onClose when the mutation reports isSuccess', async () => {
      const { useUpdateMemberPaymentMutation } = await import(
        '../../hooks/mutations/usePaymentAdminMutations'
      )
      vi.mocked(useUpdateMemberPaymentMutation).mockReturnValue({
        updateMemberPayment: mockUpdateMemberPayment,
        isLoading: false,
        error: null,
        isSuccess: true,
      })

      const onClose = vi.fn()
      renderWithProviders(
        <MemberPaymentEditModal {...defaultProps} onClose={onClose} />
      )

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('cancel button', () => {
    it('calls onClose when the cancel button is clicked', async () => {
      const onClose = vi.fn()
      renderWithProviders(
        <MemberPaymentEditModal {...defaultProps} onClose={onClose} />
      )

      await user.click(screen.getByRole('button', { name: /cancelar/i }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})

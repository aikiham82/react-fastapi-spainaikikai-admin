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

    it('does not offer the stored concept, which holds internal keys', () => {
      renderWithProviders(<MemberPaymentEditModal {...defaultProps} />)

      expect(screen.queryByLabelText('Concepto')).not.toBeInTheDocument()
      expect(screen.queryByDisplayValue('Licencia KYU 2024')).not.toBeInTheDocument()
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

      // Submit the form
      const submitBtn = screen.getByRole('button', { name: /guardar|actualizar/i })
      await user.click(submitBtn)

      expect(mockUpdateMemberPayment).toHaveBeenCalledTimes(1)
      const { id, data } = mockUpdateMemberPayment.mock.calls[0][0]
      expect(id).toBe('mp-123')
      expect(data).toMatchObject({ amount: 50, payment_type: 'licencia_kyu', status: 'pending' })
      expect(data).not.toHaveProperty('concept')
    })

    it('moves the payment line to another year', async () => {
      renderWithProviders(<MemberPaymentEditModal {...defaultProps} />)

      const yearInput = screen.getByLabelText('Año')
      await user.clear(yearInput)
      await user.type(yearInput, '2025')
      await user.click(screen.getByRole('button', { name: /guardar/i }))

      expect(mockUpdateMemberPayment).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ payment_year: 2025 }) })
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

  describe('validation — empty amount', () => {
    it('asks for the amount instead of saving the line at 0', async () => {
      renderWithProviders(<MemberPaymentEditModal {...defaultProps} />)

      fireEvent.change(screen.getByDisplayValue('50'), { target: { value: '' } })
      await user.click(screen.getByRole('button', { name: /guardar|actualizar/i }))

      expect(screen.getByText('Indica un importe válido')).toBeInTheDocument()
      expect(mockUpdateMemberPayment).not.toHaveBeenCalled()
    })

    it('still saves an amount of 0 written on purpose', async () => {
      renderWithProviders(<MemberPaymentEditModal {...defaultProps} />)

      fireEvent.change(screen.getByDisplayValue('50'), { target: { value: '0' } })
      await user.click(screen.getByRole('button', { name: /guardar|actualizar/i }))

      expect(mockUpdateMemberPayment.mock.calls[0][0].data.amount).toBe(0)
    })
  })

  describe('focus on open', () => {
    it('focuses the dialog, so a phone does not open its keyboard', async () => {
      renderWithProviders(<MemberPaymentEditModal {...defaultProps} />)

      await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus())
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

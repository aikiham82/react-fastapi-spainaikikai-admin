import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { PaymentTotalBar } from '../PaymentTotalBar'

const context = {
  formData: { include_club_fee: true },
  totals: { total: 323 },
  pickedMemberCount: 4,
  isSubmitting: false,
  submitPayment: vi.fn(),
  canPay: true,
  submitError: null,
  errors: {},
}

vi.mock('../../hooks/useAnnualPaymentContext', () => ({
  useAnnualPaymentContext: () => context,
}))

describe('PaymentTotalBar', () => {
  it('shows the running total in euros', () => {
    renderWithProviders(<PaymentTotalBar />)

    expect(screen.getByText(/4 miembros \+ cuota/)).toBeInTheDocument()
    expect(screen.getByText(/323,00\s€/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pagar con tarjeta' })).toBeEnabled()
  })
})

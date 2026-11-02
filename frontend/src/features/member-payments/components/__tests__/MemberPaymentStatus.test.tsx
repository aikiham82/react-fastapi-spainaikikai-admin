import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { MemberPaymentStatus } from '../MemberPaymentStatus'

const mockUseMemberPaymentStatusQuery = vi.fn()

vi.mock('../../hooks/queries/useMemberPaymentQueries', () => ({
  useMemberPaymentStatusQuery: (...args: unknown[]) => mockUseMemberPaymentStatusQuery(...args),
}))

const statusWith = (licencePaid: boolean, insurancePaid: boolean) => ({
  payment_year: 2026,
  total_paid: 0,
  has_all_licenses: licencePaid,
  has_all_insurances: insurancePaid,
  payment_statuses: [
    { payment_type: 'licencia_kyu', is_paid: licencePaid, amount: licencePaid ? 15 : null },
    { payment_type: 'seguro_accidentes', is_paid: insurancePaid, amount: insurancePaid ? 15 : null },
    { payment_type: 'seguro_rc', is_paid: insurancePaid, amount: insurancePaid ? 35 : null },
  ],
})

const renderWith = (licencePaid: boolean, insurancePaid: boolean) => {
  mockUseMemberPaymentStatusQuery.mockReturnValue({
    data: statusWith(licencePaid, insurancePaid),
    isLoading: false,
    error: null,
  })
  renderWithProviders(<MemberPaymentStatus memberId="mem-1" />)
}

const iconOf = (text: string) => screen.getByText(text).parentElement?.querySelector('svg')

describe('MemberPaymentStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('without insurance, the insurance group and its lines show no danger', () => {
    renderWith(true, false)

    for (const text of ['Seguros', 'Seguro de accidentes', 'Seguro RC']) {
      expect(iconOf(text)).not.toHaveClass('text-danger')
    }
    expect(screen.getByText('Seguro RC').closest('.bg-danger-soft')).toBeNull()
  })

  it('with all insurances, the insurance group keeps the success icon', () => {
    renderWith(true, true)

    expect(iconOf('Seguros')).toHaveClass('text-success')
    expect(iconOf('Seguro RC')).toHaveClass('text-success')
  })

  it('without licence, the licence group keeps the danger icon', () => {
    renderWith(false, false)

    expect(iconOf('Licencias')).toHaveClass('text-danger')
    expect(iconOf('Licencia KYU')).toHaveClass('text-danger')
    expect(screen.getByText('Licencia KYU').closest('.bg-danger-soft')).not.toBeNull()
  })
})

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

const toneOf = (text: string) => {
  const heading = screen.queryByRole('heading', { name: text })
  const container = heading ?? screen.getByText(text).parentElement
  return container?.querySelector('[data-tone]')?.getAttribute('data-tone')
}

describe('MemberPaymentStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('without insurance, the insurance group and its lines show no danger', () => {
    renderWith(true, false)

    expect(toneOf('Seguros')).toBe('neutral')
    expect(toneOf('Seguro de accidentes')).toBe('neutral')
    expect(toneOf('Seguro RC')).toBe('neutral')
    expect(screen.getByText('Seguro RC').closest('.bg-danger-soft')).toBeNull()
  })

  it('with all insurances, the insurance group keeps the success tone', () => {
    renderWith(true, true)

    expect(toneOf('Seguros')).toBe('ok')
    expect(toneOf('Seguro RC')).toBe('ok')
  })

  it('without licence, the licence group keeps the danger tone', () => {
    renderWith(false, false)

    expect(toneOf('Licencias')).toBe('bad')
    expect(toneOf('Licencia KYU')).toBe('bad')
    expect(screen.getByText('Licencia KYU').closest('.bg-danger-soft')).not.toBeNull()
  })
})

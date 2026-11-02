import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { MemberPaymentStatus } from '../MemberPaymentStatus'
import { MEMBER_PAYMENT_TYPES } from '../../data/schemas/member-payment.schema'

const mockUseMemberPaymentStatusQuery = vi.fn()

vi.mock('../../hooks/queries/useMemberPaymentQueries', () => ({
  useMemberPaymentStatusQuery: (...args: unknown[]) => mockUseMemberPaymentStatusQuery(...args),
}))

const LICENCE_TYPES = [
  'licencia_kyu',
  'licencia_kyu_infantil',
  'licencia_dan',
  'titulo_fukushidoin',
  'titulo_shidoin',
] as const

type LicenceType = (typeof LICENCE_TYPES)[number]

const statusWith = (paidLicence: LicenceType | null, insurancePaid: boolean) => ({
  payment_year: 2026,
  total_paid: 0,
  has_all_licenses: paidLicence !== null,
  has_all_insurances: insurancePaid,
  payment_statuses: [
    ...LICENCE_TYPES.map((payment_type) => ({
      payment_type,
      is_paid: payment_type === paidLicence,
      amount: payment_type === paidLicence ? 15 : null,
    })),
    { payment_type: 'seguro_accidentes', is_paid: insurancePaid, amount: insurancePaid ? 15 : null },
    { payment_type: 'seguro_rc', is_paid: insurancePaid, amount: insurancePaid ? 35 : null },
  ],
})

const renderWith = (paidLicence: LicenceType | null, insurancePaid: boolean) => {
  mockUseMemberPaymentStatusQuery.mockReturnValue({
    data: statusWith(paidLicence, insurancePaid),
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

  it.each(LICENCE_TYPES)('with %s paid, shows only that licence line', (paid) => {
    renderWith(paid, false)

    expect(toneOf('Licencias')).toBe('ok')
    expect(toneOf(MEMBER_PAYMENT_TYPES[paid])).toBe('ok')
    for (const other of LICENCE_TYPES.filter((type) => type !== paid)) {
      expect(screen.queryByText(MEMBER_PAYMENT_TYPES[other])).not.toBeInTheDocument()
    }
  })

  it('without a licence, shows one amber line naming the year and no licence type', () => {
    renderWith(null, false)

    expect(toneOf('Licencias')).toBe('warn')
    expect(toneOf('Sin licencia pagada en 2026')).toBe('warn')
    expect(screen.getByText('Sin licencia pagada en 2026').closest('.bg-warning-soft')).not.toBeNull()
    for (const type of LICENCE_TYPES) {
      expect(screen.queryByText(MEMBER_PAYMENT_TYPES[type])).not.toBeInTheDocument()
    }
    expect(document.querySelector('[data-tone="bad"], .bg-danger-soft')).toBeNull()
  })

  it('without insurance, the insurance group and its lines stay neutral', () => {
    renderWith('licencia_kyu', false)

    expect(toneOf('Seguros')).toBe('neutral')
    expect(toneOf('Seguro de accidentes')).toBe('neutral')
    expect(toneOf('Seguro RC')).toBe('neutral')
    expect(screen.getByText('Seguro RC').closest('.bg-muted')).not.toBeNull()
  })

  it('shows the RC included in a title as paid, without an amount of its own', () => {
    const status = statusWith('titulo_shidoin', false)
    mockUseMemberPaymentStatusQuery.mockReturnValue({
      data: {
        ...status,
        payment_statuses: status.payment_statuses.map((line) =>
          line.payment_type === 'seguro_rc' ? { ...line, is_paid: true, amount: null } : line,
        ),
      },
      isLoading: false,
      error: null,
    })
    renderWithProviders(<MemberPaymentStatus memberId="mem-1" />)

    expect(toneOf('Seguro RC')).toBe('ok')
    expect(screen.getByText('Seguro RC').closest('.bg-success-soft')).not.toHaveTextContent('€')
    expect(toneOf('Seguro de accidentes')).toBe('neutral')
  })

  it('with all insurances, the insurance group keeps the success tone', () => {
    renderWith('licencia_kyu', true)

    expect(toneOf('Seguros')).toBe('ok')
    expect(toneOf('Seguro RC')).toBe('ok')
  })
})

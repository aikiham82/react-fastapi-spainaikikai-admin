import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { AnnualPaymentProvider, useAnnualPaymentContext } from '../../hooks/useAnnualPaymentContext'
import { PaymentChecklist } from '../PaymentChecklist'
import { PaymentSummary } from '../PaymentSummary'
import type { Member } from '@/features/members/data/schemas/member.schema'
import type {
  AnnualPaymentPrices,
  MemberPaymentAssignment,
  PrefillAnnualPaymentResponse,
} from '../../data/schemas/annual-payment.schema'

const mutate = vi.fn()
let prefill: PrefillAnnualPaymentResponse
let members: Member[]

vi.mock('@/features/auth/hooks/useAuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/hooks/useAuthContext')>()),
  useAuthContext: () => ({ userRole: 'club_admin', clubId: 'club-1' }),
}))
vi.mock('@/features/clubs/hooks/queries/useClubQueries', () => ({
  useClubsQuery: () => ({ data: [{ id: 'club-1', name: 'Dojo Ejemplo' }], isLoading: false }),
}))
vi.mock('@/features/members/hooks/queries/useMemberQueries', () => ({
  useMembersQuery: () => ({ data: members, isLoading: false }),
}))
vi.mock('../../hooks/queries/useAnnualPaymentPricesQuery', () => ({
  useAnnualPaymentPricesQuery: () => ({ data: prices, isLoading: false, error: null }),
}))
vi.mock('../../hooks/queries/useAnnualPaymentPrefillQuery', () => ({
  useAnnualPaymentPrefillQuery: () => ({ data: prefill, isLoading: false }),
}))
vi.mock('../../hooks/mutations/useInitiateAnnualPayment.mutation', () => ({
  useInitiateAnnualPaymentMutation: () => ({ mutate, isPending: false, error: null }),
}))

const prices: AnnualPaymentPrices = {
  club_fee: 50,
  kyu: 30,
  kyu_infantil: 20,
  dan: 40,
  fukushidoin: 60,
  shidoin: 70,
  seguro_accidentes: 15,
  seguro_rc: 10,
}

const member = (id: string, first: string, licence: Partial<NonNullable<Member['license_summary']>>): Member =>
  ({
    id,
    first_name: first,
    last_name: 'Ejemplo',
    birth_date: '1990-01-01',
    club_id: 'club-1',
    status: 'active',
    license_summary: {
      grade: null,
      technical_grade: null,
      instructor_category: null,
      status: 'active',
      expiration_date: null,
      ...licence,
    },
  }) as Member

const assignment = (member_id: string, member_name: string, payment_types: string[]): MemberPaymentAssignment => ({
  member_id,
  member_name,
  payment_types,
})

const makePrefill = (overrides: Partial<PrefillAnnualPaymentResponse> = {}): PrefillAnnualPaymentResponse => ({
  payer_name: 'Director Ejemplo',
  include_club_fee: true,
  club_fee_already_paid: false,
  kyu_count: 0,
  kyu_infantil_count: 0,
  dan_count: 0,
  fukushidoin_count: 0,
  shidoin_count: 0,
  seguro_accidentes_count: 0,
  seguro_rc_count: 0,
  member_assignments: [],
  source: 'members',
  paid_assignments: [],
  ...overrides,
})

const Counts = () => {
  const { formData } = useAnnualPaymentContext()
  const { member_assignments: _ignored, ...rest } = formData
  return <output data-testid="counts">{JSON.stringify(rest)}</output>
}

const renderChecklist = () =>
  renderWithProviders(
    <AnnualPaymentProvider>
      <PaymentChecklist />
      <PaymentSummary />
      <Counts />
    </AnnualPaymentProvider>,
  )

const counts = () => JSON.parse(screen.getByTestId('counts').textContent ?? '{}')

const rowOf = (name: string) => screen.getByRole('group', { name: new RegExp(name) })

describe('PaymentChecklist', () => {
  beforeEach(() => {
    mutate.mockClear()
    members = [
      member('m-kyu', 'Kira', { technical_grade: 'kyu', grade: '3er Kyu' }),
      member('m-inf', 'Ines', { technical_grade: 'kyu', grade: '5º Kyu Infantil' }),
      member('m-dan', 'Dario', { technical_grade: 'dan', grade: '1er Dan' }),
      member('m-fuku', 'Fuku', { technical_grade: 'dan', instructor_category: 'fukushidoin', grade: '3er Dan' }),
      member('m-shi', 'Shi', { technical_grade: 'dan', instructor_category: 'shidoin', grade: '5º Dan' }),
    ]
    prefill = makePrefill()
  })

  it('derives kyu, kyu infantil, dan, fukushidoin and shidoin counts from ticked members', async () => {
    renderChecklist()

    for (const [name, label] of [
      ['Kira', 'Licencia Kyu'],
      ['Ines', 'Licencia Kyu infantil'],
      ['Dario', 'Licencia Dan'],
      ['Fuku', 'Licencia Fukushidoin'],
      ['Shi', 'Licencia Shidoin'],
    ]) {
      await userEvent.click(within(rowOf(name)).getByRole('checkbox', { name: new RegExp(`^${label}$`) }))
    }

    expect(counts()).toMatchObject({
      kyu_count: 1,
      kyu_infantil_count: 1,
      dan_count: 1,
      fukushidoin_count: 1,
      shidoin_count: 1,
      seguro_accidentes_count: 0,
      seguro_rc_count: 0,
    })
  })

  it('does not offer RC for fukushidoin or shidoin', () => {
    renderChecklist()

    for (const name of ['Fuku', 'Shi']) {
      const row = within(rowOf(name))
      expect(row.getByRole('checkbox', { name: 'Seguro de accidentes' })).toBeInTheDocument()
      expect(row.queryByRole('checkbox', { name: /RC/ })).not.toBeInTheDocument()
      expect(row.getByText(/ya incluye el seguro RC/i)).toBeInTheDocument()
    }
    expect(within(rowOf('Kira')).getByRole('checkbox', { name: 'Seguro RC' })).toBeInTheDocument()
  })

  it('does not pretick members already paid', () => {
    prefill = makePrefill({
      member_assignments: [assignment('m-kyu', 'Kira Ejemplo', ['kyu', 'seguro_accidentes'])],
      paid_assignments: [assignment('m-dan', 'Dario Ejemplo', ['dan', 'seguro_accidentes', 'seguro_rc'])],
    })
    renderChecklist()

    const paid = rowOf('Dario')
    expect(within(paid).getByText('Al día')).toBeInTheDocument()
    expect(within(paid).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(within(rowOf('Kira')).getByRole('checkbox', { name: 'Licencia Kyu' })).toBeChecked()
    expect(within(rowOf('Ines')).getByRole('checkbox', { name: 'Licencia Kyu infantil' })).not.toBeChecked()
    expect(counts()).toMatchObject({ kyu_count: 1, dan_count: 0 })
  })

  it('includes the club fee only when unpaid', async () => {
    const { unmount } = renderChecklist()
    expect(screen.getByRole('checkbox', { name: /Cuota anual del club/ })).toBeChecked()
    expect(counts().include_club_fee).toBe(true)
    unmount()

    prefill = makePrefill({ include_club_fee: false, club_fee_already_paid: true })
    renderChecklist()
    expect(screen.queryByRole('checkbox', { name: /Cuota anual del club/ })).not.toBeInTheDocument()
    expect(counts().include_club_fee).toBe(false)
  })

  it('lets the club pay accident insurance without RC', async () => {
    members = [member('m-kyu', 'Kira', { technical_grade: 'kyu', grade: '3er Kyu' })]
    renderChecklist()

    const row = within(rowOf('Kira'))
    await userEvent.click(row.getByRole('checkbox', { name: 'Seguro de accidentes' }))

    expect(counts()).toMatchObject({ seguro_accidentes_count: 1, seguro_rc_count: 0, kyu_count: 0 })
  })

  it('lets a member without licence choose the licence type', async () => {
    members = [{ ...member('m-new', 'Nuevo', {}), license_summary: undefined } as Member]
    renderChecklist()

    const row = within(rowOf('Nuevo'))
    await userEvent.selectOptions(row.getByRole('combobox', { name: 'Tipo de licencia de Nuevo Ejemplo' }), 'dan')

    expect(row.getByRole('checkbox', { name: 'Licencia Dan' })).toBeChecked()
    expect(counts()).toMatchObject({ dan_count: 1, kyu_count: 0 })
  })

  it('sends the counts derived from the ticked members for a mixed payment', async () => {
    prefill = makePrefill({
      member_assignments: [
        assignment('m-kyu', 'Kira Ejemplo', ['kyu', 'seguro_accidentes', 'seguro_rc']),
        assignment('m-shi', 'Shi Ejemplo', ['shidoin', 'seguro_accidentes', 'seguro_rc']),
      ],
    })
    renderChecklist()

    await userEvent.click(screen.getAllByRole('button', { name: /Pagar con tarjeta/ })[0])

    expect(mutate).toHaveBeenCalledTimes(1)
    const payload = mutate.mock.calls[0][0]
    expect(payload).toMatchObject({
      payer_name: 'Director Ejemplo',
      club_id: 'club-1',
      include_club_fee: true,
      kyu_count: 1,
      kyu_infantil_count: 0,
      dan_count: 0,
      fukushidoin_count: 0,
      shidoin_count: 1,
      seguro_accidentes_count: 2,
      seguro_rc_count: 1,
    })
    expect(payload.member_assignments).toEqual([
      assignment('m-kyu', 'Kira Ejemplo', ['kyu', 'seguro_accidentes', 'seguro_rc']),
      assignment('m-shi', 'Shi Ejemplo', ['shidoin', 'seguro_accidentes']),
    ])
  })
})

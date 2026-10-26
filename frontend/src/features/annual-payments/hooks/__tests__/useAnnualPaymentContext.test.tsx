import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, act } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { AnnualPaymentProvider, useAnnualPaymentContext } from '../useAnnualPaymentContext'
import type { Member } from '@/features/members/data/schemas/member.schema'
import type { PrefillAnnualPaymentResponse } from '../../data/schemas/annual-payment.schema'

let membersByClub: Record<string, Member[]>
let pendingMembersClubs: Set<string>
let prefillByClub: Record<string, PrefillAnnualPaymentResponse>
let lastMembers: Member[] = []

vi.mock('@/features/auth/hooks/useAuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/hooks/useAuthContext')>()),
  useAuthContext: () => ({ userRole: 'super_admin', clubId: null }),
}))
vi.mock('@/features/clubs/hooks/queries/useClubQueries', () => ({
  useClubsQuery: () => ({ data: [], isLoading: false }),
}))
vi.mock('@/features/members/hooks/queries/useMemberQueries', () => ({
  useMembersQuery: (filters: { club_id: string }) => {
    if (pendingMembersClubs.has(filters.club_id)) {
      return { data: lastMembers, isLoading: false, isPlaceholderData: true }
    }
    lastMembers = membersByClub[filters.club_id] ?? []
    return { data: lastMembers, isLoading: false, isPlaceholderData: false }
  },
}))
vi.mock('../queries/useAnnualPaymentPricesQuery', () => ({
  useAnnualPaymentPricesQuery: () => ({
    data: {
      club_fee: 50, kyu: 30, kyu_infantil: 20, dan: 40,
      fukushidoin: 60, shidoin: 70, seguro_accidentes: 15, seguro_rc: 10,
    },
    isLoading: false,
    error: null,
  }),
}))
vi.mock('../queries/useAnnualPaymentPrefillQuery', () => ({
  useAnnualPaymentPrefillQuery: (clubId: string) => ({
    data: prefillByClub[clubId],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}))
vi.mock('../mutations/useInitiateAnnualPayment.mutation', () => ({
  useInitiateAnnualPaymentMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))

const member = (id: string, first: string, clubId: string): Member =>
  ({
    id,
    first_name: first,
    last_name: 'Ejemplo',
    birth_date: '1990-01-01',
    club_id: clubId,
    status: 'active',
    license_summary: { grade: '3er Kyu', technical_grade: 'kyu', instructor_category: null },
  }) as Member

const prefillFor = (memberId: string): PrefillAnnualPaymentResponse =>
  ({
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
    member_assignments: [{ member_id: memberId, member_name: 'x', payment_types: ['kyu'] }],
    paid_assignments: [],
    source: 'members',
  }) as PrefillAnnualPaymentResponse

const Probe = () => {
  const { formData, setField, rows } = useAnnualPaymentContext()
  return (
    <>
      <button onClick={() => setField('club_id', 'club-a')}>go-a</button>
      <button onClick={() => setField('club_id', 'club-b')}>go-b</button>
      <output data-testid="rows">{rows.map((row) => row.memberId).join(',')}</output>
      <output data-testid="ticked">{formData.member_assignments.map((a) => a.member_id).join(',')}</output>
    </>
  )
}

const tree = () => (
  <AnnualPaymentProvider>
    <Probe />
  </AnnualPaymentProvider>
)

const goTo = (label: string) => act(async () => screen.getByText(label).click())

describe('useAnnualPaymentContext club switching', () => {
  beforeEach(() => {
    lastMembers = []
    pendingMembersClubs = new Set()
    membersByClub = {
      'club-a': [member('a-1', 'Ana', 'club-a')],
      'club-b': [member('b-1', 'Beto', 'club-b')],
    }
    prefillByClub = { 'club-a': prefillFor('a-1'), 'club-b': prefillFor('b-1') }
  })

  it("waits for the new club's members before applying its prefill", async () => {
    const { rerender } = renderWithProviders(tree())
    await goTo('go-a')
    expect(screen.getByTestId('ticked').textContent).toBe('a-1')

    pendingMembersClubs.add('club-b')
    await goTo('go-b')

    expect(screen.getByTestId('rows').textContent).toBe('')

    pendingMembersClubs.clear()
    rerender(tree())

    expect(screen.getByTestId('rows').textContent).toBe('b-1')
    expect(screen.getByTestId('ticked').textContent).toBe('b-1')
  })

  it('re-applies the prefill when returning to a club', async () => {
    renderWithProviders(tree())
    await goTo('go-a')
    await goTo('go-b')
    expect(screen.getByTestId('ticked').textContent).toBe('b-1')

    await goTo('go-a')

    expect(screen.getByTestId('rows').textContent).toBe('a-1')
    expect(screen.getByTestId('ticked').textContent).toBe('a-1')
  })
})

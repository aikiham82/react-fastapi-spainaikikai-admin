import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { MemberList } from '../MemberList'
import type { Member } from '../../data/schemas/member.schema'

const state = vi.hoisted(() => ({
  members: [] as unknown[],
  isLoading: false,
  setFilters: vi.fn(),
  role: 'super_admin',
}))

vi.mock('../../hooks/useMemberContext', () => ({
  useMemberContext: () => ({
    members: state.members,
    isLoading: state.isLoading,
    isFetching: false,
    error: null,
    filters: { limit: 0, offset: 0 },
    setFilters: state.setFilters,
    total: state.members.length,
    limit: 0,
    offset: 0,
    deleteMember: vi.fn(),
    changeMemberStatus: vi.fn(),
    setPagination: vi.fn(),
  }),
}))

vi.mock('@/features/clubs/hooks/queries/useClubQueries', () => ({
  useClubsQuery: () => ({ data: [{ id: 'club-1', name: 'Example Club' }] }),
}))

vi.mock('@/features/auth/hooks/useAuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/hooks/useAuthContext')>()),
  useAuthContext: () => ({ userRole: state.role, clubId: 'club-1' }),
}))

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true }),
}))

vi.mock('@/features/users/hooks/queries/useMembersWithAccountQuery', () => ({
  useMembersWithAccountQuery: () => ({ memberIdsWithAccount: new Set<string>() }),
}))

vi.mock('../MemberForm', () => ({ MemberForm: () => null }))
vi.mock('@/features/member-payments/components/MemberPaymentStatus', () => ({ MemberPaymentStatus: () => null }))
vi.mock('@/features/club-payments/components/MemberPaymentLines', () => ({ MemberPaymentLines: () => null }))

const member = (overrides: Partial<Member> = {}): Member =>
  ({
    id: 'member-1',
    first_name: 'Ana',
    last_name: 'Example',
    email: 'ana@example.com',
    phone: '600000000',
    club_id: 'club-1',
    club_name: 'Example Club',
    status: 'active',
    license_summary: { grade: '1 Kyu', status: 'active' },
    insurance_summary: { has_rc: true, rc_status: 'active', has_accident: false },
    ...overrides,
  }) as Member

describe('MemberList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.members = [member()]
    state.isLoading = false
    state.role = 'super_admin'
  })

  it('fits filters behind one Filtros button', async () => {
    renderWithProviders(<MemberList />)

    expect(screen.getAllByRole('button', { name: /Filtros/ })).toHaveLength(1)
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: /Filtros/ }))

    expect(screen.getByText('Estado del miembro')).toBeInTheDocument()
    expect(screen.getByText('Licencia', { selector: 'label' })).toBeInTheDocument()
    expect(screen.getByText('Club', { selector: 'label' })).toBeInTheDocument()
    expect(screen.getByText('Solo con acceso a la web')).toBeInTheDocument()
  })

  it('clears search and filters with Quitar filtros', async () => {
    const { rerender } = renderWithProviders(<MemberList />)

    const search = screen.getByRole('searchbox')
    await userEvent.type(search, 'zzz')
    state.members = []
    rerender(<MemberList />)

    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))

    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByText('Todavía no hay miembros activos')).toBeInTheDocument()
    const reset = state.setFilters.mock.calls.at(-1)?.[0]
    expect(reset({ search: 'zzz' })).toMatchObject({ search: undefined, status: 'active' })
  })

  it('keeps the toolbar and a way to reach members de baja when no active member exists', async () => {
    state.members = []
    renderWithProviders(<MemberList />)

    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Filtros/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Incluir miembros de baja' })).toBeInTheDocument()
  })

  it('shows the empty-club state only when every status is empty', async () => {
    state.members = []
    renderWithProviders(<MemberList />)
    await userEvent.click(screen.getByRole('button', { name: 'Incluir miembros de baja' }))

    expect(screen.getByText('Todavía no hay miembros')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('does not unmount the search box while the user clears a search with no results', async () => {
    const { rerender } = renderWithProviders(<MemberList />)
    const search = screen.getByRole('searchbox')
    await userEvent.type(search, 'zzz')
    state.members = []
    rerender(<MemberList />)
    await userEvent.clear(screen.getByRole('searchbox'))

    expect(screen.getByRole('searchbox')).toBe(search)
  })

  it('shows the two insurance tiles with a spoken state on mobile cards', () => {
    renderWithProviders(<MemberList />)

    const card = screen.getAllByTestId('member-card')[0]
    expect(within(card).getByLabelText('Seguro de accidentes: sin seguro')).toHaveAttribute('data-tone', 'bad')
    expect(within(card).getByLabelText('Seguro de responsabilidad civil: al día')).toHaveAttribute('data-tone', 'ok')
    expect(within(card).getByLabelText('Seguro de accidentes: sin seguro').querySelector('.lucide-circle-x')).not.toBeNull()
    expect(within(card).getByLabelText('Seguro de responsabilidad civil: al día').querySelector('.lucide-circle-check')).not.toBeNull()
  })

  it('marks both tiles ok when both insurances are in order', () => {
    state.members = [
      member({
        insurance_summary: { has_rc: true, rc_status: 'active', has_accident: true, accident_status: 'active' },
      } as Partial<Member>),
    ]
    renderWithProviders(<MemberList />)

    const card = screen.getAllByTestId('member-card')[0]
    expect(within(card).getByText('Activa')).toBeInTheDocument()
    expect(within(card).getByLabelText('Seguro de accidentes: al día')).toHaveAttribute('data-tone', 'ok')
  })

  it('tells a pending insurance apart from a missing one', () => {
    state.members = [
      member({
        insurance_summary: { has_rc: true, rc_status: 'pending', has_accident: false, accident_status: null },
      } as Partial<Member>),
    ]
    renderWithProviders(<MemberList />)

    const card = screen.getAllByTestId('member-card')[0]
    expect(within(card).getByLabelText('Seguro de responsabilidad civil: pendiente')).toHaveAttribute('data-tone', 'neutral')
    expect(within(card).getByLabelText('Seguro de accidentes: sin seguro')).toHaveAttribute('data-tone', 'bad')
  })

  it('counts the quick chips and filters by them', async () => {
    state.members = [
      member({ id: 'a', first_name: 'Ana', insurance_summary: { has_rc: true, rc_status: 'active', has_accident: true, accident_status: 'active' } } as Partial<Member>),
      member({ id: 'b', first_name: 'Beto' }),
    ]
    renderWithProviders(<MemberList />)

    expect(screen.getByRole('radio', { name: 'Todos 2' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Sin seguro 1' }))

    const cards = screen.getAllByTestId('member-card')
    expect(cards).toHaveLength(1)
    expect(within(cards[0]).getByText('Beto Example')).toBeInTheDocument()
  })

  it('shows grades with Spanish ordinals', () => {
    state.members = [member({ license_summary: { grade: '4th Dan', status: 'active' } } as Partial<Member>)]
    renderWithProviders(<MemberList />)

    expect(within(screen.getAllByTestId('member-card')[0]).getByText('4.º Dan')).toBeInTheDocument()
  })

  it('shows the DNI on the card and in the table', () => {
    state.members = [member({ dni: '12345678Z' })]
    renderWithProviders(<MemberList />)

    expect(screen.getAllByText(/DNI 12345678Z/)).toHaveLength(2)
  })

  it('tells the user the search finds a DNI too', () => {
    renderWithProviders(<MemberList />)

    expect(screen.getByRole('searchbox', { name: 'Buscar nombre o DNI' })).toBeInTheDocument()
  })

  it('shows no DNI label when the member has none', () => {
    state.members = [member({ dni: '' })]
    renderWithProviders(<MemberList />)

    expect(screen.queryByText(/DNI/)).not.toBeInTheDocument()
  })

  it('shows skeleton rows instead of a bare spinner while loading', () => {
    state.members = []
    state.isLoading = true
    renderWithProviders(<MemberList />)

    expect(screen.getByRole('status', { name: 'Cargando miembros' })).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from '../Dashboard'
import { useDashboardDataQuery } from '../../hooks/queries/useDashboardData.query'
import type { DashboardData } from '../../data/schemas/dashboard.schema'

vi.mock('../../hooks/queries/useDashboardData.query', () => ({ useDashboardDataQuery: vi.fn() }))

const permissions = { isAssociationAdmin: () => false, canAccess: () => true }
vi.mock('@/core/hooks/usePermissions', () => ({ usePermissions: () => permissions }))
vi.mock('@/components/useIdentity', () => ({ useIdentity: () => ({ name: 'Laura Ejemplo' }) }))

const dashboardData = (overrides: Partial<DashboardData> = {}): DashboardData => ({
  stats: {
    total_clubs: 6,
    total_members: 184,
    active_members: 170,
    clubs_paid: 5,
    clubs_pending: 0,
    upcoming_seminars: 0,
    expired_licenses: 0,
    licensed_members: 150,
    insured_members: 160,
  },
  expiring_licenses: [],
  upcoming_seminars: [],
  recent_activity: [],
  ...overrides,
})

const renderWith = (data: DashboardData) => {
  vi.mocked(useDashboardDataQuery).mockReturnValue({ data, isLoading: false, error: null } as never)
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    permissions.isAssociationAdmin = () => false
  })

  it('greets the signed-in person by first name', () => {
    renderWith(dashboardData())

    expect(screen.getByRole('heading', { name: 'Hola, Laura' })).toBeInTheDocument()
  })

  it('lists expired licences as an attention row linking to the filtered list', () => {
    renderWith(dashboardData({ stats: { ...dashboardData().stats, expired_licenses: 3 } }))

    const row = screen.getByRole('link', { name: /3 licencias caducadas/i })
    expect(row).toHaveAttribute('href', '/licenses?estado=caducadas')
  })

  it('lists licences that expire soon with the first names', () => {
    renderWith(
      dashboardData({
        expiring_licenses: [
          { id: '1', member_name: 'Lucía Herrero', license_number: 'L-1', expiry_date: '2026-11-20', days_remaining: 25 },
          { id: '2', member_name: 'Marcos Ibarra', license_number: 'L-2', expiry_date: '2026-11-21', days_remaining: 26 },
        ],
      })
    )

    const row = screen.getByRole('link', { name: /2 licencias que caducan en los próximos 30 días/i })
    expect(row).toHaveTextContent('Lucía Herrero, Marcos Ibarra')
    expect(row).toHaveAttribute('href', '/licenses?estado=caducan-pronto')
  })

  it('asks a club admin to pay the season when the club has not paid', () => {
    renderWith(dashboardData({ stats: { ...dashboardData().stats, clubs_pending: 1 } }))

    expect(screen.getByRole('link', { name: /falta pagar la temporada/i })).toHaveAttribute('href', '/payments')
  })

  it('shows the paid-season bar with the unpaid count', () => {
    renderWith(dashboardData({ stats: { ...dashboardData().stats, clubs_pending: 1 } }))

    expect(screen.getByText('1 sin pagar')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Temporada pagada' })).toHaveAttribute('aria-valuenow', '5')
  })

  it('names the season it counts, the same one Pagos shows', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27))
    renderWith(dashboardData())
    vi.useRealTimers()

    expect(screen.getByText('Temporada 2026-27 pagada')).toBeInTheDocument()
  })

  it('shows licences and accident insurance in force as rings over active members', () => {
    renderWith(dashboardData())

    expect(screen.getByRole('progressbar', { name: 'Licencias al día' })).toHaveAttribute('aria-valuenow', '150')
    expect(screen.getByRole('progressbar', { name: 'Licencias al día' })).toHaveAttribute('aria-valuemax', '170')
    expect(screen.getByRole('progressbar', { name: 'Con seguro de accidentes' })).toHaveAttribute('aria-valuenow', '160')
  })

  it('keeps Pagar temporada for a club admin whose season is paid, for members who join later', () => {
    renderWith(dashboardData())

    expect(screen.getByRole('link', { name: /pagar temporada/i })).toHaveAttribute('href', '/payments')
  })

  it('shows Todo al día when nothing is pending', () => {
    renderWith(dashboardData())

    expect(screen.getByText('Todo al día.')).toBeInTheDocument()
  })

  it('hides club totals for club admins', () => {
    renderWith(dashboardData())

    expect(screen.queryByText(/6 clubs/)).not.toBeInTheDocument()
  })

  it('shows club totals for super admins', () => {
    permissions.isAssociationAdmin = () => true
    renderWith(dashboardData())

    expect(screen.getByText('6 clubs · 184 miembros, 170 activos')).toBeInTheDocument()
  })

  it('shows the next seminar date without the creation time', () => {
    renderWith(
      dashboardData({
        upcoming_seminars: [
          {
            id: 's1',
            title: 'Técnicas con bokken',
            date: '2026-11-16',
            time: '08:42',
            location: 'Valladolid',
            participants: 12,
            max_participants: 40,
            price: 35,
          },
        ],
      })
    )

    const card = screen.getByRole('link', { name: /próximo seminario/i })
    expect(card).toHaveAttribute('href', '/seminars')
    expect(card).toHaveTextContent('Técnicas con bokken')
    expect(card).toHaveTextContent('Valladolid')
    expect(card).toHaveTextContent('12 de 40 plazas')
    expect(card).not.toHaveTextContent('08:42')
  })
})

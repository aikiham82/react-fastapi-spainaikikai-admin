import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { SeminarList } from '../SeminarList'
import type { Seminar } from '../../data/schemas/seminar.schema'

const state = vi.hoisted(() => ({ seminars: [] as unknown[], role: 'club_admin' }))

vi.mock('../../hooks/useSeminarContext', () => ({
  useSeminarContext: () => ({
    seminars: state.seminars,
    isLoading: false,
    error: null,
    filters: { limit: 0, offset: 0 },
    setFilters: vi.fn(),
    total: state.seminars.length,
    limit: 0,
    offset: 0,
    deleteSeminar: vi.fn(),
    setPagination: vi.fn(),
  }),
}))
vi.mock('@/features/auth/hooks/useAuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/hooks/useAuthContext')>()),
  useAuthContext: () => ({ userRole: state.role, clubId: 'club-1' }),
}))
vi.mock('@/core/hooks/usePermissions', () => ({ usePermissions: () => ({ canAccess: () => true }) }))
vi.mock('../SeminarForm', () => ({ SeminarForm: () => null }))
vi.mock('../SolicitudOficialidadModal', () => ({ SolicitudOficialidadModal: () => null }))
vi.mock('@/core/data/apiClient', () => ({ apiClient: { get: vi.fn() } }))

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

const seminar = (overrides: Partial<Seminar>): Seminar => ({
  id: 'seminar-1',
  title: 'Seminario de ejemplo',
  description: '',
  instructor_name: 'Instructor Example',
  venue: 'Dojo Example',
  address: '',
  city: 'Ciudad Example',
  province: '',
  start_date: daysFromNow(10),
  end_date: daysFromNow(11),
  current_participants: 0,
  price: 20,
  club_id: 'club-1',
  status: 'upcoming',
  created_at: daysFromNow(-30),
  updated_at: daysFromNow(-30),
  is_official: false,
  ...overrides,
})

describe('SeminarList', () => {
  beforeEach(() => {
    state.role = 'club_admin'
  })

  it('lists upcoming seminars before past ones', () => {
    state.seminars = [
      seminar({ id: 'old', title: 'Seminario antiguo', status: 'completed', start_date: daysFromNow(-20), end_date: daysFromNow(-19) }),
      seminar({ id: 'late', title: 'Seminario lejano', start_date: daysFromNow(40), end_date: daysFromNow(41) }),
      seminar({ id: 'soon', title: 'Seminario cercano', start_date: daysFromNow(5), end_date: daysFromNow(6) }),
    ]
    renderWithProviders(<SeminarList />)

    const rows = screen.getAllByTestId('seminar-row').map((row) => row.textContent ?? '')
    expect(rows[0]).toContain('Seminario cercano')
    expect(rows[1]).toContain('Seminario lejano')
    expect(rows[2]).toContain('Seminario antiguo')
    const past = screen.getByText(/Pasados/).closest('details') as HTMLElement
    expect(past).not.toHaveAttribute('open')
    expect(within(past).getByText('Seminario antiguo')).toBeInTheDocument()
  })

  it('does not offer oficialidad for finished seminars', () => {
    state.seminars = [
      seminar({ id: 'done', title: 'Seminario terminado', status: 'completed', start_date: daysFromNow(-20), end_date: daysFromNow(-19) }),
      seminar({ id: 'stale', title: 'Seminario sin cerrar', status: 'upcoming', start_date: daysFromNow(-5), end_date: daysFromNow(-4) }),
      seminar({ id: 'next', title: 'Seminario futuro' }),
    ]
    renderWithProviders(<SeminarList />)

    const rows = screen.getAllByTestId('seminar-row')
    const rowOf = (title: string) => rows.find((r) => r.textContent?.includes(title)) as HTMLElement
    expect(within(rowOf('Seminario terminado')).queryByRole('button', { name: /oficialidad/i })).not.toBeInTheDocument()
    expect(within(rowOf('Seminario sin cerrar')).queryByRole('button', { name: /oficialidad/i })).not.toBeInTheDocument()
    expect(within(rowOf('Seminario futuro')).getByRole('button', { name: /oficialidad/i })).toBeInTheDocument()
  })
})

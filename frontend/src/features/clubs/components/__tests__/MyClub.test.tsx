import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { MyClub } from '../MyClub'

const fullClub = {
  id: 'c1', name: 'Club Ejemplo', address: 'Calle Mayor 1', city: 'Madrid', province: 'Madrid',
  postal_code: '28001', country: 'España', phone: '600000000', email: 'club@example.com',
  website: 'https://club.example.com', created_at: '', updated_at: '',
}

const state = vi.hoisted(() => ({ club: {} as Record<string, unknown>, members: [] as Record<string, unknown>[] }))

vi.mock('@/features/auth/hooks/useAuthContext', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAuthContext: () => ({ clubId: 'c1' }),
}))
vi.mock('../../hooks/queries/useClubQueries', () => ({
  useClubQuery: () => ({ data: state.club, isLoading: false, error: null }),
}))
vi.mock('@/features/members/hooks/queries/useMemberQueries', () => ({
  useMembersQuery: () => ({ data: state.members }),
}))
vi.mock('../ClubForm', () => ({
  ClubForm: ({ open, club: c }: { open: boolean; club?: { name: string } }) =>
    open ? <div role="dialog">Editando {c?.name}</div> : null,
}))

describe('MyClub', () => {
  beforeEach(() => {
    state.club = fullClub
    state.members = [
      { id: 'm1', first_name: 'Lucía', last_name: 'Ejemplo', club_role: 'admin' },
      { id: 'm2', first_name: 'Marcos', last_name: 'Prueba', club_role: 'member' },
    ]
  })

  it('names who runs the club', () => {
    renderWithProviders(<MyClub />)

    expect(screen.getByText('Responsable')).toBeInTheDocument()
    expect(screen.getByText('Lucía Ejemplo')).toBeInTheDocument()
    expect(screen.queryByText('Marcos Prueba')).not.toBeInTheDocument()
  })

  it('names every responsible when the club has two', () => {
    state.members = [
      { id: 'm1', first_name: 'Lucía', last_name: 'Ejemplo', club_role: 'admin' },
      { id: 'm3', first_name: 'Tomás', last_name: 'Prueba', club_role: 'admin' },
    ]
    renderWithProviders(<MyClub />)

    expect(screen.getByText('Responsables')).toBeInTheDocument()
    expect(screen.getByText('Lucía Ejemplo · Tomás Prueba')).toBeInTheDocument()
  })

  it('leaves out the responsible row when no member runs the club', () => {
    state.members = [{ id: 'm2', first_name: 'Marcos', last_name: 'Prueba', club_role: 'member' }]
    renderWithProviders(<MyClub />)

    expect(screen.queryByText(/^Responsable/)).not.toBeInTheDocument()
  })

  it('shows Mi club for club admins', async () => {
    renderWithProviders(<MyClub />)
    expect(screen.getByText('Club Ejemplo')).toBeInTheDocument()
    expect(screen.getByText('Calle Mayor 1')).toBeInTheDocument()
    expect(screen.getByText('28001')).toBeInTheDocument()
    expect(screen.queryByText('club@example.com')).not.toBeInTheDocument()
    expect(screen.queryByText('Correo')).not.toBeInTheDocument()
    expect(screen.getByText('https://club.example.com')).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Editar datos' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Editando Club Ejemplo')
  })

  it('lets the admin call or visit the club from its details', () => {
    renderWithProviders(<MyClub />)

    expect(screen.getByRole('link', { name: '600000000' })).toHaveAttribute('href', 'tel:600000000')
    expect(screen.getByRole('link', { name: 'https://club.example.com' })).toHaveAttribute('href', 'https://club.example.com')
  })

  it('links a web written without protocol and never links an unsafe one', () => {
    state.club = { ...fullClub, website: 'club.example.com' }
    const { unmount } = renderWithProviders(<MyClub />)
    expect(screen.getByRole('link', { name: 'club.example.com' })).toHaveAttribute('href', 'https://club.example.com')
    unmount()

    state.club = { ...fullClub, website: 'javascript:alert(1)' }
    renderWithProviders(<MyClub />)
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'javascript:alert(1)' })).not.toBeInTheDocument()
  })

  it('leaves out contact details the club has not filled in', () => {
    state.club = { ...fullClub, phone: '', website: undefined }
    renderWithProviders(<MyClub />)

    expect(screen.queryByText('Teléfono')).not.toBeInTheDocument()
    expect(screen.queryByText('Web')).not.toBeInTheDocument()
  })
})

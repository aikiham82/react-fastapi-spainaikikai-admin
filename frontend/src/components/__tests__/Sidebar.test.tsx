import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from '../Sidebar'

const authContext = {
  userRole: 'super_admin' as 'super_admin' | 'club_admin',
  userEmail: 'admin@example.com',
  clubId: null as string | null,
  logout: vi.fn(),
}

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: () => authContext,
}))

vi.mock('@/features/dashboard/hooks/useNavCounters', () => ({
  useNavCounters: () => ({ '/licenses': 3 }),
}))

const renderSidebar = () =>
  render(
    <MemoryRouter initialEntries={['/members']}>
      <Sidebar />
    </MemoryRouter>
  )

describe('Sidebar', () => {
  beforeEach(() => {
    authContext.userRole = 'super_admin'
    authContext.clubId = null
  })

  it('groups items into Gestión, Actividad and Administración for super admins', () => {
    renderSidebar()

    expect(screen.getByRole('navigation', { name: 'Gestión' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Actividad' })).toBeInTheDocument()
    const admin = screen.getByRole('navigation', { name: 'Administración' })
    expect(within(admin).getByRole('link', { name: 'Precios' })).toBeInTheDocument()
  })

  it('hides Administración for club admins and labels the first group Mi club', () => {
    authContext.userRole = 'club_admin'
    authContext.clubId = 'club-1'
    renderSidebar()

    expect(screen.queryByRole('navigation', { name: 'Administración' })).not.toBeInTheDocument()
    const club = screen.getByRole('navigation', { name: 'Mi club' })
    expect(within(club).getByRole('link', { name: 'Datos del club' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Precios' })).not.toBeInTheDocument()
  })

  it('has one Pagos entry for both roles instead of Pagar and Estado de pagos', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: 'Pagos' })).toHaveAttribute('href', '/payments')
    expect(screen.queryByRole('link', { name: 'Pagar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Estado de pagos' })).not.toBeInTheDocument()
  })

  it('shows Pagos to club admins too', () => {
    authContext.userRole = 'club_admin'
    authContext.clubId = 'club-1'
    renderSidebar()

    expect(screen.getAllByRole('link', { name: 'Pagos' })).toHaveLength(1)
  })

  it('gives every section an icon', () => {
    renderSidebar()

    screen.getAllByRole('link').forEach((link) => expect(link.querySelector('svg')).not.toBeNull())
  })

  it('counts what needs attention next to its section', () => {
    renderSidebar()

    expect(screen.getByRole('link', { name: /licencias/i })).toHaveTextContent('3')
  })

  it('marks the current page', () => {
    renderSidebar()

    expect(screen.getByRole('link', { name: 'Miembros' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows who is logged in without using a page heading', () => {
    renderSidebar()

    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })
})

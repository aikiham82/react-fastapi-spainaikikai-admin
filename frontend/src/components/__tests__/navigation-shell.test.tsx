import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Rail } from '../Rail'
import { Header } from '../Header'
import { BottomNav } from '../BottomNav'
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

const at = (path: string, ui: React.ReactNode) => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)

describe('Rail', () => {
  beforeEach(() => {
    authContext.userRole = 'super_admin'
  })

  it('shows one icon per group and marks the open one', () => {
    at('/licenses', <Rail />)
    const rail = screen.getByRole('navigation', { name: 'Secciones' })

    expect(within(rail).getAllByRole('link').map((link) => link.textContent?.replace(/\d+$/, ''))).toEqual([
      'Inicio',
      'Club',
      'Pagos',
      'Seminarios',
      'Admin',
      'Ajustes',
    ])
    expect(within(rail).getByRole('link', { name: /club/i })).toHaveAttribute('aria-current', 'page')
  })

  it('counts what needs attention on the group icon', () => {
    at('/', <Rail />)
    expect(screen.getByRole('link', { name: /club/i })).toHaveTextContent('3')
  })

  it('lets the user sign out from the rail', async () => {
    at('/', <Rail />)
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(authContext.logout).toHaveBeenCalled()
  })

  it('hides Admin from club admins', () => {
    authContext.userRole = 'club_admin'
    at('/', <Rail />)
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })
})

describe('Header', () => {
  beforeEach(() => {
    authContext.userRole = 'super_admin'
  })

  it('names the group and shows its screens as tabs', () => {
    at('/licenses', <Header />)

    expect(screen.getByRole('heading', { level: 1, name: 'Club' })).toBeInTheDocument()
    const tabs = screen.getByRole('navigation', { name: 'Pantallas de Club' })
    expect(within(tabs).getByRole('link', { name: 'Licencias' })).toHaveAttribute('aria-current', 'page')
  })

  it('tells Pendientes from Historial by the tab in the url', () => {
    at('/payments?tab=historial', <Header />)

    expect(screen.getByRole('link', { name: 'Historial' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Pendientes' })).not.toHaveAttribute('aria-current')
  })

  it('has no tab bar for a group with a single screen', () => {
    at('/seminars', <Header />)
    expect(screen.queryByRole('navigation', { name: /pantallas de/i })).not.toBeInTheDocument()
  })
})

describe('BottomNav', () => {
  beforeEach(() => {
    authContext.userRole = 'club_admin'
  })

  it('keeps the four daily groups and Más under the thumb', async () => {
    const onMore = vi.fn()
    at('/members', <BottomNav onMore={onMore} />)
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })

    expect(within(nav).getAllByRole('link').map((link) => link.textContent?.replace(/\d+$/, ''))).toEqual([
      'Inicio',
      'Club',
      'Pagos',
      'Seminarios',
    ])
    expect(within(nav).getByRole('link', { name: /club/i })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(within(nav).getByRole('button', { name: 'Más' }))
    expect(onMore).toHaveBeenCalledOnce()
  })
})

describe('Sidebar (full menu)', () => {
  it('lists every group with its screens and lets the user sign out', () => {
    authContext.userRole = 'super_admin'
    at('/', <Sidebar />)

    const payments = screen.getByRole('navigation', { name: 'Pagos' })
    expect(within(payments).getByRole('link', { name: 'Precios' })).toHaveAttribute('href', '/price-configurations')
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })
})

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
  currentUser: null as null | { email: string; display_name: string; club_name?: string | null },
}

const signInAsClubAdmin = (clubName = 'Club Aikido Ejemplo') => {
  authContext.userRole = 'club_admin'
  authContext.currentUser = { email: 'laura@example.com', display_name: 'Laura Ejemplo', club_name: clubName }
}

const signInAsSuperAdmin = () => {
  authContext.userRole = 'super_admin'
  authContext.currentUser = { email: 'admin@example.com', display_name: 'admin', club_name: null }
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
    signInAsSuperAdmin()
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

  it('shows the club the user manages at the top', () => {
    signInAsClubAdmin()
    at('/', <Rail />)

    expect(screen.getByRole('img', { name: 'Club Aikido Ejemplo' })).toHaveTextContent('E')
    expect(screen.getByText('Club Aikido Ejemplo')).toHaveAttribute('title', 'Club Aikido Ejemplo')
  })

  it('keeps the full name of a long club for the tooltip', () => {
    const longName = 'Asociación Deportiva Aikido Tradicional X'
    signInAsClubAdmin(longName)
    at('/', <Rail />)

    expect(screen.getByText(longName)).toHaveAttribute('title', longName)
  })

  it('shows the federation to the super admin, who has no club', () => {
    at('/', <Rail />)

    expect(screen.getByText('Spain Aikikai')).toBeInTheDocument()
  })

  it('opens the account card with who is signed in, and signs out from it', async () => {
    signInAsClubAdmin()
    at('/', <Rail />)

    await userEvent.click(screen.getByRole('button', { name: 'Tu cuenta: Laura Ejemplo' }))
    const card = screen.getByRole('dialog')
    expect(within(card).getByText('Laura Ejemplo')).toBeInTheDocument()
    expect(within(card).getByText('laura@example.com')).toBeInTheDocument()
    expect(within(card).getByText('Club Aikido Ejemplo')).toBeInTheDocument()
    expect(within(card).getByText('Responsable de club')).toBeInTheDocument()

    await userEvent.click(within(card).getByRole('button', { name: 'Cerrar sesión' }))
    expect(authContext.logout).toHaveBeenCalled()
  })

  it('does not put focus on sign-out when the card opens, so a second Enter keeps the session', async () => {
    signInAsClubAdmin()
    at('/', <Rail />)

    screen.getByRole('button', { name: 'Tu cuenta: Laura Ejemplo' }).focus()
    await userEvent.keyboard('{Enter}')

    const card = screen.getByRole('dialog', { name: 'Tu cuenta' })
    expect(within(card).getByRole('button', { name: 'Cerrar sesión' })).not.toHaveFocus()
  })

  it('labels the super admin account card with the role and no club', async () => {
    at('/', <Rail />)

    await userEvent.click(screen.getByRole('button', { name: 'Tu cuenta: Admin' }))
    const card = screen.getByRole('dialog')
    expect(within(card).getByText('Administrador')).toBeInTheDocument()
    expect(within(card).queryByText('Club Aikido Ejemplo')).not.toBeInTheDocument()
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

  it('marks no screen on an address that does not exist', () => {
    at('/payments/history', <Header />)

    expect(screen.queryByRole('link', { current: 'page' })).not.toBeInTheDocument()
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

  it('says which club and which person are signed in', () => {
    signInAsClubAdmin()
    at('/', <Sidebar />)

    expect(screen.getByText('Club Aikido Ejemplo')).toBeInTheDocument()
    expect(screen.getByText('Responsable de club')).toBeInTheDocument()
    expect(screen.getByText('Laura Ejemplo')).toBeInTheDocument()
    expect(screen.getByText('laura@example.com')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { ClubAccountsSection } from '../ClubAccountsSection'
import { usePermissions } from '@/core/hooks/usePermissions'
import { useClubAccountsQuery } from '../../hooks/queries/useClubQueries'

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}))

vi.mock('../../hooks/queries/useClubQueries', () => ({
  useClubAccountsQuery: vi.fn(),
}))

const asSuperAdmin = (isSuperAdmin: boolean) =>
  vi.mocked(usePermissions).mockReturnValue({ isAssociationAdmin: () => isSuperAdmin } as ReturnType<typeof usePermissions>)

const withAccounts = (data: unknown) =>
  vi.mocked(useClubAccountsQuery).mockReturnValue({ data, isLoading: false } as ReturnType<typeof useClubAccountsQuery>)

const dojo = {
  club_id: 'c1',
  club_name: 'Dojo Ejemplo',
  account_id: 'a1',
  username: 'DOJO EJEMPLO',
  email: 'dojo@example.com',
  candidates: [{ member_id: 'm1', name: 'Ana Ejemplo', instructor_category: 'shidoin' }],
}

describe('ClubAccountsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    asSuperAdmin(true)
  })

  it('shows each club account with a button for its shidoin', () => {
    withAccounts([dojo])

    renderWithProviders(<ClubAccountsSection />)

    expect(screen.getByRole('heading', { name: 'Cuentas de club sin persona' })).toBeInTheDocument()
    expect(screen.getByText('Dojo Ejemplo')).toBeInTheDocument()
    expect(screen.getByText('DOJO EJEMPLO')).toBeInTheDocument()
    expect(screen.getByText('dojo@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pasar la cuenta a Ana Ejemplo (Shidoin)' })).toBeInTheDocument()
  })

  it('offers to deregister each club', () => {
    withAccounts([dojo])

    renderWithProviders(<ClubAccountsSection />)

    expect(screen.getByRole('button', { name: 'Dar de baja el club' })).toBeInTheDocument()
  })

  it('names the fukushidoin when the club has no shidoin', () => {
    withAccounts([{ ...dojo, candidates: [{ member_id: 'm2', name: 'Luis Ejemplo', instructor_category: 'fukushidoin' }] }])

    renderWithProviders(<ClubAccountsSection />)

    expect(screen.getByRole('button', { name: 'Pasar la cuenta a Luis Ejemplo (Fukushidoin)' })).toBeInTheDocument()
  })

  it('points to the member card when there is no shidoin nor fukushidoin', () => {
    withAccounts([{ ...dojo, candidates: [] }])

    renderWithProviders(<ClubAccountsSection />)

    expect(screen.getByText('Sin shidoin ni fukushidoin: pásala desde la ficha del socio')).toBeInTheDocument()
  })

  it('says when no club uses a club account any more', () => {
    withAccounts([])

    renderWithProviders(<ClubAccountsSection />)

    expect(screen.getByText('Ningún club usa ya una cuenta de club')).toBeInTheDocument()
  })

  it('says when the club accounts could not be loaded', () => {
    vi.mocked(useClubAccountsQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true } as ReturnType<typeof useClubAccountsQuery>)

    renderWithProviders(<ClubAccountsSection />)

    expect(screen.getByText('No se pudieron cargar las cuentas de club')).toBeInTheDocument()
  })

  it('shows nothing to a club admin', () => {
    asSuperAdmin(false)
    withAccounts(undefined)

    const { container } = renderWithProviders(<ClubAccountsSection />)

    expect(container).toBeEmptyDOMElement()
    expect(useClubAccountsQuery).toHaveBeenCalledWith(false)
  })
})

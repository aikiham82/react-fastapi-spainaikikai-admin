import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { ClubList } from '../ClubList'

const { deleteClub, clubs } = vi.hoisted(() => ({
  deleteClub: vi.fn(),
  clubs: [
    { id: 'c1', name: 'Club Ejemplo', address: 'Calle Mayor 1', city: 'Madrid', province: 'Madrid', postal_code: '28001', country: 'España', phone: '', email: 'a@example.com' },
    { id: 'c2', name: 'Club Vacío', address: '', city: '', province: '', postal_code: '', country: '', phone: '', email: '' },
    { id: 'c3', name: 'Club Cerrado', address: '', city: '', province: '', postal_code: '', country: '', phone: '', email: '', is_active: false },
  ],
}))

vi.mock('../../hooks/useClubContext', () => ({
  useClubContext: () => ({ clubs, isLoading: false, error: null, deleteClub, createClub: vi.fn(), updateClub: vi.fn() }),
}))

const { summary } = vi.hoisted(() => ({
  summary: {
    data: undefined as undefined | { clubs: { club_id: string; total_members: number; members_with_license: number; has_club_fee: boolean }[] },
    year: undefined as number | undefined,
    enabled: undefined as boolean | undefined,
  },
}))

vi.mock('@/features/club-payments/hooks/queries/useClubPaymentsQueries', () => ({
  useAllClubsPaymentSummaryQuery: (year: number, enabled: boolean) => {
    summary.year = year
    summary.enabled = enabled
    return { data: enabled ? summary.data : undefined }
  },
}))

const rowOf = (name: string) => screen.getByText(name).closest('li') as HTMLElement

const { isSuperAdmin } = vi.hoisted(() => ({ isSuperAdmin: { value: true } }))

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isAssociationAdmin: () => isSuperAdmin.value }),
}))

describe('ClubList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isSuperAdmin.value = true
    summary.data = {
      clubs: [
        { club_id: 'c1', total_members: 20, members_with_license: 15, has_club_fee: true },
        { club_id: 'c2', total_members: 12, members_with_license: 0, has_club_fee: false },
      ],
    }
  })

  it('offers a super admin to deregister an active club from the row menu', async () => {
    renderWithProviders(<ClubList />)

    expect(screen.queryByRole('button', { name: /dar de baja/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Acciones de Club Ejemplo' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Dar de baja' }))

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Club Ejemplo y todos sus socios pasarán a baja')
  })

  it('marks a deregistered club and does not offer to deregister it again', () => {
    renderWithProviders(<ClubList />)

    expect(screen.getByText('De baja')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Acciones de Club Cerrado' })).not.toBeInTheDocument()
  })

  it('does not offer a club admin to deregister a club nor show season payments', () => {
    isSuperAdmin.value = false
    renderWithProviders(<ClubList />)

    expect(screen.queryByRole('button', { name: 'Acciones de Club Ejemplo' })).not.toBeInTheDocument()
    expect(summary.enabled).toBe(false)
    expect(screen.queryByText(/cuota/i)).not.toBeInTheDocument()
  })

  it('shows each club members, licences paid and the club fee of the current season', () => {
    renderWithProviders(<ClubList />)

    const paid = rowOf('Club Ejemplo')
    expect(within(paid).getByText('20 socios')).toBeInTheDocument()
    expect(within(paid).getByRole('progressbar', { name: 'Licencias pagadas' })).toHaveAttribute('aria-valuenow', '15')
    expect(within(paid).getByText('15 de 20 con licencia')).toBeInTheDocument()
    expect(within(paid).getByText('Cuota pagada')).toBeInTheDocument()
    expect(within(rowOf('Club Vacío')).getByText('Cuota pendiente')).toBeInTheDocument()
  })

  it('asks for the season that is being paid now', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 27))
    renderWithProviders(<ClubList />)
    vi.useRealTimers()

    expect(summary.year).toBe(2027)
  })

  it('never shows a club as unpaid when its payments are unknown', () => {
    summary.data = undefined
    renderWithProviders(<ClubList />)

    expect(screen.queryByText(/cuota/i)).not.toBeInTheDocument()
    expect(within(rowOf('Club Cerrado')).queryByText(/cuota/i)).not.toBeInTheDocument()
  })

  it('opens the edit dialog from the row and offers Eliminar inside it', async () => {
    renderWithProviders(<ClubList />)
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Editar Club Ejemplo' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Eliminar club' }))

    const confirm = await screen.findByRole('alertdialog')
    expect(confirm).toHaveTextContent('Club Ejemplo')
    await userEvent.click(within(confirm).getByRole('button', { name: 'Eliminar' }))
    expect(deleteClub).toHaveBeenCalledWith('c1')
  })

  it('shows the address once and skips empty parts', () => {
    renderWithProviders(<ClubList />)
    expect(screen.getByText('Calle Mayor 1 · 28001 Madrid')).toBeInTheDocument()
    expect(screen.queryByText(',')).not.toBeInTheDocument()
  })

  it('gives every club an avatar with its initials', () => {
    renderWithProviders(<ClubList />)
    expect(screen.getByRole('img', { name: 'Club Ejemplo' })).toHaveTextContent('CE')
  })

  it('uses a short search placeholder', () => {
    renderWithProviders(<ClubList />)
    expect(screen.getByPlaceholderText('Buscar club')).toBeInTheDocument()
  })
})

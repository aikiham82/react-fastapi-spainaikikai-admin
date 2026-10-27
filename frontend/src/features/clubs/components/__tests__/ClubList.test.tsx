import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { ClubList } from '../ClubList'

const { deleteClub, clubs } = vi.hoisted(() => ({
  deleteClub: vi.fn(),
  clubs: [
    { id: 'c1', name: 'Club Ejemplo', address: 'Calle Mayor 1', city: 'Madrid', province: 'Madrid', postal_code: '28001', country: 'España', phone: '', email: 'a@example.com' },
    { id: 'c2', name: 'Club Vacío', address: '', city: '', province: '', postal_code: '', country: '', phone: '', email: '', member_count: 12 },
    { id: 'c3', name: 'Club Cerrado', address: '', city: '', province: '', postal_code: '', country: '', phone: '', email: '', is_active: false },
  ],
}))

vi.mock('../../hooks/useClubContext', () => ({
  useClubContext: () => ({ clubs, isLoading: false, error: null, deleteClub, createClub: vi.fn(), updateClub: vi.fn() }),
}))

const { isSuperAdmin } = vi.hoisted(() => ({ isSuperAdmin: { value: true } }))

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => true, isAssociationAdmin: () => isSuperAdmin.value }),
}))

describe('ClubList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isSuperAdmin.value = true
  })

  it('offers a super admin to deregister an active club', () => {
    renderWithProviders(<ClubList />)

    expect(screen.getByRole('button', { name: 'Dar de baja Club Ejemplo' })).toBeInTheDocument()
  })

  it('marks a deregistered club and does not offer to deregister it again', () => {
    renderWithProviders(<ClubList />)

    expect(screen.getByText('De baja')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Dar de baja Club Cerrado' })).not.toBeInTheDocument()
  })

  it('does not offer a club admin to deregister a club', () => {
    isSuperAdmin.value = false
    renderWithProviders(<ClubList />)

    expect(screen.queryByRole('button', { name: 'Dar de baja Club Ejemplo' })).not.toBeInTheDocument()
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
    expect(screen.getByText('12 socios')).toBeInTheDocument()
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

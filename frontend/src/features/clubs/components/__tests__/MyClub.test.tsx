import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { MyClub } from '../MyClub'

const club = {
  id: 'c1', name: 'Club Ejemplo', address: 'Calle Mayor 1', city: 'Madrid', province: 'Madrid',
  postal_code: '28001', country: 'España', phone: '600000000', email: 'club@example.com',
  website: 'https://club.example.com', created_at: '', updated_at: '',
}

vi.mock('@/features/auth/hooks/useAuthContext', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAuthContext: () => ({ clubId: 'c1' }),
}))
vi.mock('../../hooks/queries/useClubQueries', () => ({
  useClubQuery: () => ({ data: club, isLoading: false, error: null }),
}))
vi.mock('../ClubForm', () => ({
  ClubForm: ({ open, club: c }: { open: boolean; club?: { name: string } }) =>
    open ? <div role="dialog">Editando {c?.name}</div> : null,
}))

describe('MyClub', () => {
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
})

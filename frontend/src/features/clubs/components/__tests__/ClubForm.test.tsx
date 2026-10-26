import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { ClubForm } from '../ClubForm'

const { createClub, updateClub } = vi.hoisted(() => ({ createClub: vi.fn(), updateClub: vi.fn() }))

vi.mock('../../hooks/useClubContext', () => ({
  useClubContext: () => ({ createClub, updateClub }),
}))

describe('ClubForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires only name and city', async () => {
    renderWithProviders(<ClubForm open onOpenChange={vi.fn()} />)
    await userEvent.type(screen.getByLabelText(/email/i), 'club@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Crear club' }))

    expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('La ciudad es obligatoria')).toBeInTheDocument()
    expect(screen.queryByText(/dirección es obligatoria/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/provincia es obligatoria/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/postal es obligatorio/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/teléfono es obligatorio/i)).not.toBeInTheDocument()
    expect(createClub).not.toHaveBeenCalled()
  })

  it('prefills the country with España', () => {
    renderWithProviders(<ClubForm open onOpenChange={vi.fn()} />)
    expect(screen.getByLabelText(/país/i)).toHaveValue('España')
  })

  it('submits with only name, city and email filled', async () => {
    renderWithProviders(<ClubForm open onOpenChange={vi.fn()} />)
    await userEvent.type(screen.getByLabelText(/nombre/i), 'Club Ejemplo')
    await userEvent.type(screen.getByLabelText(/ciudad/i), 'Madrid')
    await userEvent.type(screen.getByLabelText(/email/i), 'club@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Crear club' }))

    expect(createClub).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Club Ejemplo', city: 'Madrid', country: 'España', address: '' })
    )
  })
})

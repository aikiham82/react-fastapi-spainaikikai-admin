import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import UnauthorizedPage from '../unauthorized.page'

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ isAuthenticated: true, logout: vi.fn() }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('UnauthorizedPage', () => {
  it('sends a member who manages nothing to the card app', () => {
    renderWithProviders(<UnauthorizedPage />)

    expect(screen.getByRole('heading', { name: 'El panel es para los responsables de club' })).toBeInTheDocument()
    expect(screen.getByText('Tu carné está en la app Spain Aikikai: entra en ella con tu correo y tu contraseña.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })
})

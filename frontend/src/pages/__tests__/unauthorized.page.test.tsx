import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import UnauthorizedPage from '../unauthorized.page'

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ isAuthenticated: true, logout: vi.fn() }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe('UnauthorizedPage', () => {
  it('offers a way back to a user refused a page', () => {
    renderWithProviders(<UnauthorizedPage />)

    expect(screen.getByRole('heading', { name: 'No tienes acceso a esta página' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })
})

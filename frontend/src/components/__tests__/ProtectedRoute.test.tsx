import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { ProtectedRoute } from '../ProtectedRoute'
import { useAuthContext } from '@/features/auth/hooks/useAuthContext'

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const logout = vi.fn()
const signedInAs = (userRole: string | null, currentUser: object | null = { id: 'u1' }) =>
  vi.mocked(useAuthContext).mockReturnValue({ isAuthenticated: true, isLoading: false, userRole, logout, currentUser } as unknown as ReturnType<typeof useAuthContext>)

describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps a member who does not manage a club out of the panel and points to the app', async () => {
    signedInAs(null)
    renderWithProviders(<ProtectedRoute><p>Panel</p></ProtectedRoute>)

    expect(screen.queryByText('Panel')).not.toBeInTheDocument()
    expect(screen.getByText('El panel es para los responsables de club. Tu carné está en la app.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Salir' }))
    expect(logout).toHaveBeenCalled()
  })

  it('does not mistake a failed profile load for a member who manages nothing', () => {
    signedInAs(null, null)
    renderWithProviders(<ProtectedRoute><p>Panel</p></ProtectedRoute>)

    expect(screen.queryByText('El panel es para los responsables de club. Tu carné está en la app.')).not.toBeInTheDocument()
  })

  it.each(['club_admin', 'super_admin'])('lets a %s in', (role) => {
    signedInAs(role)
    renderWithProviders(<ProtectedRoute><p>Panel</p></ProtectedRoute>)

    expect(screen.getByText('Panel')).toBeInTheDocument()
  })
})

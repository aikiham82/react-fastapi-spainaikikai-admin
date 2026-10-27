import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor } from '@testing-library/react'
import { renderWithProviders, createMockAuthContextValue, createMockAuthResponse } from '@/test-utils'

const clerkAuth = vi.hoisted(() => ({
  isSignedIn: true,
  getToken: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('@clerk/react', () => ({
  useAuth: () => clerkAuth,
  HandleSSOCallback: () => null,
}))

const mockAuthContext = createMockAuthContextValue()
vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const socialLogin = vi.fn()
vi.mock('@/features/auth/data/auth.service', () => ({
  authService: { socialLogin: (token: string) => socialLogin(token) },
}))

const { SsoCallback } = await import('../SsoCallback')

describe('SsoCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clerkAuth.isSignedIn = true
    clerkAuth.getToken.mockResolvedValue('clerk-token')
  })

  it('exchanges the Clerk token for our session and leaves Clerk', async () => {
    const response = createMockAuthResponse()
    socialLogin.mockResolvedValue(response)

    renderWithProviders(<SsoCallback />)

    await waitFor(() => expect(clerkAuth.signOut).toHaveBeenCalledWith({ redirectUrl: '/' }))
    expect(socialLogin).toHaveBeenCalledWith('clerk-token')
    expect(mockAuthContext.startSession).toHaveBeenCalledWith(response)
  })

  it('sends a refused account back to the login with the error', async () => {
    socialLogin.mockRejectedValue(Object.assign(new Error('401'), { status: 401 }))

    renderWithProviders(<SsoCallback />)

    await waitFor(() =>
      expect(clerkAuth.signOut).toHaveBeenCalledWith({ redirectUrl: '/login?google=failed' })
    )
    expect(mockAuthContext.startSession).not.toHaveBeenCalled()
  })

  it('waits until Clerk has a session', () => {
    clerkAuth.isSignedIn = false

    renderWithProviders(<SsoCallback />)

    expect(clerkAuth.getToken).not.toHaveBeenCalled()
  })
})

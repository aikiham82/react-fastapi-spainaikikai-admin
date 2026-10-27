import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'

const clerkConfig = vi.hoisted(() => ({
  clerkPublishableKey: 'pk_test_x' as string | undefined,
  SSO_CALLBACK_PATH: '/sso-callback',
  GOOGLE_FAILED_PATH: '/login?google=failed',
}))
vi.mock('@/core/config/clerk', () => clerkConfig)

const sso = vi.fn()
vi.mock('@clerk/react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSignIn: () => ({ signIn: { sso }, fetchStatus: 'idle' }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}))

const { GoogleSignIn } = await import('../GoogleSignIn')

describe('GoogleSignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clerkConfig.clerkPublishableKey = 'pk_test_x'
    sso.mockResolvedValue({ error: null })
  })

  it('offers Google when Clerk is configured', () => {
    renderWithProviders(<GoogleSignIn />)

    expect(screen.getByRole('button', { name: 'Entrar con Google' })).toBeInTheDocument()
  })

  it('offers nothing without a publishable key', () => {
    clerkConfig.clerkPublishableKey = undefined
    renderWithProviders(<GoogleSignIn />)

    expect(screen.queryByRole('button', { name: 'Entrar con Google' })).not.toBeInTheDocument()
  })

  it('starts the Google flow back to the SSO callback', async () => {
    renderWithProviders(<GoogleSignIn />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Entrar con Google' }))

    expect(sso).toHaveBeenCalledWith({
      strategy: 'oauth_google',
      redirectUrl: '/sso-callback',
      redirectCallbackUrl: '/sso-callback',
    })
  })

  it('reports a flow that cannot start', async () => {
    sso.mockResolvedValue({ error: new Error('boom') })
    renderWithProviders(<GoogleSignIn />)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Entrar con Google' }))

    expect(mockNavigate).toHaveBeenCalledWith('/login?google=failed', { replace: true })
  })
})

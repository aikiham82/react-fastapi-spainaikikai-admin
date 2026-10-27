import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { SettingsPage } from '../settings.page'

const { requestReset } = vi.hoisted(() => ({ requestReset: vi.fn() }))

vi.mock('@/features/auth/hooks/useAuthContext', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAuthContext: () => ({
    currentUser: { email: 'director@example.com' },
    userEmail: 'director@example.com',
    userRole: 'club_admin',
  }),
}))

vi.mock('@/features/password-reset/hooks/mutations/useRequestPasswordReset.mutation', () => ({
  useRequestPasswordResetMutation: () => ({
    requestResetAsync: requestReset,
    isLoading: false,
  }),
}))

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requestReset.mockResolvedValue({ success: true, message: 'ok' })
  })

  it('sends a password link from Cambiar contraseña', async () => {
    renderWithProviders(<SettingsPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Enviarme un enlace para cambiarla' }))

    expect(requestReset).toHaveBeenCalledWith({ identifier: 'director@example.com' })
    expect(await screen.findByText('Te hemos enviado un enlace a director@example.com.')).toBeInTheDocument()
  })

  it('does not render notification or theme switches', () => {
    renderWithProviders(<SettingsPage />)
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.queryByText(/modo oscuro|notificaciones|última sesión/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cambiar mi correo' })).toBeInTheDocument()
    expect(screen.getByText('Responsable de club')).toBeInTheDocument()
  })
})

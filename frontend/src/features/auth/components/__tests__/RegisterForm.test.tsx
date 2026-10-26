import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent, createMockAuthContextValue } from '@/test-utils'
import { RegisterForm } from '../RegisterForm'

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: () => createMockAuthContextValue(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

const registerMutation = vi.fn()
vi.mock('../../hooks/mutations/useRegister.mutation', () => ({
  useRegisterMutation: () => ({ registerMutation, isPending: false }),
}))

describe('RegisterForm', () => {
  it('renders Spanish labels', () => {
    renderWithProviders(<RegisterForm />, { withRouter: true })

    expect(screen.getByLabelText('Nombre de usuario')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electrónico')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ya tengo cuenta' })).toHaveAttribute('href', '/login')
  })

  it('asks for at least 8 characters in the password', async () => {
    renderWithProviders(<RegisterForm />, { withRouter: true })

    await userEvent.type(screen.getByLabelText('Nombre de usuario'), 'lucia')
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'lucia@example.com')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'corta')
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeInTheDocument()
    expect(registerMutation).not.toHaveBeenCalled()
  })
})

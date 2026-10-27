import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ResetPasswordForm } from '../ResetPasswordForm'
import { useValidateTokenQuery } from '../../hooks/queries/useValidateToken.query'
import { useResetPasswordMutation } from '../../hooks/mutations/useResetPassword.mutation'

vi.mock('../../hooks/queries/useValidateToken.query', () => ({ useValidateTokenQuery: vi.fn() }))
vi.mock('../../hooks/mutations/useResetPassword.mutation', () => ({ useResetPasswordMutation: vi.fn() }))

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <ResetPasswordForm />
    </MemoryRouter>
  )

const tokenState = (state: Partial<ReturnType<typeof useValidateTokenQuery>>) =>
  vi.mocked(useValidateTokenQuery).mockReturnValue(state as ReturnType<typeof useValidateTokenQuery>)

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    vi.mocked(useResetPasswordMutation).mockReturnValue({
      resetPasswordAsync: vi.fn(),
      isLoading: false,
      isSuccess: false,
      error: null,
    } as unknown as ReturnType<typeof useResetPasswordMutation>)
  })

  it('hides the new password heading when the token is invalid', () => {
    tokenState({ isLoading: false, isError: true })
    renderAt('/reset-password?token=x')

    expect(screen.getByRole('heading', { name: 'Este enlace ya no sirve' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /nueva contraseña/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pedir un enlace nuevo' })).toHaveAttribute('href', '/forgot-password')
  })

  it('always shows the password rule and labels both eye buttons', () => {
    tokenState({ isLoading: false, isError: false, data: { valid: true, email: 'lucia@example.com' } } as never)
    renderAt('/reset-password?token=valid')

    expect(screen.getByText('Mínimo 8 caracteres.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Mostrar contraseña' })).toHaveLength(2)
  })

  it('offers a button to sign in after the password changes instead of redirecting', () => {
    tokenState({ isLoading: false, isError: false, data: { valid: true, email: 'lucia@example.com' } } as never)
    vi.mocked(useResetPasswordMutation).mockReturnValue({
      resetPasswordAsync: vi.fn(),
      isLoading: false,
      isSuccess: true,
      error: null,
    } as unknown as ReturnType<typeof useResetPasswordMutation>)
    renderAt('/reset-password?token=valid')

    expect(screen.getByRole('heading', { name: 'Contraseña cambiada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  })
})

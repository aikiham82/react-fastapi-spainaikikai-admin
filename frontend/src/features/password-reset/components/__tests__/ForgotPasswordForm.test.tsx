import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { ForgotPasswordForm } from '../ForgotPasswordForm'
import { useRequestPasswordResetMutation } from '../../hooks/mutations/useRequestPasswordReset.mutation'

vi.mock('../../hooks/mutations/useRequestPasswordReset.mutation', () => ({
  useRequestPasswordResetMutation: vi.fn(),
}))

const mockRequestReset = vi.fn()

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequestReset.mockResolvedValue({ success: true, message: 'ok' })
    vi.mocked(useRequestPasswordResetMutation).mockReturnValue({
      requestResetAsync: mockRequestReset,
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useRequestPasswordResetMutation>)
  })

  it('accepts a user name, not only an email', async () => {
    renderWithProviders(<ForgotPasswordForm />)

    const input = screen.getByLabelText('Correo o nombre de usuario')
    expect(input).toHaveAttribute('type', 'text')

    await userEvent.type(input, 'KUKI AIKIKAI')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    await waitFor(() => {
      expect(mockRequestReset).toHaveBeenCalledWith({ identifier: 'KUKI AIKIKAI' })
    })
  })

  it('still accepts an email', async () => {
    renderWithProviders(<ForgotPasswordForm />)

    await userEvent.type(screen.getByLabelText('Correo o nombre de usuario'), 'club@example.com')
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }))

    await waitFor(() => {
      expect(mockRequestReset).toHaveBeenCalledWith({ identifier: 'club@example.com' })
    })
  })

  it('tells the user the link goes to the address the account signs in with', () => {
    vi.mocked(useRequestPasswordResetMutation).mockReturnValue({
      requestResetAsync: mockRequestReset,
      isSuccess: true,
      data: { success: true, message: 'ok' },
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useRequestPasswordResetMutation>)

    renderWithProviders(<ForgotPasswordForm />)

    expect(screen.getByText(/el correo con el que/i)).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { GrantMemberAccessForm } from '../GrantMemberAccessForm'
import { useGrantMemberAccessMutation } from '../../hooks/mutations/useGrantMemberAccessMutation'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}))

vi.mock('../../hooks/mutations/useGrantMemberAccessMutation', () => ({
  useGrantMemberAccessMutation: vi.fn(),
}))

const mockGrant = vi.fn()

const mockMutation = (overrides: Record<string, unknown> = {}) => {
  vi.mocked(useGrantMemberAccessMutation).mockReturnValue({
    mutate: mockGrant,
    isPending: false,
    data: undefined,
    ...overrides,
  } as unknown as ReturnType<typeof useGrantMemberAccessMutation>)
}

describe('GrantMemberAccessForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMutation()
  })

  it('starts with the member email filled in', () => {
    renderWithProviders(<GrantMemberAccessForm memberId="m1" memberEmail="ana@example.com" />)

    expect(screen.getByLabelText('Correo con el que entrará')).toHaveValue('ana@example.com')
  })

  it('gives access with the typed email and the manager choice', async () => {
    const user = userEvent.setup()
    renderWithProviders(<GrantMemberAccessForm memberId="m1" />)

    await user.type(screen.getByLabelText('Correo con el que entrará'), 'ana@example.com')
    await user.click(screen.getByLabelText('Puede gestionar el club (pagos, altas y consultas)'))
    await user.click(screen.getByRole('button', { name: 'Dar acceso a la web' }))

    expect(mockGrant).toHaveBeenCalledWith({ memberId: 'm1', email: 'ana@example.com', clubAdmin: true })
  })

  it('does not send an empty email', async () => {
    const user = userEvent.setup()
    renderWithProviders(<GrantMemberAccessForm memberId="m1" />)

    await user.click(screen.getByRole('button', { name: 'Dar acceso a la web' }))

    expect(mockGrant).not.toHaveBeenCalled()
  })

  it('tells where the email went and offers the link once access is given', () => {
    mockMutation({
      data: { url: 'https://admin.example.com/reset-password?token=abc', email: 'ana@example.com', expires_at: '2026-10-26T20:00:00' },
    })
    renderWithProviders(<GrantMemberAccessForm memberId="m1" />)

    expect(screen.getByText('Le hemos enviado un correo a ana@example.com para que ponga su contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar enlace' })).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { renderWithProviders, userEvent } from '@/test-utils'
import { MemberAccessAccount } from '../MemberAccessAccount'
import { usePermissions } from '@/core/hooks/usePermissions'
import { useUserByMemberQuery } from '../../hooks/queries/useUserByMemberQuery'
import { useGeneratePasswordResetLinkMutation } from '../../hooks/mutations/useGeneratePasswordResetLinkMutation'
import { useUpdateUserEmailMutation } from '../../hooks/mutations/useUpdateUserEmailMutation'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({ isAssociationAdmin: () => true })),
}))

vi.mock('../../hooks/queries/useUserByMemberQuery', () => ({
  useUserByMemberQuery: vi.fn(),
}))

vi.mock('../../hooks/mutations/useGeneratePasswordResetLinkMutation', () => ({
  useGeneratePasswordResetLinkMutation: vi.fn(),
}))

vi.mock('../../hooks/mutations/useUpdateUserEmailMutation', () => ({
  useUpdateUserEmailMutation: vi.fn(),
}))

const account = {
  id: 'user123',
  email: 'jcarlosarevalo2@gmail.com',
  username: 'KUKI AIKIKAI',
  is_active: true,
  global_role: 'user',
  member_id: 'member123',
}

const mockMutate = vi.fn()
const mockUpdateEmail = vi.fn()

const mockQuery = (overrides: Record<string, unknown> = {}) => {
  vi.mocked(useUserByMemberQuery).mockReturnValue({
    data: account,
    isLoading: false,
    isError: false,
    ...overrides,
  } as ReturnType<typeof useUserByMemberQuery>)
}

const mockMutation = (overrides: Record<string, unknown> = {}) => {
  vi.mocked(useGeneratePasswordResetLinkMutation).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
    data: undefined,
    ...overrides,
  } as unknown as ReturnType<typeof useGeneratePasswordResetLinkMutation>)
}

describe('MemberAccessAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(usePermissions).mockReturnValue({
      isAssociationAdmin: () => true,
    } as ReturnType<typeof usePermissions>)
    mockQuery()
    mockMutation()
    vi.mocked(useUpdateUserEmailMutation).mockReturnValue({
      mutate: mockUpdateEmail,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateUserEmailMutation>)
  })

  it('shows the login email of the account', () => {
    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    expect(screen.getByText('Cuenta de acceso')).toBeInTheDocument()
    expect(screen.getByText('jcarlosarevalo2@gmail.com')).toBeInTheDocument()
  })

  it('renders nothing for a club admin', () => {
    vi.mocked(usePermissions).mockReturnValue({
      isAssociationAdmin: () => false,
    } as ReturnType<typeof usePermissions>)

    const { container } = renderWithProviders(<MemberAccessAccount memberId="member123" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('tells the admin when the member has no account', () => {
    mockQuery({ data: undefined, isError: true, error: { status: 404 } })

    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    expect(screen.getByText('Este socio no tiene cuenta de acceso')).toBeInTheDocument()
  })

  it('does not claim the member has no account when the lookup fails', () => {
    mockQuery({ data: undefined, isError: true, error: { status: 500 } })

    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    expect(screen.getByText('No se pudo consultar la cuenta de acceso')).toBeInTheDocument()
    expect(screen.queryByText('Este socio no tiene cuenta de acceso')).not.toBeInTheDocument()
  })

  it('generates the link for the account', async () => {
    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    await userEvent.click(screen.getByRole('button', { name: 'Generar enlace para cambiar la contraseña' }))

    expect(mockMutate).toHaveBeenCalledWith('user123')
  })

  it('corrects the login email', async () => {
    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    await userEvent.click(screen.getByRole('button', { name: 'Corregir correo de acceso' }))

    const input = screen.getByLabelText('Correo de acceso')
    await userEvent.clear(input)
    await userEvent.type(input, 'leon.aikikai@gmail.com')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar correo' }))

    expect(mockUpdateEmail).toHaveBeenCalledWith(
      { userId: 'user123', email: 'leon.aikikai@gmail.com' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('saves the email when Enter is pressed instead of submitting the member form', async () => {
    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    await userEvent.click(screen.getByRole('button', { name: 'Corregir correo de acceso' }))
    const input = screen.getByLabelText('Correo de acceso')
    await userEvent.clear(input)
    await userEvent.type(input, 'leon.aikikai@gmail.com{Enter}')

    expect(mockUpdateEmail).toHaveBeenCalledWith(
      { userId: 'user123', email: 'leon.aikikai@gmail.com' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('keeps the typed email on screen while the save is in flight', async () => {
    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    await userEvent.click(screen.getByRole('button', { name: 'Corregir correo de acceso' }))
    await userEvent.clear(screen.getByLabelText('Correo de acceso'))
    await userEvent.type(screen.getByLabelText('Correo de acceso'), 'leon.aikikai@gmail.com')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar correo' }))

    expect(screen.getByLabelText('Correo de acceso')).toHaveValue('leon.aikikai@gmail.com')
  })

  it('warns that regenerating kills the previous link', () => {
    mockMutation({
      data: {
        url: 'https://admin.spainaikikai.es/reset-password?token=abc123',
        email: 'jcarlosarevalo2@gmail.com',
        expires_at: '2026-09-21T12:00:00',
      },
    })

    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    expect(screen.getByRole('button', { name: 'Generar un enlace nuevo' })).toBeInTheDocument()
    expect(screen.getByText('Al generar uno nuevo, el anterior deja de funcionar.')).toBeInTheDocument()
  })

  it('does not save an empty email', async () => {
    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    await userEvent.click(screen.getByRole('button', { name: 'Corregir correo de acceso' }))
    await userEvent.clear(screen.getByLabelText('Correo de acceso'))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar correo' }))

    expect(mockUpdateEmail).not.toHaveBeenCalled()
  })

  it('copies the generated link to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    mockMutation({
      data: {
        url: 'https://admin.spainaikikai.es/reset-password?token=abc123',
        email: 'jcarlosarevalo2@gmail.com',
        expires_at: '2026-09-21T12:00:00',
      },
    })

    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    await userEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://admin.spainaikikai.es/reset-password?token=abc123')
      expect(toast.success).toHaveBeenCalledWith('Enlace copiado al portapapeles')
    })
  })
})

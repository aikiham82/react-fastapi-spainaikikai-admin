import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { renderWithProviders, userEvent } from '@/test-utils'
import { MemberAccessAccount } from '../MemberAccessAccount'
import { usePermissions } from '@/core/hooks/usePermissions'
import { useUserByMemberQuery } from '../../hooks/queries/useUserByMemberQuery'
import { useGeneratePasswordResetLinkMutation } from '../../hooks/mutations/useGeneratePasswordResetLinkMutation'
import { useUpdateUserEmailMutation } from '../../hooks/mutations/useUpdateUserEmailMutation'
import { useAuthContext } from '@/features/auth/hooks/useAuthContext'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}))

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({ isAssociationAdmin: () => true })),
}))

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: vi.fn(() => ({ userEmail: 'admin@example.com' })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/features/clubs/hooks/queries/useClubQueries', () => ({
  useClubAccountsQuery: vi.fn((enabled: boolean) => ({ data: enabled ? [{ club_id: 'club1', account_id: 'a1', email: 'dojo@example.com' }] : undefined })),
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
const mockReset = vi.fn()
const mockUpdateEmail = vi.fn()

const linkResponse = {
  url: 'https://admin.spainaikikai.es/reset-password?token=abc123',
  email: 'jcarlosarevalo2@gmail.com',
  expires_at: '2026-09-21T12:00:00',
}

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
    reset: mockReset,
    ...overrides,
  } as unknown as ReturnType<typeof useGeneratePasswordResetLinkMutation>)
}

describe('MemberAccessAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthContext).mockReturnValue({ userEmail: 'admin@example.com' } as ReturnType<typeof useAuthContext>)
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

    expect(screen.getByText('Acceso a la web')).toBeInTheDocument()
    expect(screen.getByText('jcarlosarevalo2@gmail.com')).toBeInTheDocument()
  })

  it('shows the account to a club admin too', () => {
    vi.mocked(usePermissions).mockReturnValue({
      isAssociationAdmin: () => false,
      isClubAdmin: () => true,
    } as ReturnType<typeof usePermissions>)

    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    expect(screen.getByText('jcarlosarevalo2@gmail.com')).toBeInTheDocument()
    expect(useUserByMemberQuery).toHaveBeenCalledWith('member123', true)
  })

  it('renders nothing for someone who does not manage the club', () => {
    vi.mocked(usePermissions).mockReturnValue({
      isAssociationAdmin: () => false,
      isClubAdmin: () => false,
    } as ReturnType<typeof usePermissions>)

    const { container } = renderWithProviders(<MemberAccessAccount memberId="member123" />)

    expect(container).toBeEmptyDOMElement()
  })

  it('offers to give access when the member has no account', () => {
    mockQuery({ data: undefined, isError: true, error: { status: 404 } })

    renderWithProviders(<MemberAccessAccount memberId="member123" memberEmail="ana@example.com" />)

    expect(screen.getByText('Este socio todavía no puede entrar en la web.')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo con el que entrará')).toHaveValue('ana@example.com')
  })

  it('offers a super admin to pass the club account to a member with no account', () => {
    mockQuery({ data: undefined, isError: true, error: { status: 404 } })

    renderWithProviders(<MemberAccessAccount memberId="member123" memberClubId="club1" memberName="Ana Ejemplo" />)

    expect(screen.getByRole('button', { name: 'Pasar la cuenta del club a esta persona' })).toBeInTheDocument()
  })

  it('does not offer to pass a club account the club no longer has', () => {
    mockQuery({ data: undefined, isError: true, error: { status: 404 } })

    renderWithProviders(<MemberAccessAccount memberId="member123" memberClubId="club2" memberName="Ana Ejemplo" />)

    expect(screen.queryByRole('button', { name: 'Pasar la cuenta del club a esta persona' })).not.toBeInTheDocument()
  })

  it('does not offer a club admin to pass the club account', () => {
    vi.mocked(usePermissions).mockReturnValue({
      isAssociationAdmin: () => false,
      isClubAdmin: () => true,
    } as ReturnType<typeof usePermissions>)
    mockQuery({ data: undefined, isError: true, error: { status: 404 } })

    renderWithProviders(<MemberAccessAccount memberId="member123" memberClubId="club1" memberName="Ana Ejemplo" />)

    expect(screen.queryByRole('button', { name: 'Pasar la cuenta del club a esta persona' })).not.toBeInTheDocument()
  })

  it('lets the admin change who manages the club and remove the access', () => {
    renderWithProviders(<MemberAccessAccount memberId="member123" memberName="Ana Ejemplo" memberClubRole="admin" />)

    expect(screen.getByRole('switch', { name: 'Puede gestionar el club (pagos, altas y consultas)' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Quitar acceso' })).toBeInTheDocument()
  })

  it('does not offer to change your own role or remove your own access', () => {
    vi.mocked(useAuthContext).mockReturnValue({ userEmail: 'JCarlosArevalo2@gmail.com' } as ReturnType<typeof useAuthContext>)

    renderWithProviders(<MemberAccessAccount memberId="member123" memberClubRole="admin" />)

    expect(screen.queryByRole('button', { name: 'Quitar acceso' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('does not offer a club admin the login of another manager', () => {
    vi.mocked(usePermissions).mockReturnValue({
      isAssociationAdmin: () => false,
      isClubAdmin: () => true,
    } as ReturnType<typeof usePermissions>)

    renderWithProviders(<MemberAccessAccount memberId="member123" memberClubRole="admin" />)

    expect(screen.queryByRole('button', { name: 'Generar enlace de contraseña' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Corregir correo de acceso' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitar acceso' })).toBeInTheDocument()
  })

  it('offers to give access again when the account was switched off', () => {
    mockQuery({ data: { ...account, is_active: false } })

    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    expect(screen.getByLabelText('Correo con el que entrará')).toHaveValue('jcarlosarevalo2@gmail.com')
    expect(screen.queryByRole('button', { name: 'Quitar acceso' })).not.toBeInTheDocument()
  })

  it('does not claim the member has no account when the lookup fails', () => {
    mockQuery({ data: undefined, isError: true, error: { status: 500 } })

    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    expect(screen.getByText('No se pudo consultar la cuenta de acceso')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Dar acceso a la web' })).not.toBeInTheDocument()
  })

  it('generates the link for the account', async () => {
    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    await userEvent.click(screen.getByRole('button', { name: 'Generar enlace de contraseña' }))

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

  it('drops the displayed link when the email is corrected', async () => {
    mockMutation({ data: linkResponse })
    mockUpdateEmail.mockImplementation((_vars, options) => options?.onSuccess?.())

    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    await userEvent.click(screen.getByRole('button', { name: 'Corregir correo de acceso' }))
    await userEvent.clear(screen.getByLabelText('Correo de acceso'))
    await userEvent.type(screen.getByLabelText('Correo de acceso'), 'leon.aikikai@gmail.com')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar correo' }))

    expect(mockReset).toHaveBeenCalled()
    expect(toast.info).toHaveBeenCalledWith('El enlace anterior ha dejado de funcionar')
  })

  it('reads the expiry as UTC, matching what the API stores', () => {
    mockMutation({ data: linkResponse })

    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    const expected = new Date('2026-09-21T12:00:00Z').toLocaleString('es-ES', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
    expect(screen.getByText(new RegExp(`Caduca el ${expected}`))).toBeInTheDocument()
  })

  it('warns that regenerating kills the previous link', () => {
    mockMutation({ data: linkResponse })

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
    mockMutation({ data: linkResponse })

    renderWithProviders(<MemberAccessAccount memberId="member123" />)

    await userEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://admin.spainaikikai.es/reset-password?token=abc123')
      expect(toast.success).toHaveBeenCalledWith('Enlace copiado al portapapeles')
    })
  })
})

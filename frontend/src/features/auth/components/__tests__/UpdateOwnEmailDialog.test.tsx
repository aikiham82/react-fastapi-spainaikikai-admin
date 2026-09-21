import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { UpdateOwnEmailDialog } from '../UpdateOwnEmailDialog'
import { useUpdateOwnEmailMutation } from '../../hooks/mutations/useUpdateOwnEmail.mutation'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

vi.mock('../../hooks/mutations/useUpdateOwnEmail.mutation', () => ({
  useUpdateOwnEmailMutation: vi.fn(),
}))

const mockMutate = vi.fn()

describe('UpdateOwnEmailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useUpdateOwnEmailMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateOwnEmailMutation>)
  })

  const open = () =>
    renderWithProviders(
      <UpdateOwnEmailDialog open onOpenChange={vi.fn()} currentEmail="jcarlosarevalo2@gmail.com" />
    )

  it('starts from the address the account signs in with', () => {
    open()

    expect(screen.getByLabelText('Correo de acceso')).toHaveValue('jcarlosarevalo2@gmail.com')
  })

  it('sends the new address together with the current password', async () => {
    open()

    const email = screen.getByLabelText('Correo de acceso')
    await userEvent.clear(email)
    await userEvent.type(email, 'leon.aikikai@gmail.com')
    await userEvent.type(screen.getByLabelText('Contraseña actual'), 'mipassword')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(mockMutate).toHaveBeenCalledWith(
      { email: 'leon.aikikai@gmail.com', current_password: 'mipassword' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('does not send anything without the current password', async () => {
    open()

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(mockMutate).not.toHaveBeenCalled()
  })
})

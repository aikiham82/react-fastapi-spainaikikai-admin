import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { AccountManagerControls } from '../AccountManagerControls'
import { useSetMemberClubRoleMutation } from '../../hooks/mutations/useSetMemberClubRoleMutation'
import { useRevokeMemberAccessMutation } from '../../hooks/mutations/useRevokeMemberAccessMutation'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}))

vi.mock('../../hooks/mutations/useSetMemberClubRoleMutation', () => ({
  useSetMemberClubRoleMutation: vi.fn(),
}))

vi.mock('../../hooks/mutations/useRevokeMemberAccessMutation', () => ({
  useRevokeMemberAccessMutation: vi.fn(),
}))

const mockSetRole = vi.fn()
const mockRevoke = vi.fn()

describe('AccountManagerControls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useSetMemberClubRoleMutation).mockReturnValue({
      mutate: mockSetRole,
      isPending: false,
    } as unknown as ReturnType<typeof useSetMemberClubRoleMutation>)
    vi.mocked(useRevokeMemberAccessMutation).mockReturnValue({
      mutate: mockRevoke,
      isPending: false,
    } as unknown as ReturnType<typeof useRevokeMemberAccessMutation>)
  })

  it('shows whether the member manages the club', () => {
    renderWithProviders(<AccountManagerControls memberId="m1" memberName="Ana Ejemplo" clubRole="admin" />)

    expect(screen.getByRole('switch', { name: 'Puede gestionar el club (pagos, altas y consultas)' })).toBeChecked()
  })

  it('makes the member a manager from the switch', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AccountManagerControls memberId="m1" memberName="Ana Ejemplo" clubRole="member" />)

    await user.click(screen.getByRole('switch', { name: 'Puede gestionar el club (pagos, altas y consultas)' }))

    expect(mockSetRole).toHaveBeenCalledWith({ memberId: 'm1', clubRole: 'admin' }, expect.anything())
  })

  it('asks before removing the access', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AccountManagerControls memberId="m1" memberName="Ana Ejemplo" clubRole="member" />)

    await user.click(screen.getByRole('button', { name: 'Quitar acceso' }))

    expect(screen.getByText('¿Quitar el acceso a Ana Ejemplo? No podrá entrar en la web.')).toBeInTheDocument()
    expect(mockRevoke).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Sí, quitar acceso' }))

    expect(mockRevoke).toHaveBeenCalledWith('m1')
  })
})

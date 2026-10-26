import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { TransferClubAccountButton } from '../TransferClubAccountButton'
import { useTransferClubAccountMutation } from '../../hooks/mutations/useTransferClubAccountMutation'

vi.mock('../../hooks/mutations/useTransferClubAccountMutation', () => ({
  useTransferClubAccountMutation: vi.fn(),
}))

const mockTransfer = vi.fn()

describe('TransferClubAccountButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useTransferClubAccountMutation).mockReturnValue({
      mutate: mockTransfer,
      isPending: false,
    } as unknown as ReturnType<typeof useTransferClubAccountMutation>)
  })

  it('asks before passing the club account', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TransferClubAccountButton clubId="c1" accountId="a1" memberId="m1" memberName="Ana Ejemplo" />)

    await user.click(screen.getByRole('button', { name: 'Pasar la cuenta del club a esta persona' }))

    expect(
      screen.getByText(
        'La cuenta del club pasará a ser de Ana Ejemplo. Seguirá entrando con el mismo correo y contraseña y será administrador del club.'
      )
    ).toBeInTheDocument()
    expect(mockTransfer).not.toHaveBeenCalled()
  })

  it('passes the club account once confirmed', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TransferClubAccountButton clubId="c1" accountId="a1" memberId="m1" memberName="Ana Ejemplo" />)

    await user.click(screen.getByRole('button', { name: 'Pasar la cuenta del club a esta persona' }))
    await user.click(screen.getByRole('button', { name: 'Sí, pasar la cuenta' }))

    expect(mockTransfer).toHaveBeenCalledWith({ clubId: 'c1', accountId: 'a1', memberId: 'm1', memberName: 'Ana Ejemplo' })
  })

  it('names the person on the button when asked to', () => {
    renderWithProviders(
      <TransferClubAccountButton clubId="c1" accountId="a1" memberId="m1" memberName="Ana Ejemplo" label="Pasar la cuenta a Ana Ejemplo" />
    )

    expect(screen.getByRole('button', { name: 'Pasar la cuenta a Ana Ejemplo' })).toBeInTheDocument()
  })
})

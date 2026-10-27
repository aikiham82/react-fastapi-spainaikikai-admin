import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { DeregisterClubButton } from '../DeregisterClubButton'
import { useDeregisterClubMutation } from '../../hooks/mutations/useClubMutations'

vi.mock('../../hooks/mutations/useClubMutations', () => ({
  useDeregisterClubMutation: vi.fn(),
}))

const mockDeregister = vi.fn()

describe('DeregisterClubButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useDeregisterClubMutation).mockReturnValue({
      mutate: mockDeregister,
      isPending: false,
    } as unknown as ReturnType<typeof useDeregisterClubMutation>)
  })

  it('asks before deregistering the club', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DeregisterClubButton clubId="c1" clubName="Dojo Ejemplo" />)

    await user.click(screen.getByRole('button', { name: 'Dar de baja el club' }))

    expect(
      screen.getByText('Dojo Ejemplo y todos sus socios pasarán a baja y nadie del club podrá entrar en la web ni en la app.')
    ).toBeInTheDocument()
    expect(mockDeregister).not.toHaveBeenCalled()
  })

  it('deregisters the club once confirmed', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DeregisterClubButton clubId="c1" clubName="Dojo Ejemplo" />)

    await user.click(screen.getByRole('button', { name: 'Dar de baja el club' }))
    await user.click(screen.getByRole('button', { name: 'Sí, dar de baja' }))

    expect(mockDeregister).toHaveBeenCalledWith('c1')
  })

  it('cannot be pressed again while the club is being deregistered', () => {
    vi.mocked(useDeregisterClubMutation).mockReturnValue({
      mutate: mockDeregister,
      isPending: true,
    } as unknown as ReturnType<typeof useDeregisterClubMutation>)
    renderWithProviders(<DeregisterClubButton clubId="c1" clubName="Dojo Ejemplo" />)

    expect(screen.getByRole('button', { name: 'Dar de baja el club' })).toBeDisabled()
  })
})

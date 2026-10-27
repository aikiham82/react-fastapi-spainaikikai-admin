import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { PriceConfigurationList } from '../PriceConfigurationList'

const { updatePriceConfiguration, permissions } = vi.hoisted(() => ({
  updatePriceConfiguration: vi.fn(),
  permissions: { canUpdate: true },
}))

vi.mock('../../hooks/usePriceConfigurationContext', () => ({
  usePriceConfigurationContext: () => ({
    priceConfigurations: [
      { id: 'p1', key: 'licencia_dan', category: 'licencia', price: 25, is_active: true },
      { id: 'p2', key: 'seguro_rc', category: 'seguro', price: 12, is_active: false },
    ],
    isLoading: false,
    error: null,
    updatePriceConfiguration,
    deletePriceConfiguration: vi.fn(),
    isDeleting: false,
  }),
}))

vi.mock('@/core/hooks/usePermissions', () => ({
  usePermissions: () => ({
    canAccess: ({ action }: { action: string }) => action !== 'update' || permissions.canUpdate,
  }),
}))

describe('PriceConfigurationList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissions.canUpdate = true
  })

  it('switches a price off from its row in one tap', async () => {
    renderWithProviders(<PriceConfigurationList />)

    const toggle = screen.getAllByRole('switch')[0]
    expect(toggle).toBeChecked()
    await userEvent.click(toggle)

    expect(updatePriceConfiguration).toHaveBeenCalledWith('p1', { is_active: false })
  })

  it('always says whether each price is active in words', () => {
    renderWithProviders(<PriceConfigurationList />)

    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getByText('Inactivo')).toBeInTheDocument()
  })

  it('shows the state without a switch to whoever cannot change prices', () => {
    permissions.canUpdate = false
    renderWithProviders(<PriceConfigurationList />)

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { SolicitudOficialidadModal } from '../SolicitudOficialidadModal'

const api = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/core/data/apiClient', () => ({ apiClient: { get: api.get } }))
vi.mock('../../hooks/mutations/useInitiateSeminarOficialidad.mutation', () => ({
  useInitiateSeminarOfficialidadMutation: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false }),
}))

const onOpenChange = vi.fn()
const renderModal = () =>
  renderWithProviders(
    <SolicitudOficialidadModal open onOpenChange={onOpenChange} seminarId="s-1" seminarTitle="Seminario de ejemplo" />
  )

describe('SolicitudOficialidadModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a retry action when the price fails to load', async () => {
    api.get.mockRejectedValueOnce(new Error('404'))
    api.get.mockResolvedValueOnce({ key: 'seminar-price', price: 25 })
    renderModal()

    expect(await screen.findByText('No se pudo cargar el precio.')).toBeInTheDocument()
    expect(screen.queryByText(/Cargando precio/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar pago' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar pago' })).toBeEnabled())
    expect(screen.queryByText('No se pudo cargar el precio.')).not.toBeInTheDocument()
  })

  it('offers to close and says what to do when the price cannot be loaded', async () => {
    api.get.mockRejectedValue(new Error('500'))
    renderModal()

    expect(await screen.findByText('No se pudo cargar el precio.')).toBeInTheDocument()
    expect(screen.getByText('Inténtalo más tarde o escribe a la Federación.')).toBeInTheDocument()

    const alert = screen.getByRole('alert')
    await userEvent.click(within(alert).getByRole('button', { name: 'Cerrar' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { PriceConfigurationForm } from '../PriceConfigurationForm'
import type { PriceConfiguration } from '../../data/schemas/price-configuration.schema'

const createPriceConfiguration = vi.fn()
const updatePriceConfiguration = vi.fn()

const existing: PriceConfiguration = {
  id: 'p-1',
  key: 'seguro_rc',
  price: 10,
  description: '',
  category: 'insurance',
  is_active: true,
  valid_from: null,
  valid_until: null,
  created_at: '2026-01-01T00:00:00',
  updated_at: '2026-01-01T00:00:00',
}

vi.mock('../../hooks/usePriceConfigurationContext', () => ({
  usePriceConfigurationContext: () => ({
    priceConfigurations: [existing],
    createPriceConfiguration,
    updatePriceConfiguration,
    isCreating: false,
    isUpdating: false,
  }),
}))

describe('PriceConfigurationForm', () => {
  beforeEach(() => {
    createPriceConfiguration.mockClear()
  })

  it('offers a fixed list of concepts', async () => {
    renderWithProviders(<PriceConfigurationForm open onOpenChange={vi.fn()} />)

    expect(screen.queryByRole('textbox', { name: /clave/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox', { name: 'Concepto' }))

    const options = within(screen.getByRole('listbox')).getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual([
      'Cuota de club',
      'Licencia Kyu adulto',
      'Licencia Kyu infantil',
      'Licencia Dan',
      'Licencia Fukushidoin',
      'Licencia Shidoin',
      'Seguro de accidentes',
      'Seguro de responsabilidad civil (ya tiene precio)',
    ])
    expect(options[7]).toHaveAttribute('aria-disabled', 'true')
    expect(options[0]).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('creates the price with the key of the chosen concept', async () => {
    renderWithProviders(<PriceConfigurationForm open onOpenChange={vi.fn()} />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Concepto' }))
    await userEvent.click(screen.getByRole('option', { name: 'Licencia Dan' }))
    await userEvent.clear(screen.getByLabelText('Precio (€)'))
    await userEvent.type(screen.getByLabelText('Precio (€)'), '45')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(createPriceConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'dan-none-adulto', category: 'license', price: 45, is_active: true }),
    )
  })
})

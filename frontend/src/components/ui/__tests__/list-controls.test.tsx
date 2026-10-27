import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CircleX } from 'lucide-react'
import userEvent from '@testing-library/user-event'
import { ListToolbar, EmptyState, ChipGroup, RowActions } from '../list-controls'

describe('ListToolbar', () => {
  it('fits every filter behind one Filtros button with the active count', async () => {
    render(
      <ListToolbar
        search={{ value: '', onChange: vi.fn(), placeholder: 'Buscar miembro' }}
        filters={<label>Estado<select aria-label="Estado" /></label>}
        activeFilters={2}
        onClearFilters={vi.fn()}
      />
    )

    expect(screen.getByRole('searchbox', { name: 'Buscar miembro' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Estado')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Filtros (2 activos)' }))

    expect(screen.getByLabelText('Estado')).toBeInTheDocument()
  })

  it('clears the filters from inside the popover', async () => {
    const onClearFilters = vi.fn()
    render(<ListToolbar filters={<span />} activeFilters={1} onClearFilters={onClearFilters} />)

    await userEvent.click(screen.getByRole('button', { name: 'Filtros (1 activo)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))

    expect(onClearFilters).toHaveBeenCalledOnce()
  })
})

describe('EmptyState', () => {
  it('offers Quitar filtros when a filter hides every row', async () => {
    const onClear = vi.fn()
    render(<EmptyState title="Ningún miembro con estos filtros" onClear={onClear} />)

    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))

    expect(onClear).toHaveBeenCalledOnce()
  })
})

describe('ChipGroup', () => {
  it('marks the selected chip and reports a new choice', async () => {
    const onChange = vi.fn()
    render(
      <ChipGroup
        label="Estado de la licencia"
        value="all"
        onChange={onChange}
        options={[
          { value: 'all', label: 'Todas' },
          { value: 'expired', label: 'Caducadas', count: 3 },
        ]}
      />
    )

    expect(screen.getByRole('radio', { name: 'Todas' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'Caducadas 3' }))

    expect(onChange).toHaveBeenCalledWith('expired')
  })
})

describe('ChipGroup icons', () => {
  it('draws an optional icon that stays out of the accessible name', () => {
    render(
      <ChipGroup
        label="Mostrar"
        value="all"
        onChange={vi.fn()}
        options={[
          { value: 'all', label: 'Todos', count: 4 },
          { value: 'expired', label: 'Caducadas', count: 1, icon: CircleX },
        ]}
      />
    )

    const chip = screen.getByRole('radio', { name: 'Caducadas 1' })
    expect(chip.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('radio', { name: 'Todos 4' }).querySelector('svg')).toBeNull()
  })
})

describe('RowActions', () => {
  it('names the menu after the row and runs the chosen action', async () => {
    const onEdit = vi.fn()
    render(<RowActions label="Marcos Ibarra" actions={[{ label: 'Editar', onSelect: onEdit }]} />)

    await userEvent.click(screen.getByRole('button', { name: 'Acciones de Marcos Ibarra' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Editar' }))

    expect(onEdit).toHaveBeenCalledOnce()
  })
})

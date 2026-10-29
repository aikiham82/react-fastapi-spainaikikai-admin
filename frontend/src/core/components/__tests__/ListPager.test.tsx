import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { ListPager } from '../ListPager'

describe('ListPager', () => {
  it('shows the count instead of a pager when every row is loaded', () => {
    renderWithProviders(<ListPager total={1199} limit={0} offset={0} noun="licencias" onPage={vi.fn()} />)

    expect(screen.getByText('1199 licencias')).toBeInTheDocument()
    expect(screen.queryByText(/Página/)).not.toBeInTheDocument()
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument()
  })

  it('says one row in the singular', () => {
    renderWithProviders(<ListPager total={1} limit={0} offset={0} noun="seguros" onPage={vi.fn()} />)

    expect(screen.getByText('1 seguro')).toBeInTheDocument()
  })

  it('pages when the rows come in pages', async () => {
    const onPage = vi.fn()
    renderWithProviders(<ListPager total={45} limit={20} offset={20} noun="miembros" onPage={onPage} />)

    expect(screen.getByText('Mostrando 21-40 de 45 miembros')).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(onPage).toHaveBeenCalledWith(40)
  })

  it('shows nothing for an empty list', () => {
    const { container } = renderWithProviders(<ListPager total={0} limit={0} offset={0} noun="seguros" onPage={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RenewLink } from '../RenewLink'

const renderOn = (today: Date, kind: 'licencia' | 'rc') => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(today)
  render(
    <MemoryRouter>
      <RenewLink memberId="m-1" memberName="Marcos Ejemplo" kind={kind} />
    </MemoryRouter>,
  )
}

describe('RenewLink', () => {
  afterEach(() => vi.useRealTimers())

  it('names the licence year it pays and sends that exact year', () => {
    renderOn(new Date(2026, 9, 27), 'licencia')

    const link = screen.getByRole('link', { name: 'Renovar 2027 Marcos Ejemplo' })
    expect(link).toHaveTextContent('Renovar 2027')
    expect(link).toHaveAttribute('href', '/payments?renovar=m-1&que=licencia&anio=2027')
  })

  it('names the insurance season it pays', () => {
    renderOn(new Date(2026, 4, 10), 'rc')

    const link = screen.getByRole('link', { name: 'Renovar 2025-26 Marcos Ejemplo' })
    expect(link).toHaveAttribute('href', '/payments?renovar=m-1&que=rc&anio=2026')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { BottomNav } from '../BottomNav'

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ userRole: 'club_admin', clubId: 'club-1' }),
}))

const renderAt = (path: string, onMore = vi.fn()) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav onMore={onMore} />
    </MemoryRouter>
  )

describe('BottomNav', () => {
  it('keeps the four daily sections and Más under the thumb', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })

    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Inicio',
      'Miembros',
      'Pagos',
      'Seminarios',
    ])
    expect(within(nav).getByRole('button', { name: 'Más' })).toBeInTheDocument()
  })

  it('marks the open section', () => {
    renderAt('/payments')
    expect(screen.getByRole('link', { name: 'Pagos' })).toHaveAttribute('aria-current', 'page')
  })

  it('opens the full menu from Más', async () => {
    const onMore = vi.fn()
    renderAt('/', onMore)

    await userEvent.click(screen.getByRole('button', { name: 'Más' }))

    expect(onMore).toHaveBeenCalledOnce()
  })
})

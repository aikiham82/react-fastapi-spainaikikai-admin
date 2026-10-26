import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Header } from '../Header'

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ userRole: 'super_admin', userEmail: 'admin@example.com' }),
}))

const renderHeader = (path: string, onMenuClick = vi.fn()) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Header onMenuClick={onMenuClick} />
    </MemoryRouter>
  )

describe('Header', () => {
  it('shows the title of the current route', () => {
    renderHeader('/licenses')

    expect(screen.getByRole('heading', { level: 1, name: 'Licencias' })).toBeInTheDocument()
  })

  it('shows the section title on nested routes', () => {
    renderHeader('/members/123')

    expect(screen.getByRole('heading', { level: 1, name: 'Miembros' })).toBeInTheDocument()
  })

  it('labels the menu button and opens the menu', async () => {
    const onMenuClick = vi.fn()
    renderHeader('/', onMenuClick)

    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))

    expect(onMenuClick).toHaveBeenCalledOnce()
  })

  it('does not show a notifications button', () => {
    renderHeader('/')

    expect(screen.queryByRole('button', { name: /notificaciones/i })).not.toBeInTheDocument()
  })
})

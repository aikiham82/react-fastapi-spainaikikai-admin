import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header } from '../Header'

vi.mock('@/features/auth/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ userRole: 'super_admin', userEmail: 'admin@example.com' }),
}))

const renderHeader = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>
  )

describe('Header', () => {
  it('shows the title of the current route', () => {
    renderHeader('/licenses')

    expect(screen.getByRole('heading', { level: 1, name: 'Licencias' })).toBeInTheDocument()
  })

  it('titles the payments page Pagos', () => {
    renderHeader('/payments?tab=historial')

    expect(screen.getByRole('heading', { level: 1, name: 'Pagos' })).toBeInTheDocument()
  })

  it('shows the section title on nested routes', () => {
    renderHeader('/members/123')

    expect(screen.getByRole('heading', { level: 1, name: 'Miembros' })).toBeInTheDocument()
  })


  it('does not show a notifications button', () => {
    renderHeader('/')

    expect(screen.queryByRole('button', { name: /notificaciones/i })).not.toBeInTheDocument()
  })
})

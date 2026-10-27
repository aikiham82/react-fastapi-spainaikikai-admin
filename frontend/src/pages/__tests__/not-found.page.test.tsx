import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { NotFoundPage } from '../not-found.page'

describe('NotFoundPage', () => {
  it('says the page does not exist and leads back to Inicio', () => {
    render(
      <MemoryRouter initialEntries={['/payments/history']}>
        <Routes>
          <Route path="/payments" element={<p>Pagos</p>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Esta página no existe')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a Inicio' })).toHaveAttribute('href', '/')
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { PaymentFailurePage } from '../payment-failure.page'
import { PaymentSuccessPage } from '../payment-success.page'

const CurrentPath = () => <p data-testid="path">{useLocation().pathname}</p>

const renderAt = (url: string, page: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/payment/:result" element={<>{page}<CurrentPath /></>} />
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>
  )

describe('payment result pages', () => {
  afterEach(() => vi.useRealTimers())

  it('PaymentFailurePage does not redirect automatically', () => {
    vi.useFakeTimers()
    renderAt('/payment/failure?Ds_Order=A1&Ds_Response=0116', <PaymentFailurePage />)

    act(() => vi.advanceTimersByTime(120_000))

    expect(screen.getByTestId('path')).toHaveTextContent('/payment/failure')
  })

  it('PaymentFailurePage explains a cancelled payment in one sentence', () => {
    renderAt('/payment/failure?Ds_Response=9915', <PaymentFailurePage />)

    expect(screen.getByText('Has cancelado el pago. No se ha cobrado nada.')).toBeInTheDocument()
  })

  it('PaymentFailurePage keeps the bank code in small print', () => {
    renderAt('/payment/failure?Ds_Response=0116', <PaymentFailurePage />)

    expect(screen.getByText('El banco ha rechazado el pago. No se ha cobrado nada.')).toBeInTheDocument()
    expect(screen.getByText(/Saldo disponible insuficiente \(código 0116\)/)).toBeInTheDocument()
  })

  it('PaymentSuccessPage does not redirect automatically', () => {
    vi.useFakeTimers()
    renderAt('/payment/success?Ds_Order=A1', <PaymentSuccessPage />)

    act(() => vi.advanceTimersByTime(120_000))

    expect(screen.getByText('Pago recibido. Te hemos enviado la factura por correo.')).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/payment/success')
  })
})

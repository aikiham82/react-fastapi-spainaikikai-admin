import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { PaymentsPage } from '../payments.page'
import { legacyPaymentRoutes } from '../legacy-payment-routes'
import type { PrefillAnnualPaymentResponse } from '@/features/annual-payments/data/schemas/annual-payment.schema'

const authContext = { userRole: 'club_admin' as 'club_admin' | 'super_admin', clubId: 'club-1' as string | null }
let prices: Partial<Record<string, number>>

vi.mock('@/features/auth/hooks/useAuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/hooks/useAuthContext')>()),
  useAuthContext: () => authContext,
}))
vi.mock('@/features/clubs/hooks/queries/useClubQueries', () => ({
  useClubsQuery: () => ({ data: [{ id: 'club-1', name: 'Dojo Ejemplo' }], isLoading: false }),
}))
vi.mock('@/features/members/hooks/queries/useMemberQueries', () => ({
  useMembersQuery: () => ({
    data: [
      {
        id: 'm-1',
        first_name: 'Kira',
        last_name: 'Ejemplo',
        birth_date: '1990-01-01',
        license_summary: { grade: '3er Kyu', technical_grade: 'kyu', instructor_category: null },
      },
    ],
    isLoading: false,
  }),
}))
vi.mock('@/features/annual-payments/hooks/queries/useAnnualPaymentPricesQuery', () => ({
  useAnnualPaymentPricesQuery: () => ({ data: prices, isLoading: false, error: null }),
}))
vi.mock('@/features/annual-payments/hooks/queries/useAnnualPaymentPrefillQuery', () => ({
  useAnnualPaymentPrefillQuery: () => ({
    data: {
      payer_name: 'Director Ejemplo',
      include_club_fee: true,
      club_fee_already_paid: false,
      member_assignments: [],
      paid_assignments: [],
      source: 'members',
    } as unknown as PrefillAnnualPaymentResponse,
    isLoading: false,
  }),
}))
vi.mock('@/features/annual-payments/hooks/mutations/useInitiateAnnualPayment.mutation', () => ({
  useInitiateAnnualPaymentMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}))
vi.mock('@/features/club-payments/components/ClubPaymentsPage', () => ({
  ClubPaymentsPage: () => <p>Historial de pagos</p>,
}))

const Where = () => {
  const location = useLocation()
  return <output data-testid="where">{location.pathname + location.search}</output>
}

const renderAt = (path: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/payments" element={<><PaymentsPage /><Where /></>} />
          {legacyPaymentRoutes}
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const fullPrices = {
  club_fee: 50,
  kyu: 30,
  kyu_infantil: 20,
  dan: 40,
  fukushidoin: 60,
  shidoin: 70,
  seguro_accidentes: 15,
  seguro_rc: 10,
}

describe('PaymentsPage', () => {
  beforeEach(() => {
    authContext.userRole = 'club_admin'
    authContext.clubId = 'club-1'
    prices = fullPrices
  })

  it('redirects /annual-payments and /club-payments to /payments', async () => {
    renderAt('/annual-payments')
    expect(await screen.findByTestId('where')).toHaveTextContent('/payments')
    expect(screen.getByTestId('where')).not.toHaveTextContent('tab=')
  })

  it('redirects /club-payments to the Historial tab', async () => {
    renderAt('/club-payments')
    expect(await screen.findByTestId('where')).toHaveTextContent('/payments?tab=historial')
    expect(screen.getByRole('tab', { name: 'Historial' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Historial de pagos')).toBeInTheDocument()
  })

  it('opens on Pendientes with the member checklist', () => {
    renderAt('/payments')

    expect(screen.getByRole('tab', { name: /^Pendientes/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('group', { name: /Kira/ })).toBeInTheDocument()
  })

  it('shows the friendly missing-price message to club admins', () => {
    prices = { club_fee: 50 }
    renderAt('/payments')

    expect(screen.getByText('El pago no está disponible todavía. Avisa a la Federación.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /Kira/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ir a precios' })).not.toBeInTheDocument()
  })

  it('tells super admins which concepts are missing and links to Precios', async () => {
    authContext.userRole = 'super_admin'
    authContext.clubId = null
    prices = { club_fee: 50 }
    renderAt('/payments')

    await userEvent.click(screen.getByLabelText('Club'))
    await userEvent.click(await screen.findByText('Dojo Ejemplo'))

    expect(screen.queryByText(/El pago no está disponible/)).not.toBeInTheDocument()
    expect(screen.getByText(/Falta el precio de: Licencia Kyu, Seguro de accidentes, Seguro de responsabilidad civil/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a precios' })).toHaveAttribute('href', '/price-configurations')
  })
})

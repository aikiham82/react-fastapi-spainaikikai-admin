import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { PaymentsPage } from '../payments.page'
import { legacyPaymentRoutes } from '../legacy-payment-routes'
import { defaultPaymentYear, seasonLabel } from '@/core/utils/defaultPaymentYear'
import type { PrefillAnnualPaymentResponse } from '@/features/annual-payments/data/schemas/annual-payment.schema'

const authContext = { userRole: 'club_admin' as 'club_admin' | 'super_admin', clubId: 'club-1' as string | null }
let prices: Partial<Record<string, number>>
const kira = {
  id: 'm-1',
  first_name: 'Kira',
  last_name: 'Ejemplo',
  club_id: 'club-1',
  birth_date: '1990-01-01',
  license_summary: { grade: '3er Kyu', technical_grade: 'kyu', instructor_category: null },
}
const rui = { ...kira, id: 'm-2', first_name: 'Rui', last_name: 'Prueba' }
const roster = vi.hoisted(() => ({ members: [] as Record<string, unknown>[], prefilled: [] as unknown[] }))

vi.mock('@/features/auth/hooks/useAuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/hooks/useAuthContext')>()),
  useAuthContext: () => authContext,
}))
vi.mock('@/features/clubs/hooks/queries/useClubQueries', () => ({
  useClubsQuery: () => ({ data: [{ id: 'club-1', name: 'Dojo Ejemplo' }], isLoading: false }),
}))
vi.mock('@/features/members/hooks/queries/useMemberQueries', () => ({
  useMembersQuery: () => ({ data: roster.members, isLoading: false }),
  useMemberQuery: (id: string) => ({ data: roster.members.find((member) => member.id === id) }),
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
      member_assignments: roster.prefilled,
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
    roster.members = [kira]
    roster.prefilled = []
  })

  it('redirects /annual-payments and /club-payments to /payments', async () => {
    renderAt('/annual-payments')
    expect(await screen.findByTestId('where')).toHaveTextContent('/payments')
    expect(screen.getByTestId('where')).not.toHaveTextContent('tab=')
  })

  it('redirects /club-payments to the Historial tab', async () => {
    renderAt('/club-payments')
    expect(await screen.findByTestId('where')).toHaveTextContent('/payments?tab=historial')
    expect(screen.getByText('Historial de pagos')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /Kira/ })).not.toBeInTheDocument()
  })

  it('opens on Pendientes with the member checklist and leaves the tabs to the header', () => {
    renderAt('/payments')

    expect(screen.getByRole('group', { name: /Kira/ })).toBeInTheDocument()
    expect(screen.queryByText('Historial de pagos')).not.toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('names the season of the licences it charges when another one is chosen', async () => {
    const previous = defaultPaymentYear(new Date()) - 1
    renderAt('/payments')

    await userEvent.click(screen.getByRole('button', { name: 'Otra temporada' }))
    await userEvent.click(screen.getByRole('combobox', { name: 'Temporada' }))
    await userEvent.click(screen.getByRole('option', { name: seasonLabel(previous) }))

    expect(screen.getByText(new RegExp(`^Temporada ${seasonLabel(previous)} · licencias del año ${previous} `))).toBeInTheDocument()
  })

  const chipOf = (member: RegExp, chip: RegExp) =>
    within(screen.getByRole('group', { name: member })).getByRole('checkbox', { name: chip })

  const prefillBoth = () => {
    roster.members = [kira, rui]
    roster.prefilled = [
      { member_id: 'm-1', member_name: 'Kira Ejemplo', payment_types: ['kyu', 'seguro_accidentes', 'seguro_rc'] },
      { member_id: 'm-2', member_name: 'Rui Prueba', payment_types: ['kyu', 'seguro_accidentes', 'seguro_rc'] },
    ]
  }

  it('renews one licence: only that licence is ticked, nobody else and not the club fee', () => {
    prefillBoth()
    renderAt('/payments?renovar=m-2&que=licencia')

    expect(chipOf(/Rui/, /licencia/i)).toHaveAttribute('aria-checked', 'true')
    expect(chipOf(/Rui/, /accidentes/i)).toHaveAttribute('aria-checked', 'false')
    expect(chipOf(/Rui/, /RC/)).toHaveAttribute('aria-checked', 'false')
    expect(chipOf(/Kira/, /licencia/i)).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('checkbox', { name: /cuota/i })).toHaveAttribute('aria-checked', 'false')
  })

  it('renews one insurance without touching the licence cycle', () => {
    prefillBoth()
    renderAt('/payments?renovar=m-2&que=rc')

    expect(chipOf(/Rui/, /RC/)).toHaveAttribute('aria-checked', 'true')
    expect(chipOf(/Rui/, /licencia/i)).toHaveAttribute('aria-checked', 'false')
    expect(chipOf(/Rui/, /accidentes/i)).toHaveAttribute('aria-checked', 'false')
  })

  it('says so when the member has nothing left to renew in this season', () => {
    prefillBoth()
    renderAt('/payments?renovar=m-9&que=licencia')

    expect(screen.getByText('Este miembro no tiene nada pendiente de renovar en esta temporada.')).toBeInTheDocument()
  })

  it('pays exactly the year the Renovar button named', () => {
    prefillBoth()
    const year = defaultPaymentYear(new Date()) - 1
    renderAt(`/payments?renovar=m-2&que=licencia&anio=${year}`)

    expect(screen.getByText(new RegExp(`^Temporada ${seasonLabel(year)} · licencias del año ${year} `))).toBeInTheDocument()
  })

  it('chooses the member club for a super admin who renews', () => {
    authContext.userRole = 'super_admin'
    authContext.clubId = null
    roster.members = [kira, rui]
    renderAt('/payments?renovar=m-2&que=licencia')

    expect(chipOf(/Rui/, /licencia/i)).toHaveAttribute('aria-checked', 'true')
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

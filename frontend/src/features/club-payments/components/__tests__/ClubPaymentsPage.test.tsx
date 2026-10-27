import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders, userEvent } from '@/test-utils'
import { ClubPaymentsPage } from '../ClubPaymentsPage'
import { ClubPaymentsProvider } from '../../hooks/useClubPaymentsContext'
import { useAllClubsPaymentSummaryQuery } from '../../hooks/queries/useClubPaymentsQueries'

vi.mock('@/features/auth/hooks/useAuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/hooks/useAuthContext')>()),
  useAuthContext: () => ({ userRole: 'super_admin', clubId: null }),
}))

vi.mock('../../hooks/queries/useClubPaymentsQueries', () => ({
  useAllClubsPaymentSummaryQuery: vi.fn(() => ({ data: undefined, isLoading: false, error: null })),
  useClubPaymentDetailQuery: vi.fn(() => ({ data: undefined, isLoading: false, error: null })),
}))

vi.mock('../AllClubsSummaryTable', () => ({ AllClubsSummaryTable: () => null }))
vi.mock('../ClubPaymentDetail', () => ({ ClubPaymentDetail: () => null }))

const renderOn = (today: string) => {
  vi.setSystemTime(new Date(today))
  return renderWithProviders(
    <ClubPaymentsProvider>
      <ClubPaymentsPage />
    </ClubPaymentsProvider>,
  )
}

const requestedYear = () => vi.mocked(useAllClubsPaymentSummaryQuery).mock.lastCall?.[0]

describe('ClubPaymentsPage year', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.mocked(useAllClubsPaymentSummaryQuery).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const openYearPicker = () => userEvent.click(screen.getByRole('button', { name: 'Otra temporada' }))

  const offeredYears = async () => {
    await openYearPicker()
    await userEvent.click(screen.getByRole('combobox'))
    return within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)
  }

  it('opens on the licences in force, named like Pendientes, and offers the season being paid from October', async () => {
    renderOn('2026-10-01T10:00:00')

    expect(screen.getByText('Temporada 2025-26 · licencias 2026')).toBeInTheDocument()
    expect(requestedYear()).toBe(2026)
    expect(await offeredYears()).toEqual(['2026-27', '2025-26', '2024-25', '2023-24', '2022-23'])
  })

  it('offers the season in force and the four before until September', async () => {
    renderOn('2026-09-30T10:00:00')

    expect(screen.getByText('Temporada 2025-26 · licencias 2026')).toBeInTheDocument()
    expect(await offeredYears()).toEqual(['2025-26', '2024-25', '2023-24', '2022-23', '2021-22'])
  })

  it('points to the season being paid from October', async () => {
    renderOn('2026-10-25T10:00:00')

    expect(screen.getByText('Ya hay pagos de la temporada 2026-27.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ver temporada 2026-27' }))

    expect(requestedYear()).toBe(2027)
    expect(screen.getByText('Temporada 2026-27 · licencias 2027')).toBeInTheDocument()
    expect(screen.queryByText(/Ya hay pagos/)).not.toBeInTheDocument()
  })

  it('does not point anywhere until October', () => {
    renderOn('2026-09-30T10:00:00')

    expect(screen.queryByText(/Ya hay pagos/)).not.toBeInTheDocument()
  })
})

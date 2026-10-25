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

  const offeredYears = async () => {
    await userEvent.click(screen.getByRole('combobox'))
    return within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)
  }

  it('opens on the calendar year and offers the next one from October', async () => {
    renderOn('2026-10-01T10:00:00')

    expect(screen.getByRole('combobox')).toHaveTextContent('2026')
    expect(requestedYear()).toBe(2026)
    expect(await offeredYears()).toEqual(['2027', '2026', '2025', '2024', '2023', '2022'])
  })

  it('offers the calendar year and the four before until September', async () => {
    renderOn('2026-09-30T10:00:00')

    expect(screen.getByRole('combobox')).toHaveTextContent('2026')
    expect(await offeredYears()).toEqual(['2026', '2025', '2024', '2023', '2022'])
  })

  it('points to next year for the insurances paid from October', async () => {
    renderOn('2026-10-25T10:00:00')

    expect(screen.getByText(/seguros de la temporada 2026-27/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ver 2027' }))

    expect(screen.getByRole('combobox')).toHaveTextContent('2027')
    expect(requestedYear()).toBe(2027)
    expect(screen.queryByText(/seguros de la temporada 2026-27/i)).not.toBeInTheDocument()
  })

  it('does not point to next year until September', () => {
    renderOn('2026-09-30T10:00:00')

    expect(screen.queryByRole('button', { name: /^Ver 20/ })).not.toBeInTheDocument()
  })
})

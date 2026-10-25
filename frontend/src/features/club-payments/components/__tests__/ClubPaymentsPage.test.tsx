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

  it('opens on the next year from October and still offers the current one', async () => {
    renderOn('2026-10-01T10:00:00')

    expect(screen.getByRole('combobox')).toHaveTextContent('2027')
    expect(requestedYear()).toBe(2027)

    await userEvent.click(screen.getByRole('combobox'))
    const options = within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['2027', '2026', '2025', '2024', '2023'])
  })

  it('opens on the calendar year until September', () => {
    renderOn('2026-09-30T10:00:00')

    expect(screen.getByRole('combobox')).toHaveTextContent('2026')
    expect(requestedYear()).toBe(2026)
  })
})

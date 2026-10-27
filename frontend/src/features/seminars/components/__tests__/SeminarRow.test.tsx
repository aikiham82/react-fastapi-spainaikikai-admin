import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test-utils'
import { SeminarRow } from '../SeminarRow'
import type { Seminar } from '../../data/schemas/seminar.schema'

const seminar = (overrides: Partial<Seminar> = {}): Seminar => ({
  id: 'seminar-1',
  title: 'Seminario de ejemplo',
  description: '',
  instructor_name: 'Instructor Example',
  venue: 'Dojo Example',
  address: '',
  city: 'Ciudad Example',
  province: '',
  start_date: '2099-11-16T00:00:00',
  end_date: '2099-11-17T00:00:00',
  current_participants: 12,
  price: 20,
  club_id: 'club-1',
  status: 'upcoming',
  created_at: '2099-01-01T00:00:00',
  updated_at: '2099-01-01T00:00:00',
  is_official: false,
  ...overrides,
})

const renderRow = (overrides: Partial<Seminar> = {}) =>
  renderWithProviders(
    <ul>
      <SeminarRow
        seminar={seminar(overrides)}
        canRequestOficialidad={false}
        isProcessing={false}
        actions={[]}
        onOpen={vi.fn()}
        onRequestOficialidad={vi.fn()}
      />
    </ul>
  )

describe('SeminarRow', () => {
  it('shows the start day and short month in the date block', () => {
    renderRow()

    const block = screen.getByTestId('seminar-date-block')
    expect(block).toHaveTextContent('16')
    expect(block).toHaveTextContent('nov')
  })

  it('shows taken seats and an occupancy bar when the seminar has a limit', () => {
    renderRow({ max_participants: 30 })

    expect(screen.getByText('12 de 30 plazas')).toBeInTheDocument()
    const bar = screen.getByRole('progressbar', { name: 'Plazas ocupadas' })
    expect(bar).toHaveAttribute('aria-valuenow', '12')
    expect(bar).toHaveAttribute('aria-valuemax', '30')
  })

  it('shows only the number of people signed up when there is no limit', () => {
    renderRow({ max_participants: undefined })

    expect(screen.getByText('12 inscritos')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('marks official seminars', () => {
    renderRow({ is_official: true })

    expect(screen.getByText('Oficial')).toBeInTheDocument()
  })

  it('shows the place and the price', () => {
    renderRow()

    expect(screen.getByText('Dojo Example, Ciudad Example')).toBeInTheDocument()
    expect(screen.getByText(/20,00/)).toBeInTheDocument()
  })
})
